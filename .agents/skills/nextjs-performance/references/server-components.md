# Server Components - Best Practices

## Overview

Server Components eseguono sul server:
- Zero JavaScript bundle size
- Accesso diretto a database/API
- Riduzione del tempo di hydration
- Accesso a risorse server-side

---

## Pattern Base

### Server Component Puro

```typescript
import { db } from '@/lib/db'

export default async function ProductList() {
  const products = await db.product.findMany()

  return (
    <ul>
      {products.map(p => <li key={p.id}>{p.name}</li>)}
    </ul>
  )
}
```

### Client Component Ibrido

```typescript
// ProductCard.tsx - Server Component
import { AddToCartButton } from './AddToCartButton'
import { db } from '@/lib/db'

export async function ProductCard({ id }: { id: string }) {
  const product = await db.product.findById(id)

  return (
    <div className="product-card">
      <h3>{product.name}</h3>
      <p>${product.price}</p>
      <AddToCartButton productId={id} />
    </div>
  )
}

// AddToCartButton.tsx - Client Component
'use client'

import { useState } from 'react'

export function AddToCartButton({ productId }: { productId: string }) {
  const [adding, setAdding] = useState(false)

  const addToCart = async () => {
    setAdding(true)
    await fetch('/api/cart', {
      method: 'POST',
      body: JSON.stringify({ productId }),
    })
    setAdding(false)
  }

  return (
    <button onClick={addToCart} disabled={adding}>
      {adding ? 'Adding...' : 'Add to Cart'}
    </button>
  )
}
```

---

## React 19 + Next.js 16 Patterns

### Async Params (Next.js 15+)

```typescript
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const post = await fetchPost(slug)
}
```

### Server Actions Migliorati

```typescript
'use server'

import { revalidatePath } from 'next/cache'

export async function updateProfile(prevState: any, formData: FormData) {
  const name = formData.get('name') as string
  const email = formData.get('email') as string

  if (!name || name.length < 2) {
    return { error: 'Name must be at least 2 characters' }
  }

  try {
    await db.user.update({
      where: { id: session.userId },
      data: { name, email },
    })

    revalidatePath('/profile')
    return { success: true }
  } catch (error) {
    return { error: 'Update failed' }
  }
}

'use client'

import { useActionState } from 'react'
import { updateProfile } from './actions'

export function ProfileForm() {
  const [state, action, pending] = useActionState(updateProfile, null)

  return (
    <form action={action}>
      <input name="name" placeholder="Name" />
      <input name="email" type="email" placeholder="Email" />
      <button type="submit" disabled={pending}>
        {pending ? 'Saving...' : 'Save'}
      </button>
      {state?.error && <p className="error">{state.error}</p>}
      {state?.success && <p className="success">Saved!</p>}
    </form>
  )
}
```

---

## Accesso a Risorse Server-side

### Database Access

```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = global as unknown as { prisma: PrismaClient }
export const db = globalForPrisma.prisma || new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

import { db } from '@/lib/db'

export default async function Page() {
  const users = await db.user.findMany()
}
```

### File System

```typescript
import { readFile } from 'fs/promises'
import path from 'path'

export default async function Page() {
  const filePath = path.join(process.cwd(), 'content', 'about.md')
  const content = await readFile(filePath, 'utf-8')
  return <Markdown content={content} />
}
```

---

## Errori Comuni

```typescript
// ❌ NON: Usare browser APIs in Server Component
export default function Page() {
  const width = window.innerWidth
  localStorage.getItem('key')
}

// ✅ SÌ: Spostare in Client Component
'use client'
export function WindowSize() {
  const [width, setWidth] = useState(window.innerWidth)
}

// ❌ NON: Usare hooks in Server Component
export default function Page() {
  const [count, setCount] = useState(0)
  useEffect(() => {...}, [])
}

// ❌ NON: Troppi Client Components annidati
// ServerComponent → ClientComponent1 → ClientComponent2 → ClientComponent3

// ✅ SÌ: Mantenere Client Components il più in basso possibile
// ServerComponent → ServerComponent → ServerComponent → ClientComponent
```
