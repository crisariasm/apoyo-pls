'use client'

import { FormEvent, useState } from 'react'

export function SupportForm() {
  const [state, setState] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setState('sending')
    const form = new FormData(event.currentTarget)
    const body = Object.fromEntries(form.entries()) as Record<string, string | boolean>
    body.privacyAccepted = form.get('privacyAccepted') === 'on'

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

  if (state === 'success') return <div className="success-state form-success"><div className="form-success-label">Solicitud recibida</div><h2>Información recibida</h2><p>{message} El equipo la revisará y te contactará por el canal indicado.</p></div>

  return (
    <form className="form-card" onSubmit={submit}>
      <div className="section-kicker orange-text">Formulario de apoyo</div>
      <h2>Cuéntanos qué se necesita</h2>
      <p className="modal-intro">Trabajamos por zona y necesidad general. No registres nombres de menores ni datos sensibles.</p>
      {state === 'error' && <div className="form-error" role="alert">{message}</div>}
      <input type="hidden" name="helpType" value="necesitar-ayuda" />
      <label>Tipo de solicitud<select name="requestType" required defaultValue="recursos"><option value="recursos">Solicitar recursos</option><option value="transporte">Solicitar transporte</option></select></label>
      <label>Nombre de contacto<input name="contactName" required maxLength={160} placeholder="Tu nombre o el de la organización" /></label>
      <label>Categoría<input name="category" required maxLength={120} placeholder="Agua, alimentos, aseo..." /></label>
      <label>Zona o barrio<input name="zone" required maxLength={160} placeholder="Ej. La Florida" /></label>
      <label>Cantidad aproximada<input name="quantity" maxLength={80} placeholder="Ej. 20 kits" /></label>
      <label>Detalle<textarea name="description" required maxLength={5000} placeholder="¿Qué se necesita y para cuándo?" /></label>
      <label>Canal de contacto<input name="contactChannel" required maxLength={200} placeholder="WhatsApp o correo" /></label>
      <label className="check-label"><input type="checkbox" name="privacyAccepted" required /> Acepto el aviso de privacidad.</label>
      <button className="button button-primary full-button" type="submit" disabled={state === 'sending'}>{state === 'sending' ? 'Enviando…' : 'Enviar solicitud'}</button>
    </form>
  )
}
