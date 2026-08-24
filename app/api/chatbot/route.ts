import { NextResponse } from 'next/server'

import { ASSISTANT_CONVERSATION_PATTERN, ASSISTANT_MAX_HISTORY_MESSAGES, ASSISTANT_MAX_MESSAGE_LENGTH, askAssistant, readAssistantDocument, sanitizeAssistantHistory, type AssistantContext } from '../../../lib/chatbot'
import { checkRateLimit, getClientAddress, isPlainRecord, isSameOriginRequest, readJsonBody, textWithin } from '../../../lib/input-security'
import { getDashboardRoleLabel, getStaffSession, isPortalAdministrator } from '../../../lib/staff-portal-auth'
import { getModulesForRole } from '../../../lib/staff-portal-config'

export const dynamic = 'force-dynamic'

// El historial completo viaja en cada pregunta: 20 turnos de 1.000 caracteres
// más el envoltorio JSON entran de sobra en este límite.
const MAX_CHATBOT_BODY_BYTES = 64 * 1024
const RATE_LIMIT_PER_USER = 15
const RATE_LIMIT_PER_ADDRESS = 40
const RATE_LIMIT_WINDOW_MS = 60 * 1000
const noStore = { 'Cache-Control': 'no-store' }

function tooManyRequests(retryAfter: number) {
  return NextResponse.json(
    { message: 'Estás enviando demasiadas preguntas seguidas. Espera un momento e intenta de nuevo.' },
    { status: 429, headers: { ...noStore, 'Retry-After': String(retryAfter) } },
  )
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ message: 'Origen de solicitud no permitido.' }, { status: 403, headers: noStore })

  const session = await getStaffSession(request.headers)
  if (!session) return NextResponse.json({ message: 'Necesitas una sesión operativa para usar el asistente.' }, { status: 401, headers: noStore })

  // Por usuario para el uso normal y por dirección para que varias cuentas
  // desde el mismo origen no multipliquen el gasto del modelo.
  const userRate = checkRateLimit(`chatbot:user:${session.user.id}`, RATE_LIMIT_PER_USER, RATE_LIMIT_WINDOW_MS)
  if (!userRate.allowed) return tooManyRequests(userRate.retryAfter)
  const addressRate = checkRateLimit(`chatbot:ip:${getClientAddress(request)}`, RATE_LIMIT_PER_ADDRESS, RATE_LIMIT_WINDOW_MS)
  if (!addressRate.allowed) return tooManyRequests(addressRate.retryAfter)

  let body: Record<string, unknown>
  try {
    body = await readJsonBody<Record<string, unknown>>(request, MAX_CHATBOT_BODY_BYTES)
  } catch {
    return NextResponse.json({ message: 'El contenido enviado no es válido o supera el límite permitido.' }, { status: 400, headers: noStore })
  }
  if (!isPlainRecord(body)) return NextResponse.json({ message: 'El contenido enviado no es válido.' }, { status: 400, headers: noStore })

  const message = textWithin(body.message, ASSISTANT_MAX_MESSAGE_LENGTH, true)
  if (!message) return NextResponse.json({ message: 'Escribe una pregunta para el asistente.' }, { status: 400, headers: noStore })

  const conversationId = typeof body.conversationId === 'string' && ASSISTANT_CONVERSATION_PATTERN.test(body.conversationId) ? body.conversationId : null
  if (!conversationId) return NextResponse.json({ message: 'La conversación no es válida. Vuelve a abrir el asistente.' }, { status: 400, headers: noStore })

  const history = sanitizeAssistantHistory(body.history)
  const lastTurn = history[history.length - 1]
  const alreadyAsked = lastTurn?.role === 'user' && lastTurn.content === message
  const messages = (alreadyAsked ? history : [...history, { role: 'user' as const, content: message }]).slice(-ASSISTANT_MAX_HISTORY_MESSAGES)

  // Identidad, rol y permisos salen de la sesión del servidor, nunca del cuerpo
  // de la petición: el cliente no puede declarar quién es ni qué puede hacer.
  const page = textWithin(body.page, 160)
  const context: AssistantContext = {
    area: 'equipo',
    userId: session.user.id,
    userName: session.user.name,
    role: session.user.role,
    roleLabel: getDashboardRoleLabel(session.user.role),
    seesAllRecords: isPortalAdministrator(session.user),
    modules: getModulesForRole(session.user.role).map((module) => ({
      slug: module.slug,
      label: module.label,
      description: module.description,
      canCreate: module.canCreate !== false,
      canDelete: module.canDelete !== false,
    })),
    ...(page ? { page } : {}),
  }

  const result = await askAssistant({
    document: await readAssistantDocument(),
    messages,
    message,
    sessionId: `${session.user.id}:${conversationId}`,
    context,
  })

  if (!result.ok) return NextResponse.json({ message: result.message }, { status: result.status, headers: noStore })
  return NextResponse.json({ message: result.message }, { headers: noStore })
}
