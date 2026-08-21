/** Clave compartida por el asistente y por el cierre de sesión del portal. */
export const assistantStorageKey = 'pls-asistente-equipo'

/** La conversación no debe sobrevivir al cierre de sesión en un equipo compartido. */
export function clearAssistantConversation() {
  try {
    window.sessionStorage.removeItem(assistantStorageKey)
  } catch {
    // Si el navegador bloquea sessionStorage no hay nada que limpiar.
  }
}
