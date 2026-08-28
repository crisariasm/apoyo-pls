'use client'

import { FormEvent, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { PortalField, PortalModule } from '../../../../lib/staff-portal-config'
import { serviceCoverageFromCity } from '../../../../lib/service-options'
import { getPortalFieldMaxLength, normalizePortalData, validatePortalData } from '../../../../lib/staff-portal-validation'
import { MediaField, type MediaValue } from './media-field'
import { ServiceCoveragePicker } from '../../../components/service-coverage-picker'
import { useStaffModuleRefresh } from './staff-live-refresh'

type RecordData = Record<string, unknown>
type ApiResult = { docs?: RecordData[]; doc?: RecordData; page?: number; totalPages?: number; totalDocs?: number; message?: string }

function emptyForm(module: PortalModule) {
  const now = new Date()
  const today = new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10)
  const defaults: Record<string, Record<string, unknown>> = {
    tenemos: { status: 'recibida', receivedAt: today },
    necesitamos: { priority: 'media', status: 'abierta', publishedAt: today },
    anuncios: { type: 'oficial', status: 'publicado', publishedAt: today },
    boletin: { category: 'Actualización', author: 'Equipo del centro', status: 'publicado', publishedAt: today },
    servicios: { type: 'gratuito', city: '', coverage: [], serviceMode: 'presencial', pricingType: 'gratis', whatsappCountryCode: '+57', status: 'publicado', publishedAt: today },
    inventario: { status: 'disponible' },
    distribucion: { status: 'pendiente', date: today },
    actividades: { registered: 0, status: 'abierta', date: today },
    comunicados: { category: 'informacion-comunitaria', status: 'publicado', publishedAt: today },
    evidencias: { sourceType: 'distribucion', status: 'publicado', publishedAt: today },
    administracion: { status: 'pendiente' },
  }
  return Object.fromEntries(module.fields.map((field) => {
    if (field.type === 'checkbox') return [field.name, field.name === 'publicVisible']
    if (field.type === 'upload') return [field.name, null]
    return [field.name, defaults[module.slug]?.[field.name] ?? '']
  })) as RecordData
}

function inputValue(field: PortalField, value: unknown) {
  if (field.type === 'checkbox') return Boolean(value)
  if (field.type === 'upload') return (value || null) as MediaValue
  if (field.type === 'coverage') return Array.isArray(value) ? value : []
  if (value === null || value === undefined) return ''
  if (field.type === 'date' && typeof value === 'string') return value.slice(0, 10)
  if (field.type === 'select' && value && typeof value === 'object' && 'id' in value) return String((value as { id: string }).id)
  return String(value)
}

function displayValue(value: unknown) {
  if (value === true) return 'Sí'
  if (value === false) return 'No'
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'string' && value.includes('T')) return new Date(value).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })
  if (value && typeof value === 'object') {
    const relation = value as Record<string, unknown>
    if (relation.resourceName || relation.destination) return `${String(relation.resourceName || 'Ayuda')} · ${String(relation.destination || 'Destino general')}`
    if (relation.title || relation.name) return String(relation.title || relation.name)
    if (relation.id) return `Registro ${String(relation.id).slice(0, 8)}`
    return 'Registro relacionado'
  }
  return String(value)
}

const valueLabels: Record<string, Record<string, string>> = {
  status: {
    recibida: 'Recibida', 'en-clasificacion': 'En clasificación', incorporada: 'Incorporada', 'no-apta': 'No apta',
    abierta: 'Abierta', 'en-gestion': 'En gestión', cubierta: 'Cubierta', cerrada: 'Cerrada',
    borrador: 'Borrador', publicado: 'Publicado', archivado: 'Archivado',
    disponible: 'Disponible', limitado: 'Limitado', agotado: 'Agotado',
    pendiente: 'Pendiente', 'en-ruta': 'En ruta', entregado: 'Entregado',
    'en-revision': 'En revisión', asignada: 'Asignada', atendida: 'Atendida',
  },
  priority: { critica: 'Crítica', crítica: 'Crítica', alta: 'Alta', media: 'Media' },
  serviceMode: { presencial: 'Presencial', domicilio: 'A domicilio', remoto: 'Remoto', hibrido: 'Híbrido' },
  pricingType: { gratis: 'Gratis', pagado: 'De pago', negociable: 'Tarifa negociable', intercambio: 'Intercambio o aporte', 'por-definir': 'Por definir' },
}

function displayFieldValue(field: string, value: unknown) {
  if (field === 'publicVisible') return value === false ? 'Oculto' : 'Visible'
  if (typeof value === 'string' && valueLabels[field]?.[value]) return valueLabels[field][value]
  return displayValue(value)
}

function fieldLabel(module: PortalModule, field: string) {
  return module.fields.find((item) => item.name === field)?.label || field
}

function auditActorLabel(value: unknown) {
  return value === 'Seeder inicial PLs al llamado' || value === 'Administrador de prueba' || value === 'Carga inicial del sistema'
    ? 'Carga inicial del sistema'
    : displayValue(value)
}

function hasFieldValue(field: PortalField, value: unknown) {
  if (field.type === 'checkbox') return typeof value === 'boolean'
  if (field.type === 'upload') return value instanceof File || (typeof value === 'string' && value.trim() !== '') || Boolean(value && typeof value === 'object' && 'id' in value)
  if (field.type === 'coverage') return Array.isArray(value) && value.length > 0
  if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) return false
  if (field.type === 'number') {
    const numberValue = Number(value)
    return Number.isFinite(numberValue) && (field.min === undefined || numberValue >= field.min)
  }
  return true
}

function formIsComplete(module: PortalModule, form: RecordData) {
  const requiredFieldsComplete = module.fields.filter((field) => field.required).every((field) => hasFieldValue(field, form[field.name]))
  if (!requiredFieldsComplete) return false
  if (module.slug === 'evidencias') {
    if (form.sourceType === 'otro') return typeof form.otherReference === 'string' && form.otherReference.trim().length > 0
    return hasFieldValue({ name: 'distribution', label: 'Salida de distribución', type: 'select' }, form.distribution)
  }
  return true
}

function valuesEqual(left: unknown, right: unknown) {
  if (left instanceof File || right instanceof File) return false
  try {
    return JSON.stringify(left) === JSON.stringify(right)
  } catch {
    return left === right
  }
}

function inputDateLabel(value: unknown) {
  if (typeof value !== 'string' || !value) return 'Formato: dd/mm/aaaa'
  const date = new Date(`${value.slice(0, 10)}T12:00:00`)
  if (Number.isNaN(date.getTime())) return 'Formato: dd/mm/aaaa'
  return `Fecha seleccionada: ${date.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })}`
}

export function StaffModulePanel({
  module,
  initialRecords,
  initialPage,
  initialTotalPages,
  initialTotalDocs,
}: {
  module: PortalModule
  initialRecords: RecordData[]
  initialPage: number
  initialTotalPages: number
  initialTotalDocs: number
}) {
  const [records, setRecords] = useState(initialRecords)
  const [currentPage, setCurrentPage] = useState(initialPage)
  const [totalPages, setTotalPages] = useState(Math.max(initialTotalPages, 1))
  const [totalDocs, setTotalDocs] = useState(initialTotalDocs)
  const [form, setForm] = useState<RecordData>(() => emptyForm(module))
  const [originalForm, setOriginalForm] = useState<RecordData | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [pageLoading, setPageLoading] = useState(false)
  const [removedMediaIds, setRemovedMediaIds] = useState<string[]>([])
  const [createOpen, setCreateOpen] = useState(false)
  const createCardRef = useRef<HTMLElement | null>(null)
  const recordsCardRef = useRef<HTMLElement | null>(null)

  const formComplete = useMemo(() => formIsComplete(module, form), [module, form])
  const formChanged = useMemo(() => {
    if (!editingId || !originalForm) return true
    return module.fields.some((field) => !valuesEqual(form[field.name], originalForm[field.name])) || removedMediaIds.length > 0
  }, [editingId, form, module.fields, originalForm, removedMediaIds.length])
  const canSubmit = formComplete && (!editingId || formChanged)

  useStaffModuleRefresh({
    url: `/api/equipo/${module.slug}?page=${currentPage}&limit=8`,
    enabled: !editingId && !saving,
    onData: (result) => {
      if (!result.docs) return
      setRecords(result.docs)
      setCurrentPage(result.page || currentPage)
      setTotalPages(Math.max(result.totalPages || 1, 1))
      setTotalDocs(result.totalDocs || 0)
    },
  })

  const editingRecord = useMemo(() => editingId ? records.find((record) => String(record.id) === String(editingId)) : null, [editingId, records])

  useEffect(() => {
    if (!editingRecord) return
    const previousOverflow = document.body.style.overflow
    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeEdit()
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', closeWithEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', closeWithEscape)
    }
  }, [editingRecord])

  function clearFeedback() {
    setMessage('')
    setError('')
  }

  function beginCreate() {
    setEditingId(null)
    setForm(emptyForm(module))
    setOriginalForm(null)
    setRemovedMediaIds([])
    clearFeedback()
    setCreateOpen(true)
    window.requestAnimationFrame(() => createCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  function toggleCreate() {
    const nextOpen = !createOpen
    if (nextOpen) clearFeedback()
    setCreateOpen(nextOpen)
    if (nextOpen) window.requestAnimationFrame(() => createCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  function beginEdit(record: RecordData) {
    const recordId = typeof record.id === 'string' ? record.id : null
    if (!recordId) return
    setEditingId(recordId)
    const nextForm = Object.fromEntries(module.fields.map((field) => [field.name, inputValue(field, record[field.name])])) as RecordData
    if (module.slug === 'servicios' && Array.isArray(nextForm.coverage) && nextForm.coverage.length === 0 && typeof nextForm.city === 'string') nextForm.coverage = serviceCoverageFromCity(nextForm.city)
    setForm(nextForm)
    setOriginalForm(nextForm)
    setRemovedMediaIds([])
    clearFeedback()
  }

  function closeEdit() {
    setEditingId(null)
    setForm(emptyForm(module))
    setOriginalForm(null)
    setRemovedMediaIds([])
    clearFeedback()
  }

  function updateField(field: PortalField, value: unknown) {
    setForm((current) => {
      const next = { ...current, [field.name]: value }
      if (module.slug === 'evidencias' && field.name === 'sourceType') {
        if (value === 'otro') next.distribution = ''
        else next.otherReference = ''
      }
      if (module.slug === 'servicios' && field.name === 'coverage') {
        const firstCoverage = Array.isArray(value) && value[0] && typeof value[0] === 'object' ? value[0] as { city?: unknown } : null
        next.city = typeof firstCoverage?.city === 'string' ? firstCoverage.city : ''
      }
      return next
    })
  }

  function rememberRemovedMedia(id: string) {
    setRemovedMediaIds((current) => current.includes(id) ? current : [...current, id])
  }

  const loadPage = useCallback(async (page: number) => {
    setPageLoading(true)
    try {
      const response = await fetch(`/api/equipo/${module.slug}?page=${page}&limit=8`, { cache: 'no-store' })
      const result = await response.json() as ApiResult
      if (!response.ok || !result.docs) {
        setError(result.message || 'No fue posible cargar los registros.')
        return false
      }
      setRecords(result.docs)
      setCurrentPage(result.page || page)
      setTotalPages(Math.max(result.totalPages || 1, 1))
      setTotalDocs(result.totalDocs || 0)
      return true
    } catch {
      setError('No fue posible conectar con el portal.')
      return false
    } finally {
      setPageLoading(false)
    }
  }, [module.slug])

  async function uploadMedia(file: File, alt: string, createdIds: string[], context: string) {
    const body = new FormData()
    body.append('file', file)
    body.append('alt', alt)
    body.append('context', context)
    const response = await fetch('/api/equipo/media', { method: 'POST', body })
    const result = await response.json() as { doc?: RecordData; message?: string }
    if (!response.ok || !result.doc?.id) throw new Error(result.message || 'No fue posible cargar la imagen.')
    createdIds.push(String(result.doc.id))
    return result.doc.id
  }

  async function resolveMedia(value: unknown, label: string, createdIds: string[], context: string) {
    if (value instanceof File) return uploadMedia(value, label, createdIds, context)
    if (value && typeof value === 'object' && 'id' in value) return (value as { id: string }).id
    return value
  }

  async function payloadFromForm(createdIds: string[]) {
    const payloadData: RecordData = { ...form, ...(editingId ? { id: editingId } : {}) }
    for (const field of module.fields) {
      if (field.type === 'upload') payloadData[field.name] = await resolveMedia(payloadData[field.name], field.label, createdIds, module.slug)
    }
    const { id, ...data } = payloadData
    return { ...normalizePortalData(module, data), ...(id ? { id } : {}) }
  }

  async function deleteMedia(id: string) {
    const response = await fetch('/api/equipo/media', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    const result = await response.json().catch(() => ({})) as { message?: string }
    if (!response.ok) throw new Error(result.message || 'No fue posible eliminar una imagen.')
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    clearFeedback()
    const isEditing = Boolean(editingId)
    if (!canSubmit) return
    const formForValidation = normalizePortalData(module, form)
    const validationError = validatePortalData(module, formForValidation, { partial: isEditing && module.canCreate === false })
    if (validationError) {
      setError(validationError)
      return
    }
    setSaving(true)
    const createdMediaIds: string[] = []
    let recordSaved = false
    try {
      const payload = await payloadFromForm(createdMediaIds)
      const response = await fetch(`/api/equipo/${module.slug}`, {
        method: isEditing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const result = await response.json() as ApiResult
      if (!response.ok || !result.doc) {
        await Promise.all(createdMediaIds.map((id) => deleteMedia(id).catch(() => undefined)))
        setError(result.message || 'No fue posible guardar el registro.')
        return
      }
      recordSaved = true
      try {
        await Promise.all(removedMediaIds.map(deleteMedia))
      } catch (error) {
        await loadPage(currentPage)
        setError(`El registro se guardó, pero no se pudo eliminar una imagen anterior. ${error instanceof Error ? error.message : ''}`.trim())
        return
      }

      if (isEditing) {
        closeEdit()
        await loadPage(currentPage)
        setMessage('Registro actualizado correctamente.')
      } else {
        setForm(emptyForm(module))
        setOriginalForm(null)
        setRemovedMediaIds([])
        await loadPage(1)
        setMessage('Registro creado y listo para revisión.')
        setCreateOpen(false)
        window.requestAnimationFrame(() => recordsCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
      }
    } catch (error) {
      if (!recordSaved) await Promise.all(createdMediaIds.map((id) => deleteMedia(id).catch(() => undefined)))
      setError(error instanceof Error ? error.message : 'No fue posible conectar con el portal.')
    } finally {
      setSaving(false)
    }
  }

  async function remove(record: RecordData) {
    if (!record.id || !window.confirm('¿Quieres eliminar este registro?')) return
    setSaving(true)
    clearFeedback()
    try {
      const response = await fetch(`/api/equipo/${module.slug}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: record.id }) })
      const result = await response.json() as ApiResult
      if (!response.ok) {
        setError(result.message || 'No fue posible eliminar el registro.')
        return
      }
      const nextPage = records.length === 1 && currentPage > 1 ? currentPage - 1 : currentPage
      await loadPage(nextPage)
      setMessage('Registro eliminado correctamente.')
    } catch {
      setError('No fue posible conectar con el portal.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="staff-module-layout">
        <section ref={createCardRef} className={`staff-editor-card${module.canCreate !== false ? ' is-create-card' : ''}${createOpen ? ' is-create-open' : ''}`} aria-labelledby="staff-editor-title">
          <div className="staff-card-heading">
            <div><p className="staff-eyebrow">Captura de información</p><h2 id="staff-editor-title">{module.canCreate === false ? 'Revisión de solicitudes' : 'Nuevo registro'}</h2></div>
            {module.canCreate !== false && <button className="staff-outline-button" type="button" onClick={beginCreate}>Limpiar</button>}
          </div>
          {module.canCreate === false ? <p className="staff-form-help">Estas solicitudes llegan desde la página pública. Selecciona un registro para actualizar su estado o agregar notas internas.</p> : <>
            <button className="staff-mobile-create-toggle" type="button" aria-expanded={createOpen} aria-controls={`staff-create-form-${module.slug}`} onClick={toggleCreate}><span>{createOpen ? 'Ocultar formulario' : `Crear ${module.label.toLocaleLowerCase('es-CO')}`}</span><strong aria-hidden="true">{createOpen ? '−' : '+'}</strong></button>
            <div className="staff-create-form-shell" id={`staff-create-form-${module.slug}`}>
              <form className="staff-record-form" onSubmit={save}><RecordFields module={module} form={form} onChange={updateField} onRemoveMedia={rememberRemovedMedia} /><Feedback error={error} message={message} /><button className="staff-primary-button" type="submit" disabled={saving || !canSubmit}>{saving ? 'Guardando…' : 'Crear registro'}</button></form>
            </div>
            {!createOpen && message && <p className="staff-form-success staff-mobile-create-result" role="status">{message}</p>}
          </>}
        </section>
        <section ref={recordsCardRef} className="staff-records-card" aria-labelledby="staff-records-title">
          <div className="staff-card-heading">
            <div><p className="staff-eyebrow">Registros guardados</p><h2 id="staff-records-title">{totalDocs} elementos</h2></div>
          </div>
          <div className={`staff-record-list${pageLoading ? ' is-loading' : ''}`} aria-live="polite">
            {records.length === 0 && <p className="staff-empty-state">Todavía no hay registros en este módulo.</p>}
            {records.map((record) => <article className="staff-record-item" key={String(record.id)}><div className="staff-record-copy"><h3>{displayValue(record[module.titleField])}</h3><div className="staff-record-meta">{module.summaryFields.map((field) => <span className={field === 'status' ? 'staff-record-status' : undefined} key={field}><small>{fieldLabel(module, field)}:</small> {displayFieldValue(field, record[field])}</span>)}{Object.prototype.hasOwnProperty.call(record, 'publicVisible') && <span><small>Visibilidad:</small> {displayFieldValue('publicVisible', record.publicVisible)}</span>}<span className="staff-record-audit">Registrado por: {auditActorLabel(record.registeredBy)}</span>{Object.prototype.hasOwnProperty.call(record, 'updatedBy') && <span className="staff-record-audit">Actualizado por: {auditActorLabel(record.updatedBy)}</span>}</div></div><div className="staff-record-actions"><button className="staff-icon-button staff-edit-button" type="button" aria-label={`Editar ${displayValue(record[module.titleField])}`} title="Editar registro" onClick={() => beginEdit(record)}><span className="staff-pencil-icon" aria-hidden="true" /><span className="staff-action-label">Editar</span></button>{module.canDelete !== false && <button className="staff-icon-button staff-delete-button" type="button" aria-label={`Eliminar ${displayValue(record[module.titleField])}`} title="Eliminar registro" disabled={saving} onClick={() => remove(record)}><span className="staff-trash-icon" aria-hidden="true" /><span className="staff-action-label">Eliminar</span></button>}</div></article>)}
          </div>
          <Pagination currentPage={currentPage} totalPages={totalPages} loading={pageLoading} onChange={(page) => { closeEdit(); void loadPage(page) }} />
        </section>
      </div>
      {editingRecord && <div className="staff-edit-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeEdit() }}><section className="staff-edit-modal" role="dialog" aria-modal="true" aria-labelledby="staff-edit-title"><div className="staff-modal-heading"><div><p className="staff-eyebrow">Edición segura</p><h2 id="staff-edit-title">Actualizar registro</h2></div><button className="staff-modal-close" type="button" aria-label="Cerrar edición" onClick={closeEdit}>×</button></div><form className="staff-record-form" onSubmit={save}><RecordFields module={module} form={form} onChange={updateField} onRemoveMedia={rememberRemovedMedia} /><Feedback error={error} message={message} /><button className="staff-primary-button" type="submit" disabled={saving || !canSubmit}>{saving ? 'Guardando…' : 'Guardar cambios'}</button></form></section></div>}
    </>
  )
}

function RecordFields({ module, form, onChange, onRemoveMedia }: { module: PortalModule; form: RecordData; onChange: (field: PortalField, value: unknown) => void; onRemoveMedia: (id: string) => void }) {
  const visibleFields = module.fields.filter((field) => {
    if (field.hidden) return false
    if (module.slug === 'evidencias' && field.name === 'distribution' && form.sourceType === 'otro') return false
    if (module.slug === 'evidencias' && field.name === 'otherReference' && form.sourceType !== 'otro') return false
    return true
  })
  const controls: ReactNode[] = []
  for (let index = 0; index < visibleFields.length; index += 1) {
    const field = visibleFields[index]
    if (field.group) {
      const groupedFields = visibleFields.filter((candidate) => candidate.group === field.group)
      controls.push(<div className="staff-field-row" key={`group-${field.group}`}>{groupedFields.map((groupedField) => <FieldControl field={groupedField} value={form[groupedField.name]} onChange={onChange} onRemoveMedia={onRemoveMedia} key={groupedField.name} />)}</div>)
      index += groupedFields.length - 1
      continue
    }
    controls.push(<FieldControl field={field} value={form[field.name]} onChange={onChange} onRemoveMedia={onRemoveMedia} key={field.name} />)
  }
  return <>{controls}</>
}

function Feedback({ error, message }: { error: string; message: string }) {
  return <>{error && <p className="staff-form-error" role="alert">{error}</p>}{message && <p className="staff-form-success" role="status">{message}</p>}</>
}

function Pagination({ currentPage, totalPages, loading, onChange }: { currentPage: number; totalPages: number; loading: boolean; onChange: (page: number) => void }) {
  return <div className="staff-pagination" aria-label="Paginación de registros"><button type="button" disabled={loading || currentPage <= 1} onClick={() => onChange(currentPage - 1)}>← Anterior</button><span>{currentPage} / {totalPages}</span><button type="button" disabled={loading || currentPage >= totalPages} onClick={() => onChange(currentPage + 1)}>Siguiente →</button></div>
}

function FieldControl({ field, value, onChange, onRemoveMedia }: { field: PortalField; value: unknown; onChange: (field: PortalField, value: unknown) => void; onRemoveMedia: (id: string) => void }) {
  if (field.type === 'checkbox') return <label className="staff-checkbox-field"><input type="checkbox" checked={Boolean(value)} onChange={(event) => onChange(field, event.target.checked)} /> <span>{field.label}</span></label>
  if (field.type === 'upload') return <MediaField label={`${field.label}${field.required ? ' *' : ''}`} value={(value || null) as MediaValue} description={field.description} onChange={(next) => onChange(field, next)} onRemove={onRemoveMedia} />
  if (field.type === 'coverage') return <ServiceCoveragePicker value={value} required={field.required} onChange={(next) => onChange(field, next)} />
  if (field.type === 'textarea') return <label className="staff-field"><span>{field.label}{field.required && ' *'}</span><textarea value={String(value ?? '')} required={field.required} maxLength={getPortalFieldMaxLength(field)} placeholder={field.placeholder} onChange={(event) => onChange(field, event.target.value)} />{field.description && <small>{field.description}</small>}</label>
  if (field.type === 'select') return <label className="staff-field"><span>{field.label}{field.required && ' *'}</span><select value={String(value ?? '')} required={field.required} onChange={(event) => onChange(field, event.target.value)}><option value="" disabled hidden>Selecciona una opción</option>{field.options?.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select>{field.description && <small>{field.description}</small>}</label>
  if (field.type === 'date') return <label className="staff-field"><span>{field.label}{field.required && ' *'}</span><input type="date" lang="es-CO" value={String(value ?? '')} required={field.required} maxLength={getPortalFieldMaxLength(field)} onChange={(event) => onChange(field, event.target.value)} /><small>{inputDateLabel(value)}{field.description ? ` · ${field.description}` : ''}</small></label>
  return <label className="staff-field"><span>{field.label}{field.required && ' *'}</span><input type={field.type} value={String(value ?? '')} required={field.required} maxLength={getPortalFieldMaxLength(field)} min={field.type === 'number' ? field.min ?? 0 : undefined} placeholder={field.placeholder} onChange={(event) => onChange(field, event.target.value)} />{field.description && <small>{field.description}</small>}</label>
}
