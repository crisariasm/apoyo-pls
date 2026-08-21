import assert from 'node:assert/strict'
import test from 'node:test'

import {
  isValidPhone,
  isValidQuantity,
  isValidQuantityUnit,
  normalizePhone,
  quantityValue,
  supportQuantityUnitValues,
  validatePublicRequestForm,
  type PublicRequestFormValues,
} from '../lib/public-request-validation'

const validForm: PublicRequestFormValues = {
  helpType: 'ofrecer-ayuda',
  requestType: 'oferta',
  category: 'Cobijas',
  zone: 'Pereira',
  quantity: '20',
  quantityUnit: 'unidades',
  description: 'Tengo cobijas limpias disponibles para entregar.',
  contactName: 'Organización comunitaria',
  phone: '+57 300 123 4567',
  privacyAccepted: true,
}

test('acepta teléfonos colombianos y normaliza separadores', () => {
  for (const phone of ['3001234567', '+57 300 123 4567', '(606) 123-4567', '0034 612 345 678']) {
    assert.equal(isValidPhone(phone), true, phone)
  }
  for (const phone of ['', '123', 'abc3001234567', '+57 300 123 4567 extensión 2', '1'.repeat(21)]) {
    assert.equal(isValidPhone(phone), false, phone)
  }
  assert.equal(normalizePhone(' 00 57 (300) 123-4567 '), '+573001234567')
})

test('valida cantidades enteras dentro del rango y sus unidades', () => {
  for (const quantity of [1, 1_000_000_000, '1', '00020']) assert.equal(isValidQuantity(quantity), true)
  for (const quantity of [0, -1, 1.5, '1.5', '1e3', '', '1000000001', Number.MAX_SAFE_INTEGER]) assert.equal(isValidQuantity(quantity), false)
  assert.equal(quantityValue('20'), 20)
  assert.equal(quantityValue('incorrecta'), null)
  assert.equal(isValidQuantityUnit('kits'), true)
  assert.equal(isValidQuantityUnit('kilogramos-no-configurados'), false)
  assert.ok(supportQuantityUnitValues.length >= 10)
})

test('valida un formulario completo de oferta o solicitud', () => {
  assert.deepEqual(validatePublicRequestForm(validForm), {})
  assert.deepEqual(validatePublicRequestForm({ ...validForm, helpType: 'necesitar-ayuda', requestType: 'recursos' }), {})
  assert.equal(validatePublicRequestForm({ ...validForm, helpType: 'necesitar-ayuda', requestType: 'oferta' }).requestType, 'Selecciona un tipo de solicitud válido.')
})

test('reporta campos obligatorios, longitudes y parejas cantidad/unidad', () => {
  const errors = validatePublicRequestForm({
    helpType: 'ofrecer-ayuda', requestType: 'recursos', category: '', zone: '', quantity: '0', quantityUnit: '',
    description: '', contactName: '', phone: 'abc', privacyAccepted: false,
  })
  assert.deepEqual(Object.keys(errors).sort(), ['category', 'contactName', 'description', 'phone', 'privacyAccepted', 'quantity', 'quantityUnit', 'requestType', 'zone'].sort())

  assert.ok(validatePublicRequestForm({ ...validForm, quantity: '', quantityUnit: 'cajas' }).quantity)
  assert.ok(validatePublicRequestForm({ ...validForm, quantity: '2', quantityUnit: '' }).quantityUnit)
  assert.ok(validatePublicRequestForm({ ...validForm, contactName: 'x'.repeat(161) }).contactName)
  assert.ok(validatePublicRequestForm({ ...validForm, category: 'x'.repeat(121) }).category)
  assert.ok(validatePublicRequestForm({ ...validForm, zone: 'x'.repeat(161) }).zone)
  assert.ok(validatePublicRequestForm({ ...validForm, description: 'x'.repeat(5001) }).description)
})
