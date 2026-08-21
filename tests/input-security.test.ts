import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import test from 'node:test'

import {
  InvalidRequestBodyError,
  RequestBodyTooLargeError,
  checkRateLimit,
  getClientAddress,
  isPlainRecord,
  isSameOriginRequest,
  isValidEmail,
  readJsonBody,
  readRequestBody,
  textWithin,
} from '../lib/input-security'

test('lee JSON válido y rechaza contenido vacío, malformado o demasiado grande', async () => {
  const valid = new Request('http://localhost/api', { method: 'POST', body: JSON.stringify({ value: 'ok' }) })
  assert.deepEqual(await readJsonBody(valid, 100), { value: 'ok' })

  const malformed = new Request('http://localhost/api', { method: 'POST', body: '{mal' })
  await assert.rejects(readJsonBody(malformed, 100), InvalidRequestBodyError)

  const empty = new Request('http://localhost/api', { method: 'POST' })
  await assert.rejects(readRequestBody(empty, 100), InvalidRequestBodyError)

  const declaredTooLarge = new Request('http://localhost/api', {
    method: 'POST',
    headers: { 'content-length': '101' },
    body: 'x',
  })
  await assert.rejects(readRequestBody(declaredTooLarge, 100), RequestBodyTooLargeError)

  const streamedTooLarge = new Request('http://localhost/api', { method: 'POST', body: '123456' })
  await assert.rejects(readRequestBody(streamedTooLarge, 5), RequestBodyTooLargeError)
})

test('solo acepta objetos planos', () => {
  assert.equal(isPlainRecord({}), true)
  assert.equal(isPlainRecord(Object.create(null)), true)
  assert.equal(isPlainRecord([]), false)
  assert.equal(isPlainRecord(null), false)
  assert.equal(isPlainRecord('texto'), false)
})

test('valida el origen de las mutaciones', () => {
  assert.equal(isSameOriginRequest(new Request('https://pls.test/api')), true)
  assert.equal(isSameOriginRequest(new Request('https://pls.test/api', { headers: { origin: 'https://pls.test' } })), true)
  assert.equal(isSameOriginRequest(new Request('https://pls.test/api', { headers: { origin: 'https://atacante.test' } })), false)
  assert.equal(isSameOriginRequest(new Request('https://pls.test/api', { headers: { 'sec-fetch-site': 'cross-site' } })), false)
  assert.equal(isSameOriginRequest(new Request('https://pls.test/api', { headers: { origin: '::::' } })), false)
})

test('normaliza la dirección del cliente sin permitir valores ilimitados', () => {
  assert.equal(getClientAddress(new Request('https://pls.test', { headers: { 'x-forwarded-for': '10.0.0.1, 10.0.0.2' } })), '10.0.0.1')
  assert.equal(getClientAddress(new Request('https://pls.test', { headers: { 'x-real-ip': '127.0.0.1' } })), '127.0.0.1')
  assert.equal(getClientAddress(new Request('https://pls.test')), 'unknown')
  assert.equal(getClientAddress(new Request('https://pls.test', { headers: { 'x-forwarded-for': 'x'.repeat(300) } })).length, 128)
})

test('el límite de peticiones bloquea al superar el cupo y aísla cada clave', () => {
  const key = `test:${randomUUID()}`
  assert.deepEqual(checkRateLimit(key, 2, 60_000), { allowed: true, retryAfter: 0 })
  const second = checkRateLimit(key, 2, 60_000)
  assert.equal(second.allowed, true)
  const blocked = checkRateLimit(key, 2, 60_000)
  assert.equal(blocked.allowed, false)
  assert.ok(blocked.retryAfter >= 1)
  assert.equal(checkRateLimit(`${key}:other`, 2, 60_000).allowed, true)
})

test('sanea textos y valida correos con límites', () => {
  assert.equal(textWithin('  Pereira  ', 20, true), 'Pereira')
  assert.equal(textWithin('', 20, true), null)
  assert.equal(textWithin(undefined, 20), '')
  assert.equal(textWithin('12345', 4), null)
  assert.equal(isValidEmail('equipo@pls.test'), true)
  assert.equal(isValidEmail('sin-arroba'), false)
  assert.equal(isValidEmail(`${'a'.repeat(250)}@x.co`), false)
})
