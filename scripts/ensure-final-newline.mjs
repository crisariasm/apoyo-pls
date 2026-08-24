import { appendFileSync, readFileSync } from 'node:fs'
import process from 'node:process'

const filePath = process.argv[2]

if (!filePath) {
  throw new Error('Debes indicar el archivo que debe terminar con salto de línea.')
}

const contents = readFileSync(filePath)

if (contents.length === 0 || contents[contents.length - 1] !== 0x0a) {
  appendFileSync(filePath, '\n')
}
