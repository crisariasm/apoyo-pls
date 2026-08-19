'use client'

export default function PayloadAdminError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: '#f8f6f0', color: '#183b36', fontFamily: 'Arial, sans-serif' }}>
      <section style={{ maxWidth: 520, textAlign: 'center', background: '#fffdf9', border: '1px solid #dce4dd', borderRadius: 18, padding: 36, boxShadow: '0 24px 70px rgba(32,57,49,.11)' }}>
        <div style={{ display: 'grid', placeItems: 'center', width: 58, height: 58, margin: '0 auto 20px', borderRadius: 16, background: '#dce8da', fontWeight: 700 }}>PLs</div>
        <p style={{ fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', color: '#4f8c65' }}>Panel de coordinación</p>
        <h1 style={{ fontSize: 30, lineHeight: 1.05, margin: '10px 0 12px' }}>Conecta la base de datos para entrar</h1>
        <p style={{ color: '#627270', lineHeight: 1.55, margin: 0 }}>El panel Payload está configurado, pero necesita una instancia PostgreSQL disponible y la variable DATABASE_URL en el entorno.</p>
        <button onClick={() => reset()} style={{ marginTop: 24, border: 0, borderRadius: 9, padding: '13px 18px', background: '#2f5d50', color: 'white', fontWeight: 700 }}>Reintentar</button>
      </section>
    </main>
  )
}
