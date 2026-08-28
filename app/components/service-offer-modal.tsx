'use client'

/* eslint-disable @next/next/no-img-element */

import { FormEvent, type ReactNode, useEffect, useId, useState } from 'react'

import { ServiceCoveragePicker } from './service-coverage-picker'
import { serviceModes, servicePricingTypes, type ServiceCoverage } from '../../lib/service-options'
import { isValidWhatsAppNumber, whatsappCountryCodes } from '../../lib/whatsapp'

type ServiceOfferModalProps = {
  children: ReactNode
  className?: string
}

type FormState = 'idle' | 'sending' | 'success' | 'error'

type OfferFields = {
  provider: string
  providerEmail: string
  whatsappCountryCode: string
  whatsappNumber: string
  title: string
  category: string
  description: string
  vision: string
  location: string
  serviceMode: string
  availability: string
  privacyAccepted: boolean
}

function emptyFields(): OfferFields {
  return { provider: '', providerEmail: '', whatsappCountryCode: '+57', whatsappNumber: '', title: '', category: '', description: '', vision: '', location: '', serviceMode: 'presencial', availability: '', privacyAccepted: false }
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_IMAGE_SIZE = 10 * 1024 * 1024

export function ServiceOfferModal({ children, className = 'button button-ghost' }: ServiceOfferModalProps) {
  const [open, setOpen] = useState(false)
  const [state, setState] = useState<FormState>('idle')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [fields, setFields] = useState<OfferFields>(emptyFields)
  const [coverage, setCoverage] = useState<ServiceCoverage[]>([])
  const [pricingType, setPricingType] = useState('gratis')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState('')
  const [imageError, setImageError] = useState('')
  const titleId = useId()
  const imageInputId = useId()

  const emailIsValid = !fields.providerEmail.trim() || emailPattern.test(fields.providerEmail.trim())
  const whatsappIsValid = isValidWhatsAppNumber(fields.whatsappCountryCode, fields.whatsappNumber.trim())
  const formIsReady = fields.provider.trim().length >= 3
    && emailIsValid
    && whatsappIsValid
    && fields.title.trim().length >= 3
    && fields.category.trim().length >= 2
    && fields.description.trim().length >= 20
    && fields.vision.trim().length >= 4
    && coverage.length > 0
    && fields.location.trim().length >= 2
    && Boolean(fields.serviceMode)
    && Boolean(pricingType)
    && Boolean(imageFile)
    && !imageError
    && fields.privacyAccepted

  useEffect(() => {
    if (!open) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && state !== 'sending') setOpen(false)
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open, state])

  useEffect(() => {
    if (!imageFile) {
      setImagePreview('')
      return
    }
    const previewUrl = URL.createObjectURL(imageFile)
    setImagePreview(previewUrl)
    return () => URL.revokeObjectURL(previewUrl)
  }, [imageFile])

  function updateField(field: keyof OfferFields, value: string | boolean) {
    setFields((current) => ({ ...current, [field]: value }))
    if (error) setError('')
  }

  function selectImage(file: File | null) {
    setImageError('')
    if (!file) {
      setImageFile(null)
      return
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setImageFile(null)
      setImageError('La foto no puede superar los 10 MB.')
      return
    }
    setImageFile(file)
    if (error) setError('')
  }

  function removeImage() {
    setImageFile(null)
    setImageError('')
  }

  function openModal() {
    setState('idle')
    setMessage('')
    setError('')
    setFields(emptyFields())
    setCoverage([])
    setPricingType('gratis')
    setImageFile(null)
    setImageError('')
    setOpen(true)
  }

  function closeModal() {
    if (state !== 'sending') setOpen(false)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    if (!form.checkValidity()) {
      form.reportValidity()
      setState('error')
      setError('Revisa los campos marcados antes de enviar la propuesta.')
      return
    }
    if (!formIsReady || !imageFile) {
      setState('error')
      setError(imageError || 'Completa todos los campos obligatorios, agrega una foto y acepta el aviso de privacidad.')
      return
    }

    setState('sending')
    setError('')
    const payload = new FormData()
    payload.append('provider', fields.provider.trim())
    payload.append('providerEmail', fields.providerEmail.trim())
    payload.append('whatsappCountryCode', fields.whatsappCountryCode)
    payload.append('whatsappNumber', fields.whatsappNumber.trim())
    payload.append('title', fields.title.trim())
    payload.append('category', fields.category.trim())
    payload.append('description', fields.description.trim())
    payload.append('vision', fields.vision.trim())
    payload.append('coverage', JSON.stringify(coverage))
    payload.append('location', fields.location.trim())
    payload.append('serviceMode', fields.serviceMode)
    payload.append('availability', fields.availability.trim())
    payload.append('pricingType', pricingType)
    payload.append('privacyAccepted', 'true')
    payload.append('image', imageFile, imageFile.name)

    try {
      const response = await fetch('/api/public/service-offer', { method: 'POST', body: payload })
      const data = await response.json() as { error?: string; message?: string }
      if (!response.ok) throw new Error(data.error || 'No fue posible registrar tu servicio.')
      setState('success')
      setMessage(data.message || 'Recibimos tu servicio. El equipo lo revisará antes de publicarlo.')
    } catch (submitError) {
      setState('error')
      setError(submitError instanceof Error ? submitError.message : 'Ocurrió un error. Intenta de nuevo.')
    }
  }

  return (
    <>
      <button className={className} type="button" onClick={openModal} aria-haspopup="dialog">{children}</button>
      {open && <div className="service-offer-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && closeModal()}>
        <section className="service-offer-modal" role="dialog" aria-modal="true" aria-labelledby={titleId}>
          <div className="service-offer-modal-heading"><div><span className="section-kicker orange-text">Comparte tu oficio</span><h2 id={titleId}>Quiero ofrecer un servicio</h2><p>Cuéntanos lo necesario. Tu propuesta llegará como borrador al equipo y solo se publicará después de revisarla.</p></div><button className="service-offer-close" type="button" aria-label="Cerrar formulario" onClick={closeModal}>×</button></div>
          {state === 'success' ? <div className="service-offer-success"><span className="service-offer-success-icon">✓</span><h3>Tu propuesta quedó recibida</h3><p>{message}</p><button className="button button-primary" type="button" onClick={closeModal}>Cerrar</button></div> : <form className="service-offer-form" onSubmit={submit}>
            {state === 'error' && <div className="form-error" role="alert">{error}</div>}
            <div className="service-offer-section"><span className="service-offer-section-number">01</span><div><h3>Tus datos de contacto</h3><p>Los usaremos para confirmar la información. No se muestran públicamente.</p></div></div>
            <div className="service-offer-form-grid">
              <label>Nombre completo <span className="service-offer-required">* Obligatorio</span><input name="provider" value={fields.provider} onChange={(event) => updateField('provider', event.currentTarget.value)} minLength={3} maxLength={160} required placeholder="Ej.: María Fernanda López" autoComplete="name" /></label>
              <label>Correo electrónico <span className="service-offer-optional">Opcional</span><input name="providerEmail" value={fields.providerEmail} onChange={(event) => updateField('providerEmail', event.currentTarget.value)} type="email" maxLength={254} placeholder="Ej.: nombre@correo.com" autoComplete="email" aria-invalid={Boolean(fields.providerEmail && !emailIsValid)} />{fields.providerEmail && !emailIsValid && <small className="service-offer-field-error">Escribe un correo válido o déjalo vacío.</small>}</label>
              <label className="service-offer-phone-country">Indicativo <span className="service-offer-required">* Obligatorio</span><select name="whatsappCountryCode" value={fields.whatsappCountryCode} onChange={(event) => updateField('whatsappCountryCode', event.currentTarget.value)} required>{whatsappCountryCodes.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select></label>
              <label>WhatsApp <span className="service-offer-required">* Obligatorio</span><input name="whatsappNumber" value={fields.whatsappNumber} onChange={(event) => updateField('whatsappNumber', event.currentTarget.value)} type="tel" inputMode="tel" pattern="[0-9\s().-]+" minLength={6} maxLength={20} required placeholder="300 123 4567" autoComplete="tel" aria-invalid={Boolean(fields.whatsappNumber && !whatsappIsValid)} />{fields.whatsappNumber && !whatsappIsValid && <small className="service-offer-field-error">Revisa el número y el indicativo.</small>}</label>
            </div>
            <div className="service-offer-section"><span className="service-offer-section-number">02</span><div><h3>Lo que sabes hacer</h3><p>Una descripción clara ayuda a que las personas encuentren tu servicio.</p></div></div>
            <div className="service-offer-form-grid">
              <label>Nombre del servicio <span className="service-offer-required">* Obligatorio</span><input name="title" value={fields.title} onChange={(event) => updateField('title', event.currentTarget.value)} minLength={3} maxLength={160} required placeholder="Ej.: Reparaciones eléctricas" /></label>
              <label>Categoría o área <span className="service-offer-required">* Obligatorio</span><input name="category" value={fields.category} onChange={(event) => updateField('category', event.currentTarget.value)} minLength={2} maxLength={120} required placeholder="Ej.: Construcción y reparaciones" /></label>
            </div>
            <label>Descripción del servicio <span className="service-offer-required">* Obligatorio</span><textarea name="description" value={fields.description} onChange={(event) => updateField('description', event.currentTarget.value)} minLength={20} maxLength={5000} required placeholder="Qué haces, para quién y qué incluye el servicio." />{fields.description.length > 0 && fields.description.trim().length < 20 && <small className="service-offer-field-error">Agrega al menos 20 caracteres para explicar bien tu servicio.</small>}</label>
            <label>Visión PL <span className="service-offer-required">* Obligatorio</span><input name="vision" value={fields.vision} onChange={(event) => updateField('vision', event.currentTarget.value)} minLength={4} maxLength={160} required />{fields.vision.length > 0 && fields.vision.trim().length < 4 && <small className="service-offer-field-error">Agrega al menos 4 caracteres.</small>}</label>
            <ServiceCoveragePicker value={coverage} required onChange={(value) => { setCoverage(value); if (error) setError('') }} />
            <div className="service-offer-image-field">
              <div className="service-offer-image-label"><span>Foto del servicio <strong>* Obligatorio</strong></span><small>Ayuda al equipo a identificar y revisar tu propuesta.</small></div>
              {imagePreview ? <div className="service-offer-image-preview"><img src={imagePreview} alt={`Vista previa de ${fields.title || 'tu servicio'}`} /><div><strong>{imageFile?.name}</strong><button type="button" onClick={removeImage}>Quitar foto</button></div></div> : <label className="service-offer-image-picker" htmlFor={imageInputId}><input id={imageInputId} name="image" type="file" accept="image/*" required onChange={(event) => selectImage(event.currentTarget.files?.[0] || null)} /><span>Seleccionar una foto</span><small>Imagen JPG, PNG, WEBP u otro formato compatible · máximo 10 MB</small></label>}
              {imageError && <small className="service-offer-field-error">{imageError}</small>}
            </div>
            <div className="service-offer-form-grid"><label>Barrio, zona o alcance <span className="service-offer-required">* Obligatorio</span><input name="location" value={fields.location} onChange={(event) => updateField('location', event.currentTarget.value)} minLength={2} maxLength={160} required placeholder="Ej.: Cuba, sector centro o todo Pereira" /></label><label>Modalidad <span className="service-offer-required">* Obligatorio</span><select name="serviceMode" value={fields.serviceMode} onChange={(event) => updateField('serviceMode', event.currentTarget.value)} required>{serviceModes.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select></label><label>Disponibilidad <span className="service-offer-optional">Opcional</span><input name="availability" value={fields.availability} onChange={(event) => updateField('availability', event.currentTarget.value)} maxLength={160} placeholder="Ej.: Con cita previa, lunes a viernes" /></label><label>Tarifa <span className="service-offer-required">* Obligatorio</span><select name="pricingType" value={pricingType} onChange={(event) => setPricingType(event.currentTarget.value)} required>{servicePricingTypes.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select></label></div>
            <p className="service-offer-pricing-note">Elige si es gratis, de pago o negociable. El valor se acuerda directamente por WhatsApp.</p>
            <label className="check-label service-offer-privacy"><input type="checkbox" name="privacyAccepted" checked={fields.privacyAccepted} onChange={(event) => updateField('privacyAccepted', event.currentTarget.checked)} required /> <span>Acepto que PLs al llamado use estos datos para revisar y contactarme sobre esta propuesta. <strong>* Obligatorio</strong></span></label>
            <button className="button button-primary full-button" type="submit" disabled={state === 'sending' || !formIsReady} title={!formIsReady && state !== 'sending' ? 'Completa todos los campos obligatorios, agrega una foto y acepta el aviso de privacidad.' : undefined}>{state === 'sending' ? 'Enviando propuesta…' : 'Enviar propuesta para revisión'}</button>
            <p className="service-offer-required-note"><strong>* Obligatorio.</strong> El botón se habilita cuando la información está completa y válida.</p>
          </form>}
        </section>
      </div>}
    </>
  )
}
