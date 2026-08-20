import { Fragment } from 'react'

import { parseAssistantMarkdown, type InlineToken } from '../../../../lib/assistant-markdown'

/**
 * Pinta la respuesta del asistente. Solo recibe fragmentos ya analizados y los
 * coloca como texto dentro de etiquetas fijas: no hay HTML, ni enlaces, ni
 * atributos derivados del contenido, así que la respuesta no puede inyectar
 * marcado ni esquemas peligrosos.
 */
function Inline({ tokens, keyPrefix }: { tokens: InlineToken[]; keyPrefix: string }) {
  return <>{tokens.map((token, index) => {
    const key = `${keyPrefix}-${index}`
    if (token.kind === 'strong') return <strong key={key}>{token.value}</strong>
    if (token.kind === 'code') return <code key={key}>{token.value}</code>
    if (token.kind === 'emphasis') return <em key={key}>{token.value}</em>
    return <Fragment key={key}>{token.value}</Fragment>
  })}</>
}

export function AssistantRichText({ text }: { text: string }) {
  const blocks = parseAssistantMarkdown(text)
  if (!blocks.length) return <>{text}</>
  return <>{blocks.map((block, blockIndex) => {
    const key = `b${blockIndex}`
    if (block.type === 'paragraph') {
      return <p key={key}>{block.lines.map((tokens, lineIndex) => (
        <Fragment key={`${key}-${lineIndex}`}>{lineIndex > 0 && <br />}<Inline tokens={tokens} keyPrefix={`${key}-${lineIndex}`} /></Fragment>
      ))}</p>
    }
    const items = block.items.map((tokens, itemIndex) => <li key={`${key}-${itemIndex}`}><Inline tokens={tokens} keyPrefix={`${key}-${itemIndex}`} /></li>)
    if (block.type === 'bullets') return <ul key={key}>{items}</ul>
    return <ol key={key} start={block.start > 1 ? block.start : undefined}>{items}</ol>
  })}</>
}
