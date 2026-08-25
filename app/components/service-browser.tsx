'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'

type Service = {
  id: string
  type: string
  typeLabel?: string
  category: string
  title: string
  description: string
  image: string
  provider: string
  location: string
  price: string
  whatsappUrl: string
  featured: boolean
}

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

export function ServiceBrowser({ services }: { services: Service[] }) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('Todas')
  const categories = ['Todas', ...Array.from(new Set(services.map((service) => service.category)))]
  const labels: Record<string, string> = { gratuito: 'Gratuito', ofrecido: 'Ofrecido por la comunidad', necesitado: 'Se necesita' }
  const filteredServices = useMemo(() => {
    const normalizedQuery = normalize(query.trim())
    return services.filter((service) => {
      const matchesCategory = category === 'Todas' || service.category === category
      const searchable = normalize(`${service.title} ${service.description} ${service.provider} ${service.location} ${service.category}`)
      return matchesCategory && (!normalizedQuery || searchable.includes(normalizedQuery))
    })
  }, [category, query, services])

  return (
    <>
      <div className="service-toolbar">
        <label className="service-search" htmlFor="service-search"><span>Buscar servicios</span><input id="service-search" value={query} onChange={(event) => setQuery(event.currentTarget.value)} placeholder="Transporte, mascotas, orientación..." /></label>
        <label className="service-filter-label" htmlFor="service-category">Categoría<select id="service-category" value={category} onChange={(event) => setCategory(event.currentTarget.value)}>{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
      </div>
      <div className={`service-grid${filteredServices.length > 6 ? ' is-scrollable' : ''}`}>
        {filteredServices.map((service) => <article className={`service-card${service.featured ? ' is-featured' : ''}`} key={service.id}>
          <div className="service-card-image">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={service.image} alt={`Imagen de ${service.title}`} />
          </div>
          <div className="service-card-top"><span className={`service-type service-type-${service.type}`}>{service.typeLabel || labels[service.type] || service.type}</span><span>{service.category}</span></div>
          {service.featured && <span className="featured-badge">Destacado</span>}
          <h2>{service.title}</h2>
          <p>{service.description}</p>
          <div className="service-card-meta"><span>{service.provider}</span><span>{service.location}</span><strong>{service.price}</strong></div>
          {service.type === 'necesitado' || !service.whatsappUrl
            ? <Link className="service-action" href={service.type === 'necesitado' ? '/ayudar#formulario-ayuda' : '/solicitar-apoyo#formulario-apoyo'}>{service.type === 'necesitado' ? 'Puedo ayudar' : 'Solicitar servicio'}</Link>
            : <a className="service-action service-action-whatsapp" href={service.whatsappUrl} target="_blank" rel="noreferrer noopener" aria-label={`Solicitar ${service.title} por WhatsApp`}>Solicitar servicio <span aria-hidden="true">↗</span></a>}
        </article>)}
        {!filteredServices.length && <div className="empty-state">No encontramos servicios con esos filtros.</div>}
      </div>
      {filteredServices.length > 6 && <p className="collection-scroll-hint">Desplázate dentro de la lista para consultar más servicios.</p>}
    </>
  )
}
