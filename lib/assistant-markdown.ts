/**
 * La respuesta del asistente es contenido no confiable. Este analizador la
 * convierte en una estructura cerrada de bloques y fragmentos: nunca produce
 * HTML ni URLs, así que el componente solo puede pintar texto dentro de
 * etiquetas fijas y no hay forma de que la respuesta inyecte marcado.
 */

export type InlineToken = { kind: 'text' | 'strong' | 'emphasis' | 'code'; value: string }

export type MarkdownBlock =
  | { type: 'paragraph'; lines: InlineToken[][] }
  | { type: 'bullets'; items: InlineToken[][] }
  | { type: 'ordered'; items: InlineToken[][]; start: number }

const inlinePattern = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*\n]+\*|_[^_\n]+_)/g
const bulletPattern = /^\s*[-*•]\s+(.*)$/
const orderedPattern = /^\s*(\d{1,3})[.)]\s+(.*)$/

export function parseInline(text: string): InlineToken[] {
  return text.split(inlinePattern).filter(Boolean).map((piece) => {
    if (piece.startsWith('**') && piece.endsWith('**')) return { kind: 'strong' as const, value: piece.slice(2, -2) }
    if (piece.startsWith('`') && piece.endsWith('`')) return { kind: 'code' as const, value: piece.slice(1, -1) }
    if ((piece.startsWith('*') && piece.endsWith('*')) || (piece.startsWith('_') && piece.endsWith('_'))) return { kind: 'emphasis' as const, value: piece.slice(1, -1) }
    return { kind: 'text' as const, value: piece }
  })
}

export function parseAssistantMarkdown(text: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = []
  // Una línea en blanco cierra el bloque abierto: así dos listas seguidas no se
  // funden y los párrafos conservan su separación.
  let openBlock = false
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trimEnd()
    if (!line.trim()) {
      openBlock = false
      continue
    }
    const bullet = line.match(bulletPattern)
    const ordered = bullet ? null : line.match(orderedPattern)
    const previous = openBlock ? blocks[blocks.length - 1] : undefined
    openBlock = true

    if (bullet) {
      const item = parseInline(bullet[1])
      if (previous?.type === 'bullets') previous.items.push(item)
      else blocks.push({ type: 'bullets', items: [item] })
      continue
    }
    if (ordered) {
      const item = parseInline(ordered[2])
      if (previous?.type === 'ordered') previous.items.push(item)
      else blocks.push({ type: 'ordered', items: [item], start: Number(ordered[1]) })
      continue
    }
    const lineTokens = parseInline(line.trim())
    if (previous?.type === 'paragraph') previous.lines.push(lineTokens)
    else blocks.push({ type: 'paragraph', lines: [lineTokens] })
  }
  return blocks
}
