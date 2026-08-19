import { Pool, type PoolClient } from 'pg'

function quoteIdentifier(value: string) {
  return `"${value.replace(/"/g, '""')}"`
}

function formatError(error: unknown): string {
  if (error instanceof AggregateError) {
    return error.errors.map((cause) => formatError(cause)).join('\n')
  }
  if (error instanceof Error) return error.message || error.stack || error.name
  return String(error)
}

async function resetDatabase() {
  if (process.env.RESET_DATABASE_CONFIRM !== 'YES') {
    throw new Error('El reset elimina todas las tablas y datos. Define RESET_DATABASE_CONFIRM=YES después de verificar DATABASE_URL y crear un respaldo.')
  }

  const databaseURL = process.env.DATABASE_URL
  if (!databaseURL) throw new Error('Falta DATABASE_URL.')

  const parsedURL = new URL(databaseURL)
  const databaseName = decodeURIComponent(parsedURL.pathname.replace(/^\//, '')) || 'base sin nombre'
  console.log(`Se limpiará la base PostgreSQL "${databaseName}" en ${parsedURL.hostname}:${parsedURL.port || '5432'}.`)

  const pool = new Pool({ connectionString: databaseURL })
  const client: PoolClient = await pool.connect()

  try {
    await client.query('BEGIN')
    await client.query('DROP EXTENSION IF EXISTS pgcrypto CASCADE')
    await client.query(`DROP SCHEMA ${quoteIdentifier('public')} CASCADE`)
    await client.query(`CREATE SCHEMA ${quoteIdentifier('public')}`)
    await client.query(`GRANT ALL ON SCHEMA ${quoteIdentifier('public')} TO PUBLIC`)
    await client.query('CREATE EXTENSION IF NOT EXISTS pgcrypto')
    await client.query('COMMIT')
    console.log('Base de datos vaciada correctamente. Payload puede crear ahora su esquema UUID desde cero.')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

resetDatabase().catch((error) => {
  console.error(formatError(error))
  process.exitCode = 1
})
