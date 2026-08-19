'use client'

import { FormEvent, useState } from 'react'

export function HelpForm() {
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
    <form className="form-card" onSubmit={submit}>
      <div className="section-kicker green-text">Quiero ayudar</div>
      <h2>Cuéntanos cómo puedes ayudar</h2>
      <p className="modal-intro">Un solo formulario para ofrecer recursos, transporte o tu tiempo.</p>
      {state === 'error' && <div className="form-error" role="alert">{message}</div>}
      <input type="hidden" name="helpType" value="ofrecer-ayuda" />
      <label>Tipo de ayuda<select name="requestType" required defaultValue="oferta"><option value="oferta">Ofrecer recursos</option><option value="transporte">Ofrecer transporte</option><option value="voluntariado">Ofrecer tiempo o conocimientos</option></select></label>
      <label>Nombre de contacto<input name="contactName" required maxLength={160} placeholder="Tu nombre o el de la organización" /></label>
      <label>Qué puedes aportar<input name="category" required maxLength={120} placeholder="Cobijas, alimentos, transporte, clasificación..." /></label>
      <label>Zona donde puedes ayudar<input name="zone" required maxLength={160} placeholder="Pereira, Dosquebradas..." /></label>
      <label>Cantidad aproximada<input name="quantity" maxLength={80} placeholder="Ej. 20 cobijas" /></label>
      <label>Detalle<textarea name="description" required maxLength={5000} placeholder="Cuéntanos qué tienes disponible, qué sabes hacer y cuándo" /></label>
      <label>Canal de contacto<input name="contactChannel" required maxLength={200} placeholder="WhatsApp o correo" /></label>
      <label className="check-label"><input type="checkbox" name="privacyAccepted" required /> Acepto que PLs al llamado use estos datos para contactarme.</label>
      <button className="button button-primary full-button" type="submit" disabled={state === 'sending'}>{state === 'sending' ? 'Enviando…' : 'Enviar oferta'}</button>
    </form>
  )
}
