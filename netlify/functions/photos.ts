import type { Config, Context } from '@netlify/functions'
import { getStore } from '@netlify/blobs'

const MAX_BYTES = 5 * 1024 * 1024
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

// Upload: POST /api/photos (multipart, field "file") -> { key }
// Serve:  GET  /api/photos/:key
export default async (req: Request, context: Context) => {
  const store = getStore('frame-photos')

  if (req.method === 'POST') {
    const form = await req.formData()
    const file = form.get('file')
    if (!(file instanceof File)) {
      return Response.json({ error: 'No file provided' }, { status: 400 })
    }
    if (!ALLOWED.includes(file.type)) {
      return Response.json({ error: 'Unsupported image type' }, { status: 400 })
    }
    if (file.size > MAX_BYTES) {
      return Response.json({ error: 'Image must be under 5 MB' }, { status: 400 })
    }
    const key = crypto.randomUUID()
    await store.set(key, await file.arrayBuffer(), {
      metadata: { contentType: file.type },
    })
    return Response.json({ key }, { status: 201 })
  }

  if (req.method === 'GET') {
    const key = context.params.key
    if (!key) return new Response('Not found', { status: 404 })
    const entry = await store.getWithMetadata(key, { type: 'arrayBuffer' })
    if (!entry) return new Response('Not found', { status: 404 })
    return new Response(entry.data, {
      headers: {
        'Content-Type': String(entry.metadata.contentType ?? 'image/jpeg'),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  }

  return new Response('Method not allowed', { status: 405 })
}

export const config: Config = {
  path: ['/api/photos', '/api/photos/:key'],
}
