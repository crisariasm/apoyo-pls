import assert from 'node:assert/strict'
import test from 'node:test'

import { isPayloadAdminUser, publicOpenStatusRead, publicStatusRead, publicVisibleRead, roles } from '../lib/access'
import { createR2Key, isR2Enabled } from '../lib/r2-storage'
import { isUUID } from '../lib/uuid'

test('solo admin y super-admin tienen acceso administrativo de Payload', () => {
  assert.equal(isPayloadAdminUser({ req: { user: { role: 'admin' } } }), true)
  assert.equal(isPayloadAdminUser({ req: { user: { role: 'super-admin' } } }), true)
  for (const role of roles.filter((role) => !['admin', 'super-admin'].includes(role))) {
    assert.equal(isPayloadAdminUser({ req: { user: { role } } }), false, role)
  }
  assert.equal(isPayloadAdminUser({ req: { user: null } }), false)
})

test('las lecturas públicas aplican visibilidad y estado', () => {
  const anonymous = { req: { user: null } }
  assert.deepEqual(publicVisibleRead(anonymous as never), { publicVisible: { equals: true } })
  assert.deepEqual(publicStatusRead(anonymous as never), { and: [{ status: { equals: 'publicado' } }, { publicVisible: { equals: true } }] })
  assert.deepEqual(publicOpenStatusRead(anonymous as never), { and: [{ status: { in: ['abierta', 'entregado', 'en-ruta'] } }, { publicVisible: { equals: true } }] })
  assert.equal(publicStatusRead({ req: { user: { role: 'admin' } } } as never), true)
})

test('reconoce únicamente UUID válidos', () => {
  assert.equal(isUUID('8bb1136f-b97c-4d7a-ac56-94522b3bfad8'), true)
  assert.equal(isUUID('00000000-0000-0000-0000-000000000000'), false)
  assert.equal(isUUID('8bb1136f-b97c-1d7a-ac56-94522b3bfad8'), true)
  assert.equal(isUUID('8bb1136f-b97c-9d7a-ac56-94522b3bfad8'), false)
  assert.equal(isUUID('../archivo'), false)
  assert.equal(isUUID(undefined), false)
})

test('R2 solo se activa con configuración completa y genera claves seguras únicas', () => {
  const original = { ...process.env }
  try {
    process.env.R2_ENABLED = 'true'
    delete process.env.R2_ACCESS_KEY_ID
    assert.equal(isR2Enabled(), false)
    process.env.R2_ACCESS_KEY_ID = 'key'
    process.env.R2_SECRET_ACCESS_KEY = 'secret'
    process.env.R2_BUCKET = 'bucket'
    process.env.R2_ENDPOINT = 'http://inseguro.test'
    assert.equal(isR2Enabled(), false)
    process.env.R2_ENDPOINT = 'https://account.r2.cloudflarestorage.com/bucket'
    process.env.R2_PREFIX = '../ media/operación '
    assert.equal(isR2Enabled(), true)
    const first = createR2Key('../../ foto ayuda.webp')
    const second = createR2Key('../../ foto ayuda.webp')
    assert.notEqual(first, second)
    assert.match(first, /^[a-zA-Z0-9._/-]+$/)
    assert.equal(first.includes('..'), false)
    assert.equal(first.includes('\\'), false)
  } finally {
    process.env = original
  }
})
