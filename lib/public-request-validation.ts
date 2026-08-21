export const supportQuantityUnits = [
  { label: 'Unidades', value: 'unidades' },
  { label: 'Cajas', value: 'cajas' },
  { label: 'Kits', value: 'kits' },
  { label: 'Paquetes', value: 'paquetes' },
  { label: 'Bultos', value: 'bultos' },
  { label: 'Pares', value: 'pares' },
  { label: 'Pacas', value: 'pacas' },
  { label: 'Canecas', value: 'canecas' },
  { label: 'Litros', value: 'litros' },
  { label: 'Turnos', value: 'turnos' },
  { label: 'Horas', value: 'horas' },
  { label: 'Recorridos', value: 'recorridos' },
  { label: 'Cupos', value: 'cupos' },
  { label: 'Jornadas', value: 'jornadas' },
] as const

export const supportQuantityUnitValues = supportQuantityUnits.map(({ value }) => value)

export function isValidPhone(value: unknown) {
  if (typeof value !== 'string') return false
  const clean = value.trim()
  if (!clean || clean.length > 20 || !/^\+?[0-9\s().-]+$/.test(clean)) return false
  const digits = clean.replace(/\D/g, '')
  return digits.length >= 7 && digits.length <= 15
}

export function normalizePhone(value: string) {
  const clean = value.trim().replace(/[\s().-]/g, '')
  return clean.startsWith('00') ? `+${clean.slice(2)}` : clean
}

export function isValidQuantity(value: unknown) {
  if (typeof value === 'number') return Number.isSafeInteger(value) && value >= 1 && value <= 1_000_000_000
  if (typeof value !== 'string' || !value.trim() || !/^\d+$/.test(value.trim())) return false
  const quantity = Number(value)
  return Number.isSafeInteger(quantity) && quantity >= 1 && quantity <= 1_000_000_000
}

export function quantityValue(value: unknown) {
  if (!isValidQuantity(value)) return null
  return typeof value === 'number' ? value : Number(String(value).trim())
}

export function isValidQuantityUnit(value: unknown) {
  return typeof value === 'string' && supportQuantityUnitValues.includes(value as (typeof supportQuantityUnitValues)[number])
}

export type PublicRequestFormValues = {
  helpType: string
  requestType: string
  category: string
  zone: string
  quantity: string
  quantityUnit: string
  description: string
  contactName: string
  phone: string
  privacyAccepted: boolean
}

export type PublicRequestFormErrors = Partial<Record<keyof PublicRequestFormValues, string>>

export function validatePublicRequestForm(values: PublicRequestFormValues): PublicRequestFormErrors {
  const errors: PublicRequestFormErrors = {}
  const allowedRequestTypes = values.helpType === 'ofrecer-ayuda' ? ['oferta', 'transporte', 'voluntariado'] : ['recursos', 'transporte']

  if (!allowedRequestTypes.includes(values.requestType)) errors.requestType = 'Selecciona un tipo de solicitud válido.'
  if (!values.contactName.trim()) errors.contactName = 'Escribe tu nombre o el de la organización.'
  else if (values.contactName.trim().length > 160) errors.contactName = 'El nombre no puede superar 160 caracteres.'
  if (!values.category.trim()) errors.category = 'Indica qué recurso, servicio o apoyo se necesita.'
  else if (values.category.trim().length > 120) errors.category = 'La categoría no puede superar 120 caracteres.'
  if (!values.zone.trim()) errors.zone = 'Indica la zona o barrio.'
  else if (values.zone.trim().length > 160) errors.zone = 'La zona no puede superar 160 caracteres.'
  if (!values.description.trim()) errors.description = 'Escribe un detalle para que el equipo pueda coordinar.'
  else if (values.description.trim().length > 5000) errors.description = 'El detalle no puede superar 5000 caracteres.'
  if (!isValidPhone(values.phone)) errors.phone = 'Escribe un número de teléfono válido.'

  const hasQuantity = values.quantity.trim() !== ''
  const hasUnit = values.quantityUnit.trim() !== ''
  if (hasQuantity && !isValidQuantity(values.quantity)) errors.quantity = 'La cantidad debe ser un número entero entre 1 y 1.000.000.000.'
  if (hasQuantity && !hasUnit) errors.quantityUnit = 'Selecciona en qué se mide la cantidad.'
  if (!hasQuantity && hasUnit) errors.quantity = 'Indica la cantidad antes de seleccionar una unidad.'
  if (hasUnit && !isValidQuantityUnit(values.quantityUnit)) errors.quantityUnit = 'Selecciona una unidad válida.'
  if (!values.privacyAccepted) errors.privacyAccepted = 'Debes aceptar el aviso de privacidad.'

  return errors
}
