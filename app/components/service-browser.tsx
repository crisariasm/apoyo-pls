'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState, type ReactNode } from 'react'

type Service = {
  id: string
  type: string
  typeLabel?: string
  category: string
  title: string
  description: string
  image: string
  provider: string
  city?: string
  serviceMode?: string
  serviceModeLabel?: string
  location: string
  availability?: string
  pricingType?: string
  pricingLabel?: string
  price: string
  whatsappUrl: string
  featured: boolean
}

type CategoryGroup = {
  key: string
  label: string
  shortLabel: string
  icon: string
  tone: string
  matches: (category: string) => boolean
}

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

const categoryGroups: CategoryGroup[] = [
  { key: 'hogar', label: 'Hogar y logística', shortLabel: 'Hogar', icon: 'home', tone: 'sage', matches: (category) => /hogar|aseo|limpieza|almacenamiento|cocina|alimento/.test(category) },
  { key: 'construccion', label: 'Construcción y reparaciones', shortLabel: 'Obras', icon: 'tools', tone: 'peach', matches: (category) => /constru|repar|manten|electric|plomer/.test(category) },
  { key: 'salud', label: 'Salud y cuidado', shortLabel: 'Salud', icon: 'health', tone: 'rose', matches: (category) => /salud|primeros|auxilios|enfermer|cuidado/.test(category) },
  { key: 'mascotas', label: 'Mascotas', shortLabel: 'Mascotas', icon: 'pets', tone: 'yellow', matches: (category) => /mascota|veterin|animal/.test(category) },
  { key: 'orientacion', label: 'Orientación y apoyo', shortLabel: 'Apoyo', icon: 'help', tone: 'lavender', matches: (category) => /orient|clasific|tradu|educa|acompan/.test(category) },
  { key: 'comunicacion', label: 'Comunicación y diseño', shortLabel: 'Diseño', icon: 'design', tone: 'blue', matches: (category) => /comunic|diseno|diseño|marketing|tecnolog/.test(category) },
  { key: 'transporte', label: 'Transporte', shortLabel: 'Transporte', icon: 'transport', tone: 'mint', matches: (category) => /transport|movilidad|conductor/.test(category) },
  { key: 'oficios', label: 'Oficios y trabajo', shortLabel: 'Oficios', icon: 'work', tone: 'orange', matches: (category) => /oficio|trabajo|comercio|belleza|servicio/.test(category) },
]

const pricingOptions = [
  { value: 'todos', label: 'Cualquier tarifa' },
  { value: 'gratis', label: 'Gratis' },
  { value: 'pagado', label: 'De pago' },
  { value: 'negociable', label: 'Negociable' },
  { value: 'intercambio', label: 'Intercambio' },
  { value: 'por-definir', label: 'Por definir' },
]

const modeOptions = [
  { value: 'todos', label: 'Cualquier modalidad' },
  { value: 'presencial', label: 'Presencial' },
  { value: 'domicilio', label: 'A domicilio' },
  { value: 'remoto', label: 'Remoto' },
  { value: 'hibrido', label: 'Híbrido' },
]

function CategoryIcon({ name }: { name: string }) {
  const commonProps = { fill: 'none', stroke: 'currentColor', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, strokeWidth: 1.8 }
  const icons: Record<string, ReactNode> = {
    all: <><rect {...commonProps} x="4" y="4" width="6" height="6" rx="1" /><rect {...commonProps} x="14" y="4" width="6" height="6" rx="1" /><rect {...commonProps} x="4" y="14" width="6" height="6" rx="1" /><rect {...commonProps} x="14" y="14" width="6" height="6" rx="1" /></>,
    home: <><path {...commonProps} d="m3.5 10.5 8.5-7 8.5 7" /><path {...commonProps} d="M5.5 9.2v10h13v-10M9.5 19.2v-5h5v5" /></>,
    tools: <><path {...commonProps} d="M14.7 4.2a4.1 4.1 0 0 0 5 5l-7.8 7.8a2.2 2.2 0 1 1-3.1-3.1l7.8-7.8a4.1 4.1 0 0 0-1.9-1.9Z" /><path {...commonProps} d="m5.3 18.7 2 2" /></>,
    health: <path {...commonProps} d="M10 4h4v6h6v4h-6v6h-4v-6H4v-4h6V4Z" />,
    pets: <><circle {...commonProps} cx="7" cy="8" r="1.5" /><circle {...commonProps} cx="12" cy="6" r="1.5" /><circle {...commonProps} cx="17" cy="8" r="1.5" /><path {...commonProps} d="M12 11.2c-2.5 0-4.3 1.7-4.3 3.8 0 1.5 1 2 2.2 1.7l2.1-.6 2.1.6c1.2.3 2.2-.2 2.2-1.7 0-2.1-1.8-3.8-4.3-3.8Z" /></>,
    help: <><rect {...commonProps} x="4.5" y="5" width="15" height="15" rx="2" /><path {...commonProps} d="M8 5V4a1.5 1.5 0 0 1 1.5-1.5h5A1.5 1.5 0 0 1 16 4v1M8 12l1.5 1.5L12 11M8 16h8" /></>,
    design: <><path {...commonProps} d="m4 17.8-.8 3 3-.8L19 7.2 16.8 5 4 17.8Z" /><path {...commonProps} d="m15.5 6.3 2.2 2.2M5.2 17.9l2.2 2.2" /></>,
    transport: <><path {...commonProps} d="M3.5 7.5h11v8h-11zM14.5 10h3l3 3v2.5h-6z" /><circle {...commonProps} cx="7" cy="17" r="1.8" /><circle {...commonProps} cx="17.5" cy="17" r="1.8" /></>,
    work: <><rect {...commonProps} x="3.5" y="7" width="17" height="12" rx="2" /><path {...commonProps} d="M8.5 7V5.5a1.5 1.5 0 0 1 1.5-1.5h4a1.5 1.5 0 0 1 1.5 1.5V7M3.5 12h17M10 12v2h4v-2" /></>,
    more: <><path {...commonProps} d="M5 7h14M5 12h14M5 17h9" /><path {...commonProps} d="M18 15v5M15.5 17.5h5" /></>,
  }
  return <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">{icons[name] || icons.all}</svg>
}

function categoryGroupFor(category: string) {
  const normalizedCategory = normalize(category)
  return categoryGroups.find((group) => group.matches(normalizedCategory))?.key || 'oficios'
}

function inferredPricingType(service: Service) {
  const price = normalize(service.price)
  if (service.type === 'gratuito' || price.includes('gratis') || price.includes('sin costo')) return 'gratis'
  if (price.includes('convenir') || price.includes('negoci')) return 'negociable'
  if (service.type === 'necesitado' || price.includes('se necesita')) return 'por-definir'
  if (service.pricingType) return service.pricingType
  if (/\$|\d/.test(price)) return 'pagado'
  return 'por-definir'
}

function inferredMode(service: Service) {
  if (service.serviceMode) return service.serviceMode
  const location = normalize(service.location)
  if (location.includes('remoto')) return 'remoto'
  if (location.includes('domicilio')) return 'domicilio'
  return 'presencial'
}

function modeLabel(service: Service) {
  if (service.serviceModeLabel) return service.serviceModeLabel
  return modeOptions.find((option) => option.value === inferredMode(service))?.label || 'Presencial'
}

function pricingLabel(service: Service) {
  if (service.pricingLabel) return service.pricingLabel
  return pricingOptions.find((option) => option.value === inferredPricingType(service))?.label || 'Por definir'
}

function displayPrice(service: Service, pricingType: string) {
  if (pricingType === 'gratis') return 'Sin costo'
  if (normalize(service.price).includes('se necesita')) return 'Por confirmar'
  return service.price || pricingLabel(service)
}

function displayTypeLabel(service: Service) {
  if (service.type === 'gratuito') return 'Gratis'
  if (service.type === 'ofrecido') return 'Disponible'
  if (service.type === 'necesitado') return 'Solicitud de apoyo'
  return service.typeLabel || 'Servicio'
}

function cityLabel(service: Service) {
  return service.city || (normalize(service.location).includes('remoto') ? 'Remoto / toda Colombia' : 'Pereira')
}

export function ServiceBrowser({ services }: { services: Service[] }) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('todos')
  const [city, setCity] = useState('todas')
  const [pricingType, setPricingType] = useState('todos')
  const [categoryModalOpen, setCategoryModalOpen] = useState(false)

  const cities = useMemo(() => ['todas', ...Array.from(new Set(services.map(cityLabel))).sort((a, b) => a.localeCompare(b, 'es'))], [services])
  const categoryCounts = useMemo(() => new Map(categoryGroups.map((group) => [group.key, services.filter((service) => categoryGroupFor(service.category) === group.key).length])), [services])
  const freeCount = services.filter((service) => inferredPricingType(service) === 'gratis').length
  const cityCount = new Set(services.map(cityLabel)).size

  const filteredServices = useMemo(() => {
    const normalizedQuery = normalize(query.trim())
    return services.filter((service) => {
      const serviceCity = cityLabel(service)
      const servicePricingType = inferredPricingType(service)
      const matchesCategory = category === 'todos' || categoryGroupFor(service.category) === category
      const matchesCity = city === 'todas' || serviceCity === city
      const matchesPricing = pricingType === 'todos' || servicePricingType === pricingType
      const searchable = normalize(`${service.title} ${service.description} ${service.provider} ${service.location} ${service.city || ''} ${service.category}`)
      return matchesCategory && matchesCity && matchesPricing && (!normalizedQuery || searchable.includes(normalizedQuery))
    })
  }, [category, city, pricingType, query, services])

  const activeFilters = [category !== 'todos', city !== 'todas', pricingType !== 'todos'].filter(Boolean).length

  useEffect(() => {
    if (!categoryModalOpen) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setCategoryModalOpen(false)
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [categoryModalOpen])

  function clearFilters() {
    setQuery('')
    setCategory('todos')
    setCity('todas')
    setPricingType('todos')
  }

  return (
    <div className="service-browser">
      <div className="service-filter-card">
        <div className="service-toolbar-top">
          <label className="service-search" htmlFor="service-search">
            <span>Busca por palabra clave</span>
            <span className="service-search-input"><span aria-hidden="true">⌕</span><input id="service-search" value={query} onChange={(event) => setQuery(event.currentTarget.value)} placeholder="Ej.: transporte, diseño, mascotas..." /></span>
          </label>
          <div className="service-result-summary"><strong>{filteredServices.length}</strong><span>{filteredServices.length === 1 ? 'servicio encontrado' : 'servicios encontrados'}</span></div>
        </div>
        <div className="service-filter-divider" />
        <div className="service-category-filters" aria-label="Categorías de servicios">
          <span className="service-filter-caption">Ver:</span>
          <button className={`service-category-filter service-category-filter-all${category === 'todos' ? ' is-active' : ''}`} type="button" aria-pressed={category === 'todos'} onClick={() => setCategory('todos')}><span className="service-filter-icon"><CategoryIcon name="all" /></span><span>Todos</span></button>
          {categoryGroups.map((group, index) => {
            const count = categoryCounts.get(group.key) || 0
            const showOnMobile = category === 'todos' ? index < 3 : index < 2 || category === group.key
            return <button className={`service-category-filter service-category-filter-${group.tone}${showOnMobile ? '' : ' is-mobile-hidden'}${category === group.key ? ' is-active' : ''}`} key={group.key} type="button" aria-pressed={category === group.key} onClick={() => setCategory(category === group.key ? 'todos' : group.key)}><span className="service-filter-icon"><CategoryIcon name={group.icon} /></span><span><span className="service-category-label-full">{group.label}</span><span className="service-category-label-mobile">{group.shortLabel}</span></span><small>{count}</small></button>
          })}
          <button className="service-category-more" type="button" onClick={() => setCategoryModalOpen(true)}><span className="service-filter-icon"><CategoryIcon name="more" /></span><span>Ver más</span></button>
        </div>
        <div className="service-select-filters service-select-filters-two">
          <label htmlFor="service-city">Ciudad<select id="service-city" value={city} onChange={(event) => setCity(event.currentTarget.value)}>{cities.map((option) => <option key={option} value={option}>{option === 'todas' ? 'Todas las ciudades' : option}</option>)}</select></label>
          <label htmlFor="service-pricing">Tarifa<select id="service-pricing" value={pricingType} onChange={(event) => setPricingType(event.currentTarget.value)}>{pricingOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        </div>
        <div className="service-filter-footer">
          <span>{activeFilters ? `${activeFilters} filtro${activeFilters === 1 ? '' : 's'} activo${activeFilters === 1 ? '' : 's'}` : 'Todos los servicios disponibles'}</span>
          {activeFilters > 0 || query ? <button type="button" onClick={clearFilters}>Limpiar filtros <span aria-hidden="true">×</span></button> : <span className="service-filter-tip">También puedes buscar por ciudad</span>}
        </div>
      </div>

      <div className="service-list-heading">
        <div><span className="section-kicker orange-text">Directorio vivo</span><h3>Personas listas para ayudar</h3></div>
        <p><strong>{freeCount}</strong> gratuitos · <strong>{cityCount}</strong> ciudades o coberturas</p>
      </div>

      <div className="service-grid">
        {filteredServices.map((service) => {
          const currentCity = cityLabel(service)
          const currentMode = modeLabel(service)
          const currentPricingType = inferredPricingType(service)
          const currentPrice = displayPrice(service, currentPricingType)
          return (
            <article className={`service-card service-card-${service.type}${service.featured ? ' is-featured' : ''}`} key={service.id}>
              <div className="service-card-image">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={service.image} alt={`Imagen de ${service.title}`} />
                <span className="service-card-city">⌖ {currentCity}</span>
              </div>
              <div className="service-card-body">
                <div className="service-card-top"><span className={`service-type service-type-${service.type}`}>{displayTypeLabel(service)}</span><span className="service-card-category">{service.category}</span></div>
                {service.featured && <span className="featured-badge">Recomendado</span>}
                <h2>{service.title}</h2>
                <p className="service-card-description">{service.description}</p>
                <div className="service-card-details">
                  <div><span>Ofrece</span><strong>{service.provider}</strong></div>
                  <div><span>Modalidad</span><strong>{currentMode} · {service.location}</strong></div>
                  <div><span>Disponibilidad</span><strong>{service.availability || 'Consulta disponibilidad'}</strong></div>
                </div>
                <div className="service-card-footer">
                  <div className={`service-price service-price-${currentPricingType}`}><span>{pricingLabel(service)}</span><strong>{currentPrice}</strong></div>
                  {service.type === 'necesitado' || !service.whatsappUrl
                    ? <Link className="service-action" href={service.type === 'necesitado' ? '/ayudar#formulario-ayuda' : '/solicitar-apoyo#formulario-apoyo'}>{service.type === 'necesitado' ? 'Quiero ayudar' : 'Solicitar servicio'} <span aria-hidden="true">→</span></Link>
                    : <a className="service-action service-action-whatsapp" href={service.whatsappUrl} target="_blank" rel="noreferrer noopener" aria-label={`Solicitar ${service.title} por WhatsApp`}>Contactar <span aria-hidden="true">↗</span></a>}
                </div>
              </div>
            </article>
          )
        })}
        {!filteredServices.length && <div className="empty-state service-empty-state"><span aria-hidden="true">⌕</span><strong>No encontramos un servicio con esos filtros.</strong><p>Prueba con otra ciudad, tarifa o palabra clave.</p><button type="button" onClick={clearFilters}>Ver todos los servicios</button></div>}
      </div>

      {categoryModalOpen && <div className="service-category-modal" role="dialog" aria-modal="true" aria-labelledby="service-category-modal-title" onMouseDown={(event) => { if (event.target === event.currentTarget) setCategoryModalOpen(false) }}>
        <div className="service-category-modal-panel">
          <div className="service-category-modal-heading">
            <div><span className="section-kicker green-text">Todas las categorías</span><h3 id="service-category-modal-title">¿Qué servicio estás buscando?</h3><p>Elige una categoría para ver las opciones relacionadas.</p></div>
            <button className="service-category-modal-close" type="button" aria-label="Cerrar categorías" onClick={() => setCategoryModalOpen(false)}>×</button>
          </div>
          <div className="service-category-modal-grid">
            <button className={`service-category-modal-option service-category-filter-all${category === 'todos' ? ' is-active' : ''}`} type="button" aria-pressed={category === 'todos'} onClick={() => { setCategory('todos'); setCategoryModalOpen(false) }}><span className="service-filter-icon"><CategoryIcon name="all" /></span><span><strong>Todos los servicios</strong><small>{services.length} disponibles</small></span><span aria-hidden="true">↗</span></button>
            {categoryGroups.map((group) => {
              const count = categoryCounts.get(group.key) || 0
              return <button className={`service-category-modal-option service-category-${group.tone}${category === group.key ? ' is-active' : ''}`} key={group.key} type="button" aria-pressed={category === group.key} onClick={() => { setCategory(group.key); setCategoryModalOpen(false) }}><span className="service-filter-icon"><CategoryIcon name={group.icon} /></span><span><strong>{group.label}</strong><small>{count} {count === 1 ? 'servicio' : 'servicios'}</small></span><span aria-hidden="true">↗</span></button>
            })}
          </div>
        </div>
      </div>}
    </div>
  )
}
