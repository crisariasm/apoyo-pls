'use client'

import { FormEvent, useState } from 'react'

import { supportQuantityUnits, validatePublicRequestForm, type PublicRequestFormErrors } from '../../lib/public-request-validation'
import { FieldError } from './field-error'

export function HelpForm() {
  const [state, setState] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [errors, setErrors] = useState<PublicRequestFormErrors>({})

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setState('sending')
    const form = new FormData(event.currentTarget)
    const body = Object.fromEntries(form.entries()) as Record<string, string | boolean>
    body.privacyAccepted = form.get('privacyAccepted') === 'on'
    const validationErrors = validatePublicRequestForm({
      helpType: String(body.helpType || ''),
      requestType: String(body.requestType || ''),
      category: String(body.category || ''),
      zone: String(body.zone || ''),
      quantity: String(body.quantity || ''),
      quantityUnit: String(body.quantityUnit || ''),
      description: String(body.description || ''),
      contactName: String(body.contactName || ''),
      phone: String(body.phone || ''),
      privacyAccepted: body.privacyAccepted === true,
    })
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length) {
      setState('error')
      setMessage('Revisa los campos marcados antes de enviar la oferta.')
      return
    }
    try {
      const response = await fetch('/api/public/support-request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'No fue posible enviar tu oferta.')
      setState('success')
      setMessage(data.message || 'Tu oferta de ayuda fue recibida.')
    } catch (error) {
      setState('error')
      setMessage(error instanceof Error ? error.message : 'Ocurrió un error. Intenta de nuevo.')
    }
  }

  if (state === 'success') return <div className="success-state form-success"><div className="form-success-label">Oferta recibida</div><h2>Gracias por ayudar</h2><p>{message} El equipo de PLs al llamado revisará la prioridad y te contactará.</p></div>

  return (
    <form className="form-card" onSubmit={submit} noValidate>
      <div className="section-kicker green-text">Quiero ayudar</div>
      <h2>Cuéntanos cómo puedes ayudar</h2>
      <p className="modal-intro">Un solo formulario para ofrecer recursos, transporte o tu tiempo.</p>
      {state === 'error' && <div className="form-error" role="alert">{message}</div>}
      <input type="hidden" name="helpType" value="ofrecer-ayuda" />
      <label>Tipo de ayuda *<select name="requestType" defaultValue="oferta"><option value="oferta">Ofrecer recursos</option><option value="transporte">Ofrecer transporte</option><option value="voluntariado">Ofrecer tiempo o conocimientos</option></select><FieldError message={errors.requestType} /></label>
      <label>Nombre de contacto *<input name="contactName" maxLength={160} placeholder="Tu nombre o el de la organización" autoComplete="name" aria-invalid={Boolean(errors.contactName)} /><FieldError message={errors.contactName} /></label>
      <label>Qué puedes aportar *<input name="category" maxLength={120} placeholder="Cobijas, alimentos, transporte, clasificación..." aria-invalid={Boolean(errors.category)} /><FieldError message={errors.category} /></label>
      <label>Zona donde puedes ayudar *<input name="zone" maxLength={160} placeholder="Pereira, Dosquebradas..." aria-invalid={Boolean(errors.zone)} /><FieldError message={errors.zone} /></label>
      <div className="form-field-row">
        <label>Cantidad aproximada<input name="quantity" type="number" min="1" max="1000000000" step="1" inputMode="numeric" placeholder="Ej. 20" aria-invalid={Boolean(errors.quantity)} /><FieldError message={errors.quantity} /></label>
        <label>Unidad de la cantidad<select name="quantityUnit" defaultValue="" aria-invalid={Boolean(errors.quantityUnit)}><option value="">Selecciona una unidad</option>{supportQuantityUnits.map((unit) => <option value={unit.value} key={unit.value}>{unit.label}</option>)}</select><FieldError message={errors.quantityUnit} /></label>
      </div>
      <p className="form-field-hint">La cantidad y la unidad son opcionales. Si indicas una cantidad, selecciona también cómo se mide.</p>
      <label>Detalle *<textarea name="description" maxLength={5000} placeholder="Cuéntanos qué tienes disponible, qué sabes hacer y cuándo" aria-invalid={Boolean(errors.description)} /><FieldError message={errors.description} /></label>
      <label>Teléfono *<input name="phone" type="tel" inputMode="tel" maxLength={20} placeholder="Ej. 300 123 4567" autoComplete="tel" aria-invalid={Boolean(errors.phone)} /><FieldError message={errors.phone} /></label>
      <label className="check-label"><input type="checkbox" name="privacyAccepted" /> <span>Acepto que PLs al llamado use estos datos para contactarme.</span></label>
      <FieldError message={errors.privacyAccepted} />
      <button className="button button-primary full-button" type="submit" disabled={state === 'sending'}>{state === 'sending' ? 'Enviando…' : 'Enviar oferta'}</button>
    </form>
  )
}
