'use client'

import { FormEvent, useEffect, useId, useState } from 'react'

type NeedOfferModalProps = {
  title: string
  zone?: string
  quantity?: string
}

export function NeedOfferModal({ title, zone = 'Pereira', quantity }: NeedOfferModalProps) {
  const [open, setOpen] = useState(false)
  const [state, setState] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [contactName, setContactName] = useState('')
  const [amount, setAmount] = useState('1')
  const [privacyAccepted, setPrivacyAccepted] = useState(false)
  const titleId = useId()

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

  const openModal = () => {
    setState('idle')
    setMessage('')
    setContactName('')
    setAmount('1')
    setPrivacyAccepted(false)
    setOpen(true)
  }

  const closeModal = () => {
    if (state === 'sending') return
    setOpen(false)
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setState('sending')

    const form = new FormData(event.currentTarget)
    const cleanName = contactName.trim()
    const cleanAmount = String(Math.max(1, Math.floor(Number(amount) || 1)))
    const note = String(form.get('message') || '').trim()

    try {
      const response = await fetch('/api/public/support-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestType: 'oferta',
          helpType: 'ofrecer-ayuda',
          category: title,
          zone,
          quantity: cleanAmount,
          description: note || `Tengo ${cleanAmount} de ${title}.`,
          contactName: cleanName,
          contactChannel: 'Formulario Lo tengo',
          privacyAccepted,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'No fue posible enviar el mensaje.')
      setState('success')
      setMessage(data.message || 'El equipo recibió tu disponibilidad.')
    } catch (error) {
      setState('error')
      setMessage(error instanceof Error ? error.message : 'Ocurrió un error. Intenta de nuevo.')
    }
  }

  return (
    <>
      <button className="need-offer-trigger" type="button" onClick={openModal} aria-haspopup="dialog">
        Lo tengo
      </button>

      {open && (
        <div className="need-offer-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && closeModal()}>
          <section className="need-offer-modal" role="dialog" aria-modal="true" aria-labelledby={titleId}>
            <button className="need-offer-close" type="button" onClick={closeModal} aria-label="Cerrar formulario">Cerrar</button>

            {state === 'success' ? (
              <div className="need-offer-success">
                <div className="section-kicker green-text">Mensaje enviado</div>
                <h2>Gracias por sumarte.</h2>
                <p>{message} El equipo revisará la disponibilidad y te contactará.</p>
                <button className="button button-primary" type="button" onClick={closeModal}>Cerrar</button>
              </div>
            ) : (
              <form className="need-offer-form" onSubmit={submit}>
                <div className="section-kicker green-text">Disponibilidad</div>
                <h2 id={titleId}>Tengo este recurso</h2>
                <p className="need-offer-selected"><strong>{title}</strong><span>{zone}{quantity ? ` · Meta: ${quantity}` : ''}</span></p>
                {state === 'error' && <div className="form-error" role="alert">{message}</div>}
                <label>Nombre<input name="contactName" required maxLength={160} value={contactName} onChange={(event) => setContactName(event.currentTarget.value)} placeholder="Tu nombre o el de la organización" autoComplete="name" /></label>
                <label>Cantidad<input name="quantity" type="number" min="1" step="1" value={amount} onChange={(event) => setAmount(event.currentTarget.value === '' ? '' : String(Math.max(1, Math.floor(event.currentTarget.valueAsNumber || 1))))} onBlur={() => setAmount(String(Math.max(1, Math.floor(Number(amount) || 1))))} required inputMode="numeric" /></label>
                <label>Mensaje<textarea name="message" maxLength={5000} placeholder="Cuéntanos cuándo podrías entregarlo." /></label>
                <label className="check-label"><input type="checkbox" name="privacyAccepted" checked={privacyAccepted} onChange={(event) => setPrivacyAccepted(event.currentTarget.checked)} required /> Acepto que el equipo use estos datos para contactarme.</label>
                <button className="button button-primary full-button" type="submit" disabled={state === 'sending' || !privacyAccepted || !contactName.trim() || !amount || Number(amount) < 1}>{state === 'sending' ? 'Enviando…' : 'Enviar mensaje'}</button>
              </form>
            )}
          </section>
        </div>
      )}
    </>
  )
}
