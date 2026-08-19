'use client'

import { useEffect, useMemo, useState } from 'react'

export type MediaValue = File | string | { id?: string; url?: string; filename?: string; r2Key?: string } | null

export function mediaId(value: MediaValue) {
  if (!value || value instanceof File) return ''
  if (typeof value === 'string') return value.startsWith('/') || value.startsWith('http') ? '' : value
  return value.id ? String(value.id) : ''
}

function mediaUrl(value: MediaValue) {
  if (!value) return ''
  if (value instanceof File) return URL.createObjectURL(value)
  if (typeof value === 'string') return value.startsWith('/') ? (/^\/api\/media\/?$/.test(value) ? '' : value) : `/api/media/${encodeURIComponent(value)}`
  const id = mediaId(value)
  if (value.url && value.url !== '/api/media/' && value.url !== '/api/media') return value.url
  return id ? `/api/media/${encodeURIComponent(id)}` : ''
}

export function MediaField({ label, value, description, onChange, onRemove }: { label: string; value: MediaValue; description?: string; onChange: (value: MediaValue) => void; onRemove?: (id: string) => void }) {
  const preview = useMemo(() => mediaUrl(value), [value])
  const [previewError, setPreviewError] = useState(false)

  useEffect(() => {
    setPreviewError(false)
    return () => {
      if (value instanceof File && preview.startsWith('blob:')) URL.revokeObjectURL(preview)
    }
  }, [preview, value])

  const existingId = mediaId(value)
  return (
    <div className="staff-upload-field">
      <span className="staff-upload-label">{label}</span>
      {preview && !previewError ? <div className="staff-upload-preview">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={preview} alt="Vista previa de la imagen" onError={() => setPreviewError(true)} />
        <div><strong>{value instanceof File ? value.name : 'Imagen cargada'}</strong><button type="button" onClick={() => { if (existingId) onRemove?.(existingId); onChange(null) }}>Eliminar imagen</button></div>
      </div> : <label className="staff-upload-picker"><input type="file" accept="image/*" onChange={(event) => onChange(event.currentTarget.files?.[0] || null)} /><span>Seleccionar imagen</span><small>PNG, JPG o WebP · máximo 10 MB</small></label>}
      {description && <small className="staff-upload-description">{description}</small>}
    </div>
  )
}
