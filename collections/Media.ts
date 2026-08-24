import type { CollectionConfig } from 'payload'

import { readFile } from 'node:fs/promises'

import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, CollectionBeforeChangeHook } from 'payload'

import { isPayloadAdminUser } from '../lib/access'
import { optimizeImage } from '../lib/image-processing'
import { createR2Key, deleteR2Object, isR2Enabled, putR2Object } from '../lib/r2-storage'

type UploadedFile = { data?: Buffer; mimetype?: string; name?: string; tempFilePath?: string }
type MediaData = Record<string, unknown>

const uploadToR2: CollectionBeforeChangeHook = async ({ data, operation, req }) => {
  if (!isR2Enabled() || !data || (operation !== 'create' && operation !== 'update')) return data
  const nextData = data as MediaData
  const file = req.file as unknown as UploadedFile | undefined
  if (nextData.r2Key && !file) return nextData
  if (!file) return nextData
  const buffer = file.data?.length ? file.data : file.tempFilePath ? await readFile(file.tempFilePath) : null
  if (!buffer) throw new Error('No fue posible leer el archivo para guardarlo en R2.')

  const originalFilename = String(nextData.filename || file.name || 'archivo')
  const optimized = await optimizeImage(buffer, originalFilename)
  const key = createR2Key(optimized.filename)
  await putR2Object(key, optimized.buffer, optimized.mimeType)
  return {
    ...nextData,
    filename: optimized.filename,
    mimeType: optimized.mimeType,
    filesize: optimized.filesize,
    width: optimized.width,
    height: optimized.height,
    r2Key: key,
    r2Filename: optimized.filename,
    r2MimeType: optimized.mimeType,
    r2Filesize: optimized.filesize,
  }
}

const removeReplacedFileFromR2: CollectionAfterChangeHook = async ({ doc, operation, previousDoc }) => {
  if (!isR2Enabled() || operation !== 'update') return
  const previousKey = String((previousDoc as MediaData | undefined)?.r2Key || '')
  const currentKey = String((doc as MediaData).r2Key || '')
  if (previousKey && previousKey !== currentKey) await deleteR2Object(previousKey)
}

const removeFileFromR2: CollectionAfterDeleteHook = async ({ doc }) => {
  if (!isR2Enabled()) return
  const key = String((doc as MediaData).r2Key || '')
  if (key) await deleteR2Object(key)
}

export const Media: CollectionConfig = {
  slug: 'media',
  upload: {
    staticDir: 'media',
    filesRequiredOnCreate: false,
    mimeTypes: ['image/*', 'application/pdf'],
  },
  admin: { group: 'Contenido' },
  access: {
    admin: isPayloadAdminUser,
    read: isPayloadAdminUser,
    create: isPayloadAdminUser,
    update: isPayloadAdminUser,
    delete: isPayloadAdminUser,
  },
  fields: [
    { name: 'alt', type: 'text', label: 'Texto alternativo', required: true, maxLength: 160 },
    { name: 'r2Key', type: 'text', label: 'Clave R2', maxLength: 500, access: { read: isPayloadAdminUser }, admin: { readOnly: true, hidden: true } },
    { name: 'r2Filename', type: 'text', label: 'Nombre del archivo R2', maxLength: 255, access: { read: isPayloadAdminUser }, admin: { readOnly: true, hidden: true } },
    { name: 'r2MimeType', type: 'text', label: 'Tipo MIME R2', maxLength: 100, access: { read: isPayloadAdminUser }, admin: { readOnly: true, hidden: true } },
    { name: 'r2Filesize', type: 'number', label: 'Tamaño R2', access: { read: isPayloadAdminUser }, admin: { readOnly: true, hidden: true } },
    { name: 'uploadedByUserId', type: 'text', label: 'ID de quien cargó', access: { read: isPayloadAdminUser }, admin: { readOnly: true, hidden: true } },
    { name: 'uploadedByName', type: 'text', label: 'Cargada por', maxLength: 160, access: { read: isPayloadAdminUser }, admin: { readOnly: true, hidden: true } },
  ],
  hooks: {
    beforeChange: [uploadToR2],
    afterChange: [removeReplacedFileFromR2],
    afterDelete: [removeFileFromR2],
  },
}
