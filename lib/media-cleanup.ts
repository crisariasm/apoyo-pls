import type { Payload } from 'payload'

import { isUUID } from './uuid'

type MediaRecord = { id?: unknown; image?: unknown }

function mediaId(value: unknown) {
  if (typeof value === 'string') return isUUID(value) ? value : ''
  if (!value || typeof value !== 'object' || Array.isArray(value)) return ''
  const id = (value as MediaRecord).id
  return typeof id === 'string' && isUUID(id) ? id : ''
}

export function mediaReferencesFromDocument(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return []
  const record = value as MediaRecord & { evidence?: unknown }
  const references = [record.image]
  if (Array.isArray(record.evidence)) {
    references.push(...record.evidence.map((item) => item && typeof item === 'object' && !Array.isArray(item) ? (item as MediaRecord).image : null))
  }
  return references
}

export async function isMediaReferenced(payload: Payload, id: string) {
  const [noticeResult, evidenceResult, distributionResult] = await Promise.all([
    payload.find({ collection: 'community-notices', where: { image: { equals: id } }, depth: 0, limit: 1, overrideAccess: true }),
    payload.find({ collection: 'distribution-evidence', where: { image: { equals: id } }, depth: 0, limit: 1, overrideAccess: true }),
    payload.find({ collection: 'distributions', where: { 'evidence.image': { equals: id } } as never, depth: 0, limit: 1, overrideAccess: true }),
  ])
  return noticeResult.totalDocs > 0 || evidenceResult.totalDocs > 0 || distributionResult.totalDocs > 0
}

export async function deleteUnreferencedMedia(payload: Payload, references: unknown[]) {
  const ids = [...new Set(references.map(mediaId).filter(Boolean))]
  for (const id of ids) {
    try {
      if (await isMediaReferenced(payload, id)) continue
      await payload.delete({ collection: 'media', id, overrideAccess: true, context: { skipAuditLog: true, mediaCleanup: true } })
    } catch (error) {
      payload.logger.error({ err: error, mediaId: id, msg: 'No fue posible limpiar una imagen sin referencias.' })
    }
  }
}
