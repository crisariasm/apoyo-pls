type PageIntroProps = {
  eyebrow: string
  title: string
  description: string
  tone?: 'green' | 'orange' | 'blue' | 'peach'
}

export function PageIntro({ eyebrow, title, description, tone = 'green' }: PageIntroProps) {
  return (
    <section className={`page-intro page-intro-${tone}`}>
      <div className="page-intro-inner">
        <div className="section-kicker">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
    </section>
  )
}
