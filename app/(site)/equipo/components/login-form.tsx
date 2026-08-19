'use client'

import { FormEvent, useState } from 'react'

export function StaffLoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')
    setLoading(true)
    try {
      const response = await fetch('/api/equipo/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await response.json() as { message?: string }
      if (!response.ok) {
        setMessage(data.message || 'No fue posible iniciar la sesión.')
        return
      }
      window.location.assign('/equipo')
    } catch {
      setMessage('No fue posible conectar con el portal. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="staff-login-form" onSubmit={handleSubmit}>
      <label htmlFor="staff-email">Correo del equipo</label>
      <input id="staff-email" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required />
      <label htmlFor="staff-password">Contraseña</label>
      <input id="staff-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
      {message && <p className="staff-login-error" role="alert">{message}</p>}
      <button className="staff-primary-button" type="submit" disabled={loading}>{loading ? 'Ingresando…' : 'Ingresar al portal'}</button>
    </form>
  )
}
