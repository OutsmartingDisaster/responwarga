import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import { mkdir, writeFile } from 'fs/promises'

export const runtime = 'nodejs'

function sanitize(value: string) {
  if (!value) {
    throw new Error('Invalid path segment')
  }
  const normalized = path.posix.normalize(value.replace(/\\/g, '/'))
  if (normalized.startsWith('..')) {
    throw new Error('Path traversal detected')
  }
  return normalized.replace(/^\/+/g, '')
}

export async function POST(request: NextRequest) {
  const form = await request.formData()
  const file = form.get('file') as File | null
  const bucket = form.get('bucket')?.toString() || ''
  const targetPath = form.get('path')?.toString() || ''

  if (!file || !bucket || !targetPath) {
    return NextResponse.json({ error: 'bucket, path, and file are required.' }, { status: 400 })
  }

  try {
    const safeBucket = sanitize(bucket)
    const safePath = sanitize(targetPath)
    const uploadRoot = process.env.FILE_UPLOAD_DIR || 'public/uploads'
    const absolutePath = path.join(process.cwd(), uploadRoot, safeBucket, safePath)

    await mkdir(path.dirname(absolutePath), { recursive: true })
    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(absolutePath, buffer)

    return NextResponse.json({ data: { path: safePath, bucket: safeBucket } })
  } catch (error: any) {
    console.error('[api/uploads] failed', error)
    return NextResponse.json({ error: 'Upload failed.' }, { status: 500 })
  }
}
