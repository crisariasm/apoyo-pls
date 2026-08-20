import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'

import { isPlainRecord } from './input-security'

// Los proveedores gratuitos pueden tardar más de 20 s en responder.
const DEFAULT_TIMEOUT_MS = 45 * 1000
const MIN_TIMEOUT_MS = 3 * 1000
const MAX_TIMEOUT_MS = 60 * 1000
const MAX_RESPONSE_BYTES = 256 * 1024
const MAX_REPLY_LENGTH = 6000
const replyKeys = ['message', 'output', 'text', 'reply', 'answer', 'response', 'content', 'result']
const wrapperKeys = ['data', 'json', 'body', 'payload', 'choices']

export const ASSISTANT_MAX_MESSAGE_LENGTH = 1000
export const ASSISTANT_MAX_HISTORY_MESSAGES = 20
export const ASSISTANT_CONVERSATION_PATTERN = /^[A-Za-z0-9_-]{8,64}$/

export type AssistantTurn = { role: 'user' | 'assistant'; content: string }

export type AssistantModule = {
  slug: string
  label: string
  description: string
  canCreate: boolean
  canDelete: boolean
}

export type AssistantContext = {
  area: 'equipo'
  userId: string
  userName: string
  role: string
  roleLabel: string
  seesAllRecords: boolean
  modules: AssistantModule[]
  page?: string
}

export type AssistantAskInput = {
  document: string
  messages: AssistantTurn[]
  message: string
  sessionId: string
  context: AssistantContext
}

export type AssistantAskResult = { ok: true; message: string } | { ok: false; status: number; message: string }

/**
 * La conversación vive en el navegador, así que llega sin garantías: se descartan
 * los turnos con rol inventado (incluido `system`, que solo puede poner el flujo),
 * el contenido que no sea texto, y se recorta longitud y cantidad.
 */
export function sanitizeAssistantHistory(value: unknown): AssistantTurn[] {
  if (!Array.isArray(value)) return []
  const turns: AssistantTurn[] = []
  for (const item of value) {
    if (!isPlainRecord(item)) continue
    if (item.role !== 'user' && item.role !== 'assistant') continue
    if (typeof item.content !== 'string') continue
    const content = item.content.trim().slice(0, ASSISTANT_MAX_MESSAGE_LENGTH)
    if (content) turns.push({ role: item.role, content })
  }
  return turns.slice(-ASSISTANT_MAX_HISTORY_MESSAGES)
}

/**
 * Registro para el servidor. Solo códigos y estados: nunca el token, el
 * documento, la pregunta ni la respuesta, que pueden traer información
 * operativa o datos de contacto.
 */
function logAssistantIssue(reason: string, detail?: Record<string, string | number>) {
  console.error('[asistente]', reason, detail ? JSON.stringify(detail) : '')
}

const DOCUMENT_PATH = path.join(process.cwd(), 'docs', 'contexto-asistente.md')
let documentCache: { mtimeMs: number; size: number; content: string } | null = null

/**
 * El conocimiento del asistente es el documento del repositorio, no una copia
 * pegada en n8n: se envía en cada pregunta para que siempre viaje la versión
 * vigente. Se relee solo cuando el archivo cambia.
 */
export async function readAssistantDocument() {
  try {
    const info = await stat(DOCUMENT_PATH)
    if (documentCache && documentCache.mtimeMs === info.mtimeMs && documentCache.size === info.size) return documentCache.content
    const content = await readFile(DOCUMENT_PATH, 'utf8')
    documentCache = { mtimeMs: info.mtimeMs, size: info.size, content }
    return content
  } catch {
    logAssistantIssue('documento-no-disponible', { ruta: DOCUMENT_PATH })
    return ''
  }
}

/** El token viaja en esta llamada, así que fuera de desarrollo solo se acepta HTTPS. */
export function getChatbotWebhookUrl() {
  const value = process.env.N8N_CHATBOT_WEBHOOK_URL?.trim()
  if (!value) return null
  let url: URL
  try {
    url = new URL(value)
  } catch {
    logAssistantIssue('webhook-url-invalida')
    return null
  }
  if (url.protocol === 'https:') return url.toString()
  const isLocal = url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '::1'
  if (url.protocol === 'http:' && (isLocal || process.env.NODE_ENV !== 'production')) return url.toString()
  logAssistantIssue('webhook-sin-https')
  return null
}

function getAuthHeaderName() {
  const name = process.env.N8N_CHATBOT_AUTH_HEADER?.trim()
  return name && /^[A-Za-z0-9-]+$/.test(name) ? name : 'Authorization'
}

function getTimeoutMs() {
  const configured = Number.parseInt(process.env.N8N_CHATBOT_TIMEOUT_MS || '', 10)
  if (!Number.isFinite(configured)) return DEFAULT_TIMEOUT_MS
  return Math.min(Math.max(configured, MIN_TIMEOUT_MS), MAX_TIMEOUT_MS)
}

function extractMessage(value: unknown, depth = 0): string {
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (!value || depth > 5) return ''
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = extractMessage(item, depth + 1)
      if (found) return found
    }
    return ''
  }
  if (typeof value !== 'object') return ''
  const record = value as Record<string, unknown>
  for (const key of [...replyKeys, ...wrapperKeys]) {
    if (!(key in record)) continue
    const found = extractMessage(record[key], depth + 1)
    if (found) return found
  }
  return ''
}

export function normalizeAssistantReply(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return ''
  const looksJson = trimmed.startsWith('{') || trimmed.startsWith('[')
  let message = ''
  if (looksJson) {
    try {
      message = extractMessage(JSON.parse(trimmed))
    } catch {
      message = ''
    }
  } else {
    message = trimmed
  }
  return message.length > MAX_REPLY_LENGTH ? `${message.slice(0, MAX_REPLY_LENGTH)}…` : message
}

/**
 * Lee el cuerpo cortando en cuanto supera el límite, para que una respuesta
 * enorme del webhook no se cargue entera en memoria antes de rechazarla.
 */
async function readBoundedText(response: Response, maxBytes: number): Promise<string | null> {
  if (!response.body) {
    const text = await response.text()
    return new TextEncoder().encode(text).byteLength > maxBytes ? null : text
  }
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let text = ''
  let bytes = 0
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      if (!value) continue
      bytes += value.byteLength
      if (bytes > maxBytes) {
        await reader.cancel()
        return null
      }
      text += decoder.decode(value, { stream: true })
    }
    return text + decoder.decode()
  } finally {
    reader.releaseLock()
  }
}

export async function askAssistant(input: AssistantAskInput): Promise<AssistantAskResult> {
  const webhookUrl = getChatbotWebhookUrl()
  if (!webhookUrl) return { ok: false, status: 503, message: 'El asistente todavía no está conectado. Avisa al equipo de administración del centro.' }

  const headers: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json, text/plain;q=0.9' }
  const token = process.env.N8N_CHATBOT_TOKEN?.trim()
  if (token) headers[getAuthHeaderName()] = token

  let response: Response
  try {
    response = await fetch(webhookUrl, { method: 'POST', headers, body: JSON.stringify(input), cache: 'no-store', signal: AbortSignal.timeout(getTimeoutMs()) })
  } catch (error) {
    const timedOut = error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')
    logAssistantIssue(timedOut ? 'webhook-timeout' : 'webhook-inalcanzable')
    return timedOut
      ? { ok: false, status: 504, message: 'El asistente tardó demasiado en responder. Intenta de nuevo.' }
      : { ok: false, status: 502, message: 'No fue posible conectar con el asistente en este momento. Intenta de nuevo en unos minutos.' }
  }

  if (response.status === 401 || response.status === 403) {
    logAssistantIssue('webhook-credencial-rechazada', { estado: response.status })
    return { ok: false, status: 502, message: 'El asistente rechazó la credencial del portal. Avisa al equipo de administración.' }
  }
  if (!response.ok) {
    logAssistantIssue('webhook-respuesta-fallida', { estado: response.status })
    return { ok: false, status: 502, message: 'El asistente no está disponible en este momento. Intenta de nuevo más tarde.' }
  }

  let raw: string | null
  try {
    raw = await readBoundedText(response, MAX_RESPONSE_BYTES)
  } catch {
    logAssistantIssue('webhook-cuerpo-ilegible')
    return { ok: false, status: 502, message: 'La respuesta del asistente no pudo leerse. Intenta de nuevo.' }
  }
  if (raw === null) {
    logAssistantIssue('webhook-respuesta-demasiado-grande')
    return { ok: false, status: 502, message: 'La respuesta del asistente superó el tamaño permitido.' }
  }

  const message = normalizeAssistantReply(raw)
  if (!message) {
    logAssistantIssue('webhook-respuesta-vacia')
    return { ok: false, status: 502, message: 'El asistente respondió sin contenido. Intenta reformular tu pregunta.' }
  }
  return { ok: true, message }
}
