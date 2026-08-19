/* global process, console */

const userAgent = process.env.npm_config_user_agent || ''
const executable = process.env.npm_execpath || ''

if (!userAgent.startsWith('pnpm/') && !executable.includes('pnpm')) {
  console.error('Este proyecto utiliza pnpm exclusivamente. Ejecuta: pnpm install')
  process.exit(1)
}
