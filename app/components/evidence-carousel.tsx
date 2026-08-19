'use client'

import Image from 'next/image'
import { useState } from 'react'

type Evidence = {
  id: string
  image: string
  title: string
  description: string
}

export function EvidenceCarousel({ evidence }: { evidence: Evidence[] }) {
  const [activeIndex, setActiveIndex] = useState(0)
  if (!evidence.length) return null

  const active = evidence[activeIndex]
  const move = (direction: number) => setActiveIndex((current) => (current + direction + evidence.length) % evidence.length)

  return (
    <div className="evidence-carousel">
      <div className="evidence-image"><Image src={active.image} alt="" fill sizes="(max-width: 800px) 100vw, 58vw" /></div>
      <div className="evidence-copy"><div className="evidence-count">Evidencia {activeIndex + 1} de {evidence.length}</div><h3>{active.title}</h3><p>{active.description}</p><div className="evidence-controls"><button type="button" onClick={() => move(-1)} aria-label="Evidencia anterior">Anterior</button><div>{evidence.map((item, index) => <button className={index === activeIndex ? 'active' : ''} type="button" key={item.id} onClick={() => setActiveIndex(index)} aria-label={`Ver evidencia ${index + 1}`} aria-current={index === activeIndex ? 'true' : undefined} />)}</div><button type="button" onClick={() => move(1)} aria-label="Siguiente evidencia">Siguiente</button></div></div>
    </div>
  )
}
