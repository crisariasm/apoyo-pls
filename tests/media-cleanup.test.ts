import assert from 'node:assert/strict'
import test from 'node:test'
import type { Payload } from 'payload'

import { deleteUnreferencedMedia, mediaReferencesFromDocument } from '../lib/media-cleanup'

function fakePayload(referencedIds: string[]) {
  const deleted: string[] = []
  const payload = {
    find: async ({ where }: { where: Record<string, unknown> }) => {
      const condition = where.image || where['evidence.image']
      const id = condition && typeof condition === 'object' && 'equals' in condition ? String(condition.equals) : ''
      return { totalDocs: referencedIds.includes(id) ? 1 : 0 }
    },
    delete: async ({ id }: { id: string }) => {
      deleted.push(id)
      return {}
    },
    logger: { error: () => undefined },
  }
  return { payload: payload as unknown as Payload, deleted }
}

test('extrae imágenes directas y evidencias legadas de un documento', () => {
  const first = '8bb1136f-b97c-4d7a-ac56-94522b3bfad8'
  const second = '8bb1136f-b97c-4d7a-ac56-94522b3bfad9'
  const references = mediaReferencesFromDocument({ image: { id: first }, evidence: [{ image: second }, { image: 'no-id' }] })

  assert.deepEqual(references, [{ id: first }, second, 'no-id'])
})

test('elimina media sin referencias y conserva la que sigue asociada', async () => {
  const orphan = '8bb1136f-b97c-4d7a-ac56-94522b3bfad8'
  const referenced = '8bb1136f-b97c-4d7a-ac56-94522b3bfad9'
  const { payload, deleted } = fakePayload([referenced])

  await deleteUnreferencedMedia(payload, [orphan, referenced])

  assert.deepEqual(deleted, [orphan])
})
