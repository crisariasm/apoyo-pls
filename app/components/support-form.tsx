'use client'

import { FormEvent, useState } from 'react'

import { supportQuantityUnits, validatePublicRequestForm, type PublicRequestFormErrors } from '../../lib/public-request-validation'

function FieldError({ message }: { message?: string }) {
  return message ? <span className="form-field-error">{message}</span> : null
}

export function SupportForm() {
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
      setMessage('Revisa los campos marcados antes de enviar la solicitud.')
      return
    }

    try {
      const response = await fetch('/api/public/support-request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'No fue posible enviar la solicitud.')
      setState('success')
      setMessage(data.message || 'El equipo de PLs al llamado recibió tu solicitud.')
    } catch (error) {
      setState('error')
      setMessage(error instanceof Error ? error.message : 'Ocurrió un error. Intenta de nuevo.')
    }
  }

  if (state === 'success') return <div className="success-state form-success"><div className="form-success-label">Solicitud recibida</div><h2>Información recibida</h2><p>{message} El equipo la revisará y te contactará al teléfono indicado.</p></div>

  return (
    <form className="form-card" onSubmit={submit} noValidate>
      <div className="section-kicker orange-text">Formulario de apoyo</div>
      <h2>Cuéntanos qué se necesita</h2>
      <p className="modal-intro">Trabajamos por zona y necesidad general. No registres nombres de menores ni datos sensibles.</p>
      {state === 'error' && <div className="form-error" role="alert">{message}</div>}
      <input type="hidden" name="helpType" value="necesitar-ayuda" />
      <label>Tipo de solicitud *<select name="requestType" defaultValue="recursos"><option value="recursos">Solicitar recursos</option><option value="transporte">Solicitar transporte</option></select><FieldError message={errors.requestType} /></label>
      <label>Nombre de contacto *<input name="contactName" maxLength={160} placeholder="Tu nombre o el de la organización" autoComplete="name" aria-invalid={Boolean(errors.contactName)} /><FieldError message={errors.contactName} /></label>
      <label>Categoría *<input name="category" maxLength={120} placeholder="Agua, alimentos, aseo..." aria-invalid={Boolean(errors.category)} /><FieldError message={errors.category} /></label>
      <label>Zona o barrio *<input name="zone" maxLength={160} placeholder="Ej. La Florida" aria-invalid={Boolean(errors.zone)} /><FieldError message={errors.zone} /></label>
      <div className="form-field-row">
        <label>Cantidad aproximada<input name="quantity" type="number" min="1" max="1000000000" step="1" inputMode="numeric" placeholder="Ej. 20" aria-invalid={Boolean(errors.quantity)} /><FieldError message={errors.quantity} /></label>
        <label>Unidad de la cantidad<select name="quantityUnit" defaultValue="" aria-invalid={Boolean(errors.quantityUnit)}><option value="">Selecciona una unidad</option>{supportQuantityUnits.map((unit) => <option value={unit.value} key={unit.value}>{unit.label}</option>)}</select><FieldError message={errors.quantityUnit} /></label>
      </div>
      <p className="form-field-hint">La cantidad y la unidad son opcionales. Si indicas una cantidad, selecciona también cómo se mide.</p>
      <label>Detalle *<textarea name="description" maxLength={5000} placeholder="¿Qué se necesita y para cuándo?" aria-invalid={Boolean(errors.description)} /><FieldError message={errors.description} /></label>
      <label>Teléfono *<input name="phone" type="tel" inputMode="tel" maxLength={20} placeholder="Ej. 300 123 4567" autoComplete="tel" aria-invalid={Boolean(errors.phone)} /><FieldError message={errors.phone} /></label>
      <label className="check-label"><input type="checkbox" name="privacyAccepted" /> <span>Acepto el aviso de privacidad.</span></label>
      <FieldError message={errors.privacyAccepted} />
      <button className="button button-primary full-button" type="submit" disabled={state === 'sending'}>{state === 'sending' ? 'Enviando…' : 'Enviar solicitud'}</button>
    </form>
  )
}
