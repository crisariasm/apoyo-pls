import assert from 'node:assert/strict'
import test from 'node:test'

import { getPortalModule } from '../lib/staff-portal-config'
import { sanitizePortalRecord, sanitizePortalRecords } from '../lib/portal-response'

test('las respuestas del portal no devuelven secretos ni metadatos de R2', () => {
  const module = getPortalModule('evidencias')!
  const result = sanitizePortalRecord(module, {
    id: 'registro-1',
    title: 'Entrega',
    image: {
      id: 'media-1',
      url: '/api/media/media-1',
      filename: 'entrega.webp',
      r2Key: 'media/secreto.webp',
      uploadedByUserId: 'usuario-privado',
      password: 'no debe salir',
    },
    registeredBy: 'Equipo',
    registeredByUserId: 'usuario-privado',
    updatedBy: 'Otra persona',
    hash: 'hash-privado',
    sessions: [{ token: 'token-privado' }],
    unexpectedField: 'no debe salir',
  })

  assert.deepEqual(result, {
    id: 'registro-1',
    title: 'Entrega',
    image: { id: 'media-1', url: '/api/media/media-1', filename: 'entrega.webp' },
    registeredBy: 'Equipo',
    updatedBy: 'Otra persona',
  })
})

test('el saneamiento conserva los datos privados necesarios para Solicitudes', () => {
  const module = getPortalModule('administracion')!
  const [result] = sanitizePortalRecords(module, [{
    id: 'solicitud-1',
    requestType: 'recursos',
    contactName: 'Persona solicitante',
    phone: '3001234567',
    internalNotes: 'Seguimiento interno',
    password: 'nunca',
  }])

  assert.equal(result.contactName, 'Persona solicitante')
  assert.equal(result.phone, '3001234567')
  assert.equal(result.internalNotes, 'Seguimiento interno')
  assert.equal('password' in result, false)
})
