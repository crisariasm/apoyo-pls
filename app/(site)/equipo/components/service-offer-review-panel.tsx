'use client'

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from 'react'

import { coverageCities, serviceModes, servicePricingTypes, normalizeServiceCoverage, type ServiceCoverage } from '../../../../lib/service-options'
import { useStaffModuleRefresh } from './staff-live-refresh'

type ServiceOffer = {
  id: string
  title?: string
  description?: string
  vision?: string
  category?: string
  provider?: string
  providerEmail?: string
  city?: string
  coverage?: ServiceCoverage[]
  serviceMode?: string
  location?: string
  availability?: string
  pricingType?: string
  price?: string
  image?: unknown
  whatsappCountryCode?: string
  whatsappNumber?: string
  status?: string
  publicVisible?: boolean
  featured?: boolean
  publishedAt?: string
  registeredBy?: string
  createdAt?: string
}

function text(value: unknown, fallback = 'Sin información') {
  return typeof value === 'string' && value.trim() ? value : fallback
}

function today() {
  const now = new Date()
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10)
}

function dateLabel(value: unknown) {
  if (!value) return 'Sin fecha'
  const date = new Date(String(value))
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function optionLabel(options: readonly { value: string; label: string }[], value: unknown) {
  return options.find((option) => option.value === value)?.label || text(value)
}

function mediaUrl(value: unknown) {
  if (typeof value === 'string' && value.trim()) return value.startsWith('/') ? value : `/api/media/${encodeURIComponent(value)}`
  if (!value || typeof value !== 'object') return ''
  const record = value as { id?: unknown; url?: unknown }
  if (typeof record.url === 'string' && record.url.startsWith('/')) return record.url
  return typeof record.id === 'string' && record.id ? `/api/media/${encodeURIComponent(record.id)}` : ''
}

function ServiceOfferIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24"><rect x="3.5" y="7" width="17" height="12" rx="2" /><path d="M8.5 7V5.5A1.5 1.5 0 0 1 10 4h4a1.5 1.5 0 0 1 1.5 1.5V7M3.5 12h17M10 12v2h4v-2" /></svg>
}

export function ServiceOfferReviewPanel({ initialRecords }: { initialRecords: ServiceOffer[] }) {
  const [records, setRecords] = useState(initialRecords)
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<ServiceOffer | null>(null)
  const [featured, setFeatured] = useState(false)
  const [publicVisible, setPublicVisible] = useState(true)
  const [publishedAt, setPublishedAt] = useState(today)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useStaffModuleRefresh({
    url: '/api/equipo/servicios?review=pending',
    enabled: !open && !saving,
    onData: (result) => {
      if (result.docs) setRecords(result.docs as ServiceOffer[])
    },
  })

  useEffect(() => {
    if (!open) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !saving) setOpen(false)
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open, saving])

  const selectedCoverage = useMemo(() => normalizeServiceCoverage(selected?.coverage), [selected])
  const selectedImage = mediaUrl(selected?.image)

  function openReview() {
    const first = typeof window !== 'undefined' && window.matchMedia('(max-width: 760px)').matches ? null : records[0] || null
    setSelected(first)
    setFeatured(Boolean(first?.featured))
    setPublicVisible(first?.publicVisible !== false)
    setPublishedAt(first?.publishedAt ? String(first.publishedAt).slice(0, 10) : today())
    setError('')
    setMessage('')
    setOpen(true)
  }

  function chooseRecord(record: ServiceOffer) {
    if (selected?.id === record.id) {
      setSelected(null)
      setError('')
      return
    }
    setSelected(record)
    setFeatured(Boolean(record.featured))
    setPublicVisible(record.publicVisible !== false)
    setPublishedAt(record.publishedAt ? String(record.publishedAt).slice(0, 10) : today())
    setError('')
  }

  async function manage(action: 'approve' | 'delete') {
    if (!selected || saving) return
    if (action === 'delete' && !window.confirm('¿Quieres eliminar esta solicitud? Esta acción no se puede deshacer.')) return
    setSaving(true)
    setError('')
    try {
      const response = await fetch('/api/equipo/servicios/review', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: selected.id, action, featured, publicVisible, publishedAt }) })
      const result = await response.json() as { message?: string }
      if (!response.ok) throw new Error(result.message || 'No fue posible gestionar la solicitud.')
      setRecords((current) => current.filter((record) => record.id !== selected.id))
      setSelected(null)
      setMessage(action === 'approve' ? 'Servicio aprobado y listo para aparecer en el directorio.' : 'Solicitud eliminada correctamente.')
      if (!records.length || records.length === 1) setOpen(false)
    } catch (manageError) {
      setError(manageError instanceof Error ? manageError.message : 'No fue posible conectar con el portal.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="service-review-card" aria-labelledby="service-review-title">
      <div className="service-review-card-copy"><div><p className="staff-eyebrow">Bandeja de entrada</p><h2 id="service-review-title">Solicitudes para publicar</h2><p>Las personas pueden ofrecer su servicio desde la página pública. Revísalo, completa la publicación y decide si queda destacado.</p></div><span className="service-review-count">{records.length}</span></div>
      <div className="service-review-card-actions"><span>{records.length ? `${records.length === 1 ? 'Hay una propuesta' : `Hay ${records.length} propuestas`} esperando revisión.` : 'No hay propuestas pendientes en este momento.'}</span><button className="staff-primary-button" type="button" onClick={openReview} disabled={!records.length}>{records.length ? 'Revisar solicitudes' : 'Bandeja al día'}{records.length > 0 && <strong aria-hidden="true">→</strong>}</button></div>
      {message && <p className="staff-form-success" role="status">{message}</p>}
      {open && <div className="staff-edit-backdrop service-review-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && !saving && setOpen(false)}>
        <section className="service-review-modal" role="dialog" aria-modal="true" aria-labelledby="service-review-modal-title">
          <div className="staff-modal-heading"><div><p className="staff-eyebrow">Revisión de servicios</p><h2 id="service-review-modal-title">Propuestas recibidas</h2><span className="staff-page-caption">{records.length} pendientes</span></div><button className="staff-modal-close" type="button" aria-label="Cerrar revisión" onClick={() => !saving && setOpen(false)}>×</button></div>
          <div className="service-review-modal-layout">
            <div className="service-review-list" aria-label="Solicitudes pendientes">
              {records.map((record) => {
                const isSelected = selected?.id === record.id
                const detailId = `service-offer-detail-${record.id}`
                return <button className={`service-review-list-item${isSelected ? ' is-active' : ''}`} type="button" key={record.id} aria-expanded={isSelected} aria-controls={detailId} onClick={() => chooseRecord(record)}><span className="service-review-list-icon"><ServiceOfferIcon /></span><span><strong>{text(record.title)}</strong><small>{text(record.provider)} · {coverageCities(record.coverage, text(record.city, 'Sin ciudad')).join(' · ')}</small></span><span aria-hidden="true">{isSelected ? '⌃' : '→'}</span></button>
              })}
            </div>
            {selected ? <div className="service-review-detail" id={`service-offer-detail-${selected.id}`}>
              <div className="service-review-detail-heading"><div><span className="service-review-origin">Borrador público</span><h3>{text(selected.title)}</h3><p>{text(selected.category)} · {optionLabel(serviceModes, selected.serviceMode)}</p></div><button className="service-review-collapse" type="button" onClick={() => setSelected(null)} aria-label="Colapsar solicitud">⌃ <span>Colapsar</span></button></div>
              {selectedImage && <div className="service-review-image"><span>Foto adjunta</span><img src={selectedImage} alt={`Foto de ${text(selected.title, 'la solicitud')}`} loading="eager" decoding="async" fetchPriority="high" /></div>}
              <div className="service-review-detail-grid"><div><small>Persona que ofrece</small><strong>{text(selected.provider)}</strong></div><div><small>WhatsApp</small><strong>{text(selected.whatsappCountryCode, '+57')} {text(selected.whatsappNumber)}</strong></div><div><small>Correo privado</small><strong>{text(selected.providerEmail, 'No indicó')}</strong></div><div><small>Tarifa</small><strong>{optionLabel(servicePricingTypes, selected.pricingType)} · {text(selected.price, 'Se acuerda por WhatsApp')}</strong></div><div><small>Zona o alcance</small><strong>{text(selected.location)}</strong></div><div><small>Disponibilidad</small><strong>{text(selected.availability)}</strong></div><div className="service-review-detail-wide"><small>Cobertura</small><strong>{selectedCoverage.length ? selectedCoverage.map((item) => `${item.city}, ${item.department}`).join(' · ') : text(selected.city)}</strong></div><div className="service-review-detail-wide"><small>Visión PL</small><p>{text(selected.vision, 'No indicó una visión PL.')}</p></div><div className="service-review-detail-wide"><small>Descripción</small><p>{text(selected.description)}</p></div><div className="service-review-detail-wide"><small>Recibida</small><strong>{dateLabel(selected.createdAt)} · {text(selected.registeredBy, 'Formulario público')}</strong></div></div>
              <div className="service-review-publish-box"><div><p className="staff-eyebrow">Completa la publicación</p><h4>¿Cómo debe aparecer?</h4></div><label className="staff-checkbox-field"><input type="checkbox" checked={featured} onChange={(event) => setFeatured(event.currentTarget.checked)} /><span>Destacado</span></label><label className="staff-checkbox-field"><input type="checkbox" checked={publicVisible} onChange={(event) => setPublicVisible(event.currentTarget.checked)} /><span>Visible públicamente</span></label><label className="staff-field"><span>Fecha de publicación *</span><input type="date" lang="es-CO" value={publishedAt} onChange={(event) => setPublishedAt(event.currentTarget.value)} required /></label></div>{error && <p className="staff-form-error" role="alert">{error}</p>}<div className="service-review-actions"><button className="staff-primary-button" type="button" disabled={saving || !publishedAt} onClick={() => void manage('approve')}>{saving ? 'Guardando…' : 'Aprobar servicio'}</button><button className="staff-outline-button service-review-delete" type="button" disabled={saving} onClick={() => void manage('delete')}>Eliminar solicitud</button></div>
            </div> : <p className="staff-empty-state">Selecciona una propuesta para revisar su información.</p>}
          </div>
        </section>
      </div>}
    </section>
  )
}
