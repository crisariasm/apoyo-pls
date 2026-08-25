export const whatsappCountryCodes = [
  { label: '+57 Colombia', value: '+57' },
  { label: '+1 Estados Unidos / Canadá', value: '+1' },
  { label: '+52 México', value: '+52' },
  { label: '+51 Perú', value: '+51' },
  { label: '+54 Argentina', value: '+54' },
  { label: '+56 Chile', value: '+56' },
  { label: '+593 Ecuador', value: '+593' },
  { label: '+58 Venezuela', value: '+58' },
  { label: '+34 España', value: '+34' },
  { label: '+44 Reino Unido', value: '+44' },
  { label: '+49 Alemania', value: '+49' },
  { label: '+33 Francia', value: '+33' },
  { label: '+39 Italia', value: '+39' },
  { label: '+61 Australia', value: '+61' },
] as const

export const whatsappCountryCodeValues = whatsappCountryCodes.map(({ value }) => value)
export const defaultWhatsappCountryCode = '+57'

function digits(value: unknown) {
  return typeof value === 'string' ? value.replace(/\D/g, '') : ''
}

export function isValidWhatsAppNumber(countryCode: unknown, phoneNumber: unknown) {
  const code = typeof countryCode === 'string' && whatsappCountryCodeValues.includes(countryCode as (typeof whatsappCountryCodeValues)[number])
    ? countryCode
    : defaultWhatsappCountryCode
  if (typeof phoneNumber !== 'string' || !phoneNumber.trim() || !/^[0-9\s().-]+$/.test(phoneNumber.trim())) return false
  const localDigits = digits(phoneNumber)
  const fullDigits = `${digits(code)}${localDigits}`
  return localDigits.length >= 6 && localDigits.length <= 12 && fullDigits.length <= 15
}

export function buildWhatsAppUrl(countryCode: unknown, phoneNumber: unknown, serviceTitle: string) {
  if (!isValidWhatsAppNumber(countryCode, phoneNumber)) return ''
  const code = typeof countryCode === 'string' && whatsappCountryCodeValues.includes(countryCode as (typeof whatsappCountryCodeValues)[number])
    ? countryCode
    : defaultWhatsappCountryCode
  const phone = `${digits(code)}${digits(phoneNumber)}`
  const message = `Hola, me interesa solicitar el servicio "${serviceTitle}". ¿Podrías indicarme cómo puedo coordinarlo?`
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
}
