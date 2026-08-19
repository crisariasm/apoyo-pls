'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'

type RecordData = Record<string, unknown>

const statusLabels: Record<string, string> = {
  pendiente: 'Pendiente',
  'en-revision': 'En revisión',
  asignada: 'Asignada',
  atendida: 'Atendida',
  cerrada: 'Cerrada',
}

const requestTypeLabels: Record<string, string> = {
  recursos: 'Solicitar recursos',
  oferta: 'Ofrecer recursos',
  transporte: 'Solicitar transporte',
  voluntariado: 'Ofrecer voluntariado',
}

const helpTypeLabels: Record<string, string> = {
  'necesitar-ayuda': 'Necesitar ayuda',
  'ofrecer-ayuda': 'Ofrecer ayuda',
}

function label(value: unknown, labels: Record<string, string>, fallback = 'Sin información') {
  if (typeof value !== 'string' || !value) return fallback
  return labels[value] || value
}

function value(value: unknown) {
  if (value === true) return 'Sí'
  if (value === false) return 'No'
  if (value === null || value === undefined || value === '') return 'Sin información'
  return String(value)
}

function dateValue(value: unknown) {
  if (!value) return 'Sin fecha'
  const date = new Date(String(value))
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function statusClass(status: unknown) {
  return typeof status === 'string' ? `is-${status}` : 'is-pendiente'
}

function helpType(record: RecordData) {
  if (typeof record.helpType === 'string') return record.helpType
  return ['oferta', 'transporte', 'voluntariado'].includes(String(record.requestType)) ? 'ofrecer-ayuda' : 'necesitar-ayuda'
}

export function SupportRequestPanel({ initialRecords, canManage }: { initialRecords: RecordData[]; canManage: boolean }) {
  const [records, setRecords] = useState(initialRecords)
  const [selected, setSelected] = useState<RecordData | null>(null)
  const [status, setStatus] = useState('pendiente')
  const [internalNotes, setInternalNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const inbox = useMemo(() => records.filter((record) => record.status === 'pendiente'), [records])
  const saved = useMemo(() => records.filter((record) => record.status !== 'pendiente'), [records])
  const canSaveSelected = Boolean(selected && canManage && (selected.status === 'pendiente' || status !== selected.status || internalNotes !== (typeof selected.internalNotes === 'string' ? selected.internalNotes : '')))

  useEffect(() => {
    if (selected || saving) return
    let cancelled = false
    const refreshRequests = async () => {
      try {
        const response = await fetch('/api/equipo/administracion?limit=20&page=1', { cache: 'no-store' })
        const result = await response.json() as { docs?: RecordData[] }
        if (response.ok && result.docs && !cancelled) setRecords(result.docs)
      } catch {
        // La información visible se conserva si una actualización automática falla.
      }
    }
    const interval = window.setInterval(refreshRequests, 5000)
    window.addEventListener('focus', refreshRequests)
    return () => {
      cancelled = true
      window.clearInterval(interval)
      window.removeEventListener('focus', refreshRequests)
    }
  }, [selected, saving])

  function openRecord(record: RecordData) {
    setSelected(record)
    setStatus(record.status === 'pendiente' ? 'en-revision' : typeof record.status === 'string' ? record.status : 'en-revision')
    setInternalNotes(typeof record.internalNotes === 'string' ? record.internalNotes : '')
    setError('')
    setMessage('')
  }

  function closeRecord() {
    setSelected(null)
    setError('')
  }

  async function saveRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canManage || !selected?.id) return
    setSaving(true)
    setError('')
    try {
      const response = await fetch('/api/equipo/administracion', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selected.id, status, internalNotes }),
      })
      const result = await response.json() as { doc?: RecordData; message?: string }
      if (!response.ok || !result.doc) {
        setError(result.message || 'No fue posible guardar la solicitud.')
        return
      }
      setRecords((current) => current.map((record) => String(record.id) === String(result.doc?.id) ? result.doc as RecordData : record))
      setSelected(null)
      setMessage(status === 'pendiente' ? 'Solicitud actualizada.' : 'Solicitud guardada en los registros gestionados.')
    } catch {
      setError('No fue posible conectar con el portal.')
    } finally {
      setSaving(false)
    }
  }

  async function deleteRecord() {
    if (!canManage || !selected?.id || !window.confirm('¿Quieres eliminar esta solicitud? Esta acción no se puede deshacer.')) return
    setSaving(true)
    setError('')
    try {
      const response = await fetch('/api/equipo/administracion', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selected.id }),
      })
      const result = await response.json() as { message?: string }
      if (!response.ok) {
        setError(result.message || 'No fue posible eliminar la solicitud.')
        return
      }
      setRecords((current) => current.filter((record) => String(record.id) !== String(selected.id)))
      setSelected(null)
      setMessage('Solicitud eliminada correctamente.')
    } catch {
      setError('No fue posible conectar con el portal.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="staff-request-layout">
        <section className="staff-request-inbox" aria-labelledby="staff-request-inbox-title">
          <div className="staff-card-heading">
            <div><p className="staff-eyebrow">Captura de información</p><h2 id="staff-request-inbox-title">Solicitudes por revisar</h2></div>
            <span className="staff-request-count">{inbox.length}</span>
          </div>
          <p className="staff-form-help">Las solicitudes de la página pública llegan aquí. Ábrelas para leer toda la información, guardar su gestión o eliminarlas.</p>
          <div className="staff-request-list" aria-live="polite">
            {inbox.length === 0 && <p className="staff-empty-state">No hay solicitudes pendientes de revisión.</p>}
            {inbox.map((record) => <RequestCard key={String(record.id)} record={record} onOpen={openRecord} />)}
          </div>
        </section>

        <section className="staff-request-saved" aria-labelledby="staff-request-saved-title">
          <div className="staff-card-heading">
            <div><p className="staff-eyebrow">Registros guardados</p><h2 id="staff-request-saved-title">{saved.length} gestionadas</h2></div>
            <span className="staff-page-caption">El estado queda visible en cada registro</span>
          </div>
          {message && <p className="staff-form-success" role="status">{message}</p>}
          {error && !selected && <p className="staff-form-error" role="alert">{error}</p>}
          <div className="staff-request-list" aria-live="polite">
            {saved.length === 0 && <p className="staff-empty-state">Cuando guardes una solicitud, aparecerá aquí.</p>}
            {saved.map((record) => <RequestCard key={String(record.id)} record={record} onOpen={openRecord} saved />)}
          </div>
        </section>
      </div>

      {selected && <div className="staff-edit-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeRecord() }}>
        <section className="staff-request-modal" role="dialog" aria-modal="true" aria-labelledby="staff-request-modal-title">
          <div className="staff-modal-heading">
            <div><p className="staff-eyebrow">Detalle de la solicitud</p><h2 id="staff-request-modal-title">{label(selected.requestType, requestTypeLabels)}</h2><span className={`staff-request-status ${statusClass(status)}`}>{label(status, statusLabels)}</span></div>
            <button className="staff-modal-close" type="button" aria-label="Cerrar solicitud" onClick={closeRecord}>×</button>
          </div>
          <div className="staff-request-detail-grid">
            <Detail label="Tipo de ayuda" value={label(helpType(selected), helpTypeLabels)} />
            <Detail label="Categoría" value={selected.category} />
            <Detail label="Zona o barrio" value={selected.zone} />
            <Detail label="Cantidad aproximada" value={selected.quantity} />
            <Detail label="Nombre de contacto" value={selected.contactName} />
            <Detail label="Canal de contacto" value={selected.contactChannel} />
            <Detail label="Aceptó privacidad" value={selected.privacyAccepted} />
            <Detail label="Recibida" value={dateValue(selected.createdAt)} />
            <Detail label="Registrada por" value={selected.registeredBy || 'Formulario público'} />
            <Detail label="Última actualización" value={dateValue(selected.updatedAt)} />
            <Detail label="Actualizada por" value={selected.updatedBy || 'Sin actualización'} />
            <div className="staff-request-detail staff-request-detail-wide"><span>Detalle</span><p>{value(selected.description)}</p></div>
          </div>
          {canManage ? <form className="staff-request-form" onSubmit={saveRecord}>
            {selected.status === 'pendiente' ? <p className="staff-form-help">Al guardar, esta solicitud pasará a <strong>En revisión</strong> y quedará disponible a la derecha para continuar su seguimiento.</p> : <label className="staff-field"><span>Estado de atención *</span><select value={status} required onChange={(event) => setStatus(event.target.value)}>{Object.entries(statusLabels).filter(([option]) => option !== 'pendiente').map(([option, optionLabel]) => <option value={option} key={option}>{optionLabel}</option>)}</select></label>}
            <label className="staff-field"><span>Notas internas</span><textarea value={internalNotes} maxLength={5000} placeholder="Anota el seguimiento que necesita el equipo." onChange={(event) => setInternalNotes(event.target.value)} /></label>
            {error && <p className="staff-form-error" role="alert">{error}</p>}
            <div className="staff-request-modal-actions"><button className="staff-primary-button" type="submit" disabled={saving || !canSaveSelected}>{saving ? 'Guardando…' : 'Guardar en registros'}</button><button className="staff-icon-button staff-delete-button" type="button" disabled={saving} onClick={() => void deleteRecord()}><span className="staff-trash-icon" aria-hidden="true" />Eliminar solicitud</button></div>
          </form> : <p className="staff-form-help">Las solicitudes son compartidas por el equipo. Puedes consultar su estado y abrir cada registro para revisar la información completa.</p>}
        </section>
      </div>}
    </>
  )
}

function RequestCard({ record, onOpen, saved = false }: { record: RecordData; onOpen: (record: RecordData) => void; saved?: boolean }) {
  const status = typeof record.status === 'string' ? record.status : 'pendiente'
  return <article className="staff-request-item">
    <div className="staff-request-copy"><div className="staff-request-item-heading"><div><span className="staff-request-kind">{label(helpType(record), helpTypeLabels)}</span><h3>{label(record.requestType, requestTypeLabels)}</h3></div><span className={`staff-request-status ${statusClass(status)}`}>{label(status, statusLabels)}</span></div><p>{value(record.category)} · {value(record.zone)}</p><small>{dateValue(record.createdAt)} · {saved ? `Registrada por ${value(record.registeredBy || 'Formulario público')}` : 'Pendiente de lectura'}</small></div>
    <button className="staff-outline-button" type="button" onClick={() => onOpen(record)}>{saved ? 'Ver información' : 'Abrir solicitud'}</button>
  </article>
}

function Detail({ label: detailLabel, value: detailValue }: { label: string; value: unknown }) {
  return <div className="staff-request-detail"><span>{detailLabel}</span><strong>{value(detailValue)}</strong></div>
}
