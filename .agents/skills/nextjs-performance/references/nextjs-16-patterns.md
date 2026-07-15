# Next.js 16 + React 19 Patterns

## Overview

Nuove feature e pattern specifici per Next.js 16 con React 19.

---

## Async Server Components

```typescript
export default async function Page() {
  const data = await fetch('https://api.example.com/data')
  return <DataView data={data} />
}
```

### Async Layout

```typescript
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const settings = await fetchSettings()

  return (
    <html lang={settings.locale}>
      <body className={settings.theme}>{children}</body>
    </html>
  )
}
```

---

## Server Actions

### Form Actions

```typescript
'use server'

export async function submitForm(formData: FormData) {
  const name = formData.get('name')
  const email = formData.get('email')
  await db.user.create({ data: { name, email } })
  redirect('/success')
}

import { submitForm } from './actions'

export default function Page() {
  return (
    <form action={submitForm}>
      <input name="name" />
      <input name="email" type="email" />
      <button type="submit">Submit</button>
    </form>
  )
}
```

### useActionState

```typescript
'use client'

import { useActionState } from 'react'
import { submitForm } from './actions'

export function Form() {
  const [state, action, pending] = useActionState(submitForm, null)

  return (
    <form action={action}>
      <input name="email" />
      <button disabled={pending}>{pending ? 'Submitting...' : 'Submit'}</button>
      {state?.error && <p>{state.error}</p>}
    </form>
  )
}
```

### useFormStatus

```typescript
'use client'

import { useFormStatus } from 'react-dom'

function SubmitButton() {
  const { pending } = useFormStatus()
  return <button disabled={pending}>{pending ? 'Loading...' : 'Submit'}</button>
}

export function Form() {
  return (
    <form action={submitAction}>
      <input name="name" />
      <SubmitButton />
    </form>
  )
}
```

---

## React 19 Hooks

### useOptimistic

```typescript
'use client'

import { useOptimistic } from 'react'

type Todo = { id: string; text: string; completed: boolean }

export function TodoList({ todos }: { todos: Todo[] }) {
  const [optimisticTodos, addOptimisticTodo] = useOptimistic(
    todos,
    (state, newTodo: Todo) => [...state, newTodo]
  )

  async function addTodo(formData: FormData) {
    const text = formData.get('text') as string
    addOptimisticTodo({
      id: crypto.randomUUID(),
      text,
      completed: false,
    })
    await createTodo(text)
  }

  return (
    <form action={addTodo}>
      <input name="text" />
      <button>Add</button>
      {optimisticTodos.map((todo) => (
        <div key={todo.id}>{todo.text}</div>
      ))}
    </form>
  )
}
```

---

## Parallel Data Fetching

```typescript
import { Suspense } from 'react'

export default function Page() {
  const userPromise = fetchUser()
  const postsPromise = fetchPosts()

  return (
    <>
      <Suspense fallback={<UserSkeleton />}>
        <UserProfile promise={userPromise} />
      </Suspense>
      <Suspense fallback={<PostsSkeleton />}>
        <PostList promise={postsPromise} />
      </Suspense>
    </>
  )
}

async function UserProfile({ promise }: { promise: Promise<User> }) {
  const user = await promise
  return <div>{user.name}</div>
}
```

---

## Incremental Static Regeneration (ISR)

```typescript
export const revalidate = 3600

export async function generateStaticParams() {
  const posts = await fetchPosts()
  return posts.map((post) => ({ slug: post.slug }))
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const post = await fetchPost(slug)
  return <article>{post.content}</article>
}
```

---

## Error Handling

```typescript
'use client'

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div>
      <h2>Something went wrong</h2>
      <button onClick={reset}>Try again</button>
    </div>
  )
}

import { notFound } from 'next/navigation'

export default async function Page({ params }: { params: { id: string } }) {
  const data = await fetchData(params.id)

  if (!data) {
    notFound()
  }

  return <div>{data.name}</div>
}
```
