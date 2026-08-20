'use client'

import { FormEvent, KeyboardEvent, useCallback, useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'

import { AssistantMascot } from './assistant-mascot'
import { AssistantRichText } from './assistant-rich-text'
import { assistantStorageKey } from './assistant-storage'

type AssistantMessage = { id: string; role: 'user' | 'assistant'; text: string }

type StoredConversation = { conversationId: string; messages: AssistantMessage[]; open: boolean }

const MAX_MESSAGE_LENGTH = 1000
const MAX_STORED_MESSAGES = 60
const MAX_HISTORY_MESSAGES = 20

const quickPrompts = [
  { label: 'Registrar una ayuda', prompt: '¿Cómo registro una ayuda recibida en el centro?' },
  { label: 'Actualizar inventario', prompt: '¿Cómo actualizo la cantidad y el estado de un recurso en el inventario?' },
  { label: 'Publicar una necesidad', prompt: '¿Cómo registro una necesidad y cómo le cambio la prioridad?' },
  { label: 'Registrar distribución', prompt: '¿Cómo registro una distribución y cómo actualizo su estado?' },
]

function createId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return `c-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
}

function isAssistantMessage(value: unknown): value is AssistantMessage {
  if (!value || typeof value !== 'object') return false
  const message = value as Record<string, unknown>
  return typeof message.id === 'string' && typeof message.text === 'string' && (message.role === 'user' || message.role === 'assistant')
}

function readStoredConversation(): StoredConversation | null {
  try {
    const raw = window.sessionStorage.getItem(assistantStorageKey)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<StoredConversation>
    if (typeof parsed?.conversationId !== 'string' || !Array.isArray(parsed.messages)) return null
    return { conversationId: parsed.conversationId, messages: parsed.messages.filter(isAssistantMessage), open: parsed.open === true }
  } catch {
    return null
  }
}

export function AssistantWidget({ name }: { name: string }) {
  const pathname = usePathname()
  const firstName = name.trim().split(' ')[0]
  const [ready, setReady] = useState(false)
  const [open, setOpen] = useState(false)
  const [conversationId, setConversationId] = useState('')
  const [messages, setMessages] = useState<AssistantMessage[]>([])
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [lastAttempt, setLastAttempt] = useState('')
  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  const historyRef = useRef<HTMLDivElement | null>(null)
  const launcherRef = useRef<HTMLButtonElement | null>(null)
  // El estado de React se actualiza de forma asíncrona: sin este cerrojo dos
  // pulsaciones seguidas de Enter llegan a enviar la misma pregunta dos veces.
  const sendingRef = useRef(false)
  const requestRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const stored = readStoredConversation()
    setConversationId(stored?.conversationId || createId())
    setMessages(stored?.messages || [])
    setOpen(stored?.open || false)
    setReady(true)
  }, [])

  useEffect(() => () => requestRef.current?.abort(), [])

  useEffect(() => {
    if (!ready || !conversationId) return
    try {
      window.sessionStorage.setItem(assistantStorageKey, JSON.stringify({ conversationId, messages: messages.slice(-MAX_STORED_MESSAGES), open }))
    } catch {
      // El historial es opcional: si el navegador bloquea sessionStorage la conversación continúa solo en memoria.
    }
  }, [conversationId, messages, open, ready])

  useEffect(() => {
    if (!open) return
    historyRef.current?.scrollTo({ top: historyRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading, open])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key !== 'Escape') return
      setOpen(false)
      launcherRef.current?.focus()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

  const send = useCallback(async (text: string, options?: { resend?: boolean }) => {
    const question = text.trim().slice(0, MAX_MESSAGE_LENGTH)
    if (!question || sendingRef.current || !conversationId) return
    sendingRef.current = true
    // Al reintentar, la pregunta ya está en el historial y no debe repetirse.
    const conversation = options?.resend === true ? messages : [...messages, { id: createId(), role: 'user' as const, text: question }]
    const controller = new AbortController()
    requestRef.current = controller
    setError('')
    setLastAttempt(question)
    setDraft('')
    setMessages(conversation)
    setLoading(true)
    try {
      const response = await fetch('/api/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          message: question,
          history: conversation.slice(-MAX_HISTORY_MESSAGES).map((item) => ({ role: item.role, content: item.text })),
          conversationId,
          page: pathname,
        }),
      })
      const data = (await response.json().catch(() => null)) as { message?: string } | null
      if (!response.ok || typeof data?.message !== 'string') {
        setError(typeof data?.message === 'string' ? data.message : 'El asistente no está disponible en este momento. Intenta de nuevo.')
        return
      }
      setMessages([...conversation, { id: createId(), role: 'assistant', text: data.message }])
    } catch (fetchError) {
      // Una conversación nueva o salir de la página cancelan la petición a propósito.
      if (fetchError instanceof DOMException && fetchError.name === 'AbortError') return
      setError('No pudimos conectar con el asistente. Revisa tu conexión e intenta de nuevo.')
    } finally {
      if (requestRef.current === controller) requestRef.current = null
      sendingRef.current = false
      setLoading(false)
    }
  }, [conversationId, messages, pathname])

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void send(draft)
  }

  function onInputKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== 'Enter' || event.shiftKey) return
    event.preventDefault()
    void send(draft)
  }

  function minimize() {
    setOpen(false)
    launcherRef.current?.focus()
  }

  function clearConversation() {
    requestRef.current?.abort()
    requestRef.current = null
    sendingRef.current = false
    setLoading(false)
    setMessages([])
    setError('')
    setLastAttempt('')
    setConversationId(createId())
    inputRef.current?.focus()
  }

  if (!ready) return null

  return (
    <div className={`staff-assistant${open ? ' is-open' : ''}`}>
      {open && (
        <section className="staff-assistant-panel" id="staff-assistant-panel" role="dialog" aria-label="Asistente del Centro de Acopio">
          <header className="staff-assistant-header">
            <span className="staff-assistant-avatar" aria-hidden="true">🤖</span>
            <span className="staff-assistant-title"><strong>Asistente del Centro</strong><small>{loading ? 'Escribiendo…' : 'Información y procesos del centro de acopio'}</small></span>
            {messages.length > 0 && <button className="staff-assistant-icon" type="button" onClick={clearConversation} aria-label="Empezar una conversación nueva" title="Nueva conversación">⟳</button>}
            <button className="staff-assistant-icon" type="button" onClick={minimize} aria-label="Minimizar asistente" title="Minimizar">−</button>
          </header>
          <div className="staff-assistant-history" ref={historyRef} aria-live="polite">
            <div className="staff-assistant-intro">
              <p><strong>Hola, {firstName} 👋</strong></p>
              <p>¿En qué puedo ayudarte? Pregúntame por los procesos y la información del centro de acopio: recursos, necesidades, distribuciones, comunicados, servicios, boletín y voluntariado.</p>
            </div>
            {messages.length === 0 && (
              <div className="staff-assistant-quick">
                {quickPrompts.map((item) => <button className="staff-assistant-chip" type="button" key={item.label} onClick={() => void send(item.prompt)}>{item.label}</button>)}
              </div>
            )}
            {messages.map((message) => <div className={`staff-assistant-message is-${message.role}`} key={message.id}>{message.role === 'assistant' ? <AssistantRichText text={message.text} /> : message.text}</div>)}
            {loading && <div className="staff-assistant-message is-assistant is-typing" aria-label="El asistente está escribiendo"><i /><i /><i /></div>}
            {error && (
              <div className="staff-assistant-error" role="alert">
                <span>{error}</span>
                {lastAttempt && <button type="button" disabled={loading} onClick={() => void send(lastAttempt, { resend: true })}>Reintentar</button>}
              </div>
            )}
          </div>
          <form className="staff-assistant-form" onSubmit={onSubmit}>
            <label className="staff-assistant-label" htmlFor="staff-assistant-input">Escribe tu pregunta</label>
            <textarea
              id="staff-assistant-input"
              ref={inputRef}
              value={draft}
              rows={1}
              maxLength={MAX_MESSAGE_LENGTH}
              placeholder="Escribe tu pregunta…"
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={onInputKeyDown}
            />
            <button className="staff-assistant-send" type="submit" disabled={loading || !draft.trim()} aria-label="Enviar pregunta">➤</button>
          </form>
        </section>
      )}
      <button
        className="staff-assistant-launcher"
        type="button"
        ref={launcherRef}
        aria-expanded={open}
        {...(open ? { 'aria-controls': 'staff-assistant-panel' } : {})}
        aria-label={open ? 'Minimizar el asistente del centro' : 'Abrir el asistente del centro'}
        onClick={() => setOpen((value) => !value)}
      >
        <AssistantMascot state={loading ? 'asking' : 'idle'} />
        <span className="staff-assistant-hint" aria-hidden="true">{open ? 'Minimizar' : '¿Te ayudo?'}</span>
      </button>
    </div>
  )
}
