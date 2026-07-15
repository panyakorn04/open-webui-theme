# Route Handlers Ottimizzati

## Overview

Route handlers in `app/` directory per API endpoints con supporto streaming e edge runtime.

---

## Pattern Base

### GET Handler

```typescript
import { NextResponse } from 'next/server'

export const dynamic = 'force-static'
export const revalidate = 3600

export async function GET() {
  const users = await db.user.findMany()
  return NextResponse.json(users)
}
```

### POST Handler

```typescript
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const user = await db.user.create({ data: body })
    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    )
  }
}
```

---

## Edge Runtime

```typescript
export const runtime = 'edge'
export const preferredRegion = 'iad1'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')

  const result = await fetch(`https://api.example.com/search?q=${query}`)

  return new Response(await result.text(), {
    headers: { 'content-type': 'application/json' },
  })
}
```

---

## Streaming Response

```typescript
export const runtime = 'edge'

export async function POST(request: Request) {
  const { prompt } = await request.json()

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      stream: true,
    }),
  })

  return new Response(response.body, {
    headers: { 'Content-Type': 'text/event-stream' },
  })
}
```

---

## Caching Headers

```typescript
export async function GET() {
  const data = await fetchData()

  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
    },
  })
}

export async function GET(request: Request) {
  const data = await fetchData()
  const etag = generateETag(data)

  if (request.headers.get('If-None-Match') === etag) {
    return new Response(null, { status: 304 })
  }

  return NextResponse.json(data, {
    headers: {
      ETag: etag,
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
```

---

## Error Handling

```typescript
export class APIError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code: string = 'INTERNAL_ERROR'
  ) {
    super(message)
  }
}

export function handleError(error: unknown) {
  if (error instanceof APIError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.statusCode }
    )
  }

  console.error(error)
  return NextResponse.json(
    { error: 'Internal server error', code: 'INTERNAL_ERROR' },
    { status: 500 }
  )
}

import { APIError, handleError } from './error-handler'

export async function GET() {
  try {
    const data = await fetchData()
    if (!data) {
      throw new APIError('Not found', 404, 'NOT_FOUND')
    }
    return NextResponse.json(data)
  } catch (error) {
    return handleError(error)
  }
}
```
