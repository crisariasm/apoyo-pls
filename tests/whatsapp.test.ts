import assert from 'node:assert/strict'
import test from 'node:test'

import { buildWhatsAppUrl, defaultWhatsappCountryCode, isValidWhatsAppNumber, whatsappCountryCodes } from '../lib/whatsapp'

test('WhatsApp usa Colombia como indicativo predeterminado y acepta números formateados', () => {
  assert.equal(defaultWhatsappCountryCode, '+57')
  assert.ok(whatsappCountryCodes.length >= 5)
  assert.equal(isValidWhatsAppNumber(undefined, '300 123 4567'), true)
  const url = buildWhatsAppUrl(undefined, '300 123 4567', 'Transporte solidario')
  assert.match(url, /^https:\/\/wa\.me\/573001234567\?text=/)
  assert.match(decodeURIComponent(url), /Transporte solidario/)
})

test('WhatsApp rechaza valores que no pueden abrir un chat seguro', () => {
  assert.equal(isValidWhatsAppNumber('+57', 'abc'), false)
  assert.equal(isValidWhatsAppNumber('+57', '300 123 4567 ext. 2'), false)
  assert.equal(isValidWhatsAppNumber('+57', '1'), false)
  assert.equal(buildWhatsAppUrl('+57', 'abc', 'Servicio'), '')
})
