import config from '@payload-config'
import '@payloadcms/next/css'
import type { ServerFunctionClient } from 'payload'
import { handleServerFunctions, RootLayout } from '@payloadcms/next/layouts'
import React from 'react'
import type { Metadata } from 'next'

import { importMap } from './admin/importMap'
import './custom.css'

export const metadata: Metadata = {
  title: 'Administración | PLs al llamado',
  robots: { index: false, follow: false },
}

const serverFunction: ServerFunctionClient = async function (args) {
  'use server'
  return handleServerFunctions({ ...args, config, importMap })
}

export default function PayloadLayout({ children }: { children: React.ReactNode }) {
  return <RootLayout config={config} importMap={importMap} serverFunction={serverFunction}>{children}</RootLayout>
}
