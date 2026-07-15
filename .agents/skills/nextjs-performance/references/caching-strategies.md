# Caching Strategies in Next.js

## Overview

Next.js offre multiple strategie di caching:
- **Request Memoization**: Deduplica fetch nello stesso render
- **Data Cache**: Cache persistente tra request
- **Full Route Cache**: Cache delle pagine statiche
- **Router Cache**: Cache client-side delle route

---

## Fetch Caching

### Default Behavior (Next.js 15+)

```typescript
fetch('https://api.example.com/data') // no-store
fetch('https://api.example.com/data', { cache: 'force-cache' }) // cached
```

### Cache Time-based (ISR)

```typescript
async function getData() {
  const res = await fetch('https://api.example.com/data', {
    next: {
      revalidate: 60,
      tags: ['products'],
    },
  })
  return res.json()
}
```

### On-demand Revalidation

```typescript
import { revalidateTag, revalidatePath } from 'next/cache'
import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const { tag, path } = await request.json()

  if (tag) {
    revalidateTag(tag)
    return Response.json({ revalidated: true, tag })
  }

  if (path) {
    revalidatePath(path)
    return Response.json({ revalidated: true, path })
  }

  return Response.json({ error: 'Missing tag or path' }, { status: 400 })
}
```

---

## unstable_cache

### Cache di Funzioni

```typescript
import { unstable_cache } from 'next/cache'

const getCachedProducts = unstable_cache(
  async () => {
    return db.product.findMany({ include: { category: true } })
  },
  ['products'],
  {
    revalidate: 3600,
    tags: ['products', 'inventory'],
  }
)

export default async function ProductPage() {
  const products = await getCachedProducts()
  return <ProductList products={products} />
}
```

### Cache con Parametri

```typescript
const getCachedProduct = unstable_cache(
  async (id: string) => {
    return db.product.findUnique({ where: { id } })
  },
  ['product'],
  { tags: ['products'] }
)

const product = await getCachedProduct('123')
```

---

## Route Segment Config

```typescript
export const dynamic = 'auto'       // Static (default se no dynamic data)
export const dynamic = 'force-static' // Forza statico
export const dynamic = 'force-dynamic' // No cache
export const dynamic = 'error'       // Error se usa dynamic data

export const revalidate = 3600       // 1 ora
export const revalidate = false      // Mai (default static)
export const revalidate = 0          // Ogni richiesta (dynamic)

export const runtime = 'edge'
export const runtime = 'nodejs'
```

---

## Server Actions Cache

```typescript
'use server'

import { revalidatePath, revalidateTag } from 'next/cache'

export async function createProduct(formData: FormData) {
  const data = Object.fromEntries(formData)
  await db.product.create({ data })

  revalidatePath('/products')
  revalidatePath('/admin/products')
  revalidateTag('products')

  return { success: true }
}
```

---

## Best Practices

```typescript
// ✅ SÌ: Cache con tags significativi
const getData = unstable_cache(fetchData, ['key'], {
  revalidate: 3600,
  tags: ['entity-type', 'entity-id'],
})

// ✅ SÌ: Differenti TTL per differenti dati
const getCategories = unstable_cache(fetchCategories, ['categories'], {
  revalidate: 86400, // 24 ore
})

const getComments = unstableCache(fetchComments, ['comments'], {
  revalidate: 60, // 1 minuto
})
```
