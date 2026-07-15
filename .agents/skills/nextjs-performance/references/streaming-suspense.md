# Streaming e Suspense in Next.js

## Overview

Streaming permette di inviare parti della UI man mano che sono pronte, migliorando il Time to First Byte (TTFB).

---

## Pattern Base

### Loading.tsx

```typescript
export default function Loading() {
  return (
    <div className="loading-skeleton">
      <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
      <div className="mt-4 space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-4 bg-gray-200 rounded animate-pulse" />
        ))}
      </div>
    </div>
  )
}
```

### Suspense Boundaries

```typescript
import { Suspense } from 'react'
import { ProductListSkeleton } from './components/ProductListSkeleton'
import { ProductList } from './components/ProductList'
import { ReviewsSkeleton } from './components/ReviewsSkeleton'
import { Reviews } from './components/Reviews'

export default function Page() {
  return (
    <div>
      <header>
        <h1>Our Products</h1>
      </header>

      <Suspense fallback={<ProductListSkeleton />}>
        <ProductList />
      </Suspense>

      <Suspense fallback={<ReviewsSkeleton />}>
        <Reviews />
      </Suspense>
    </div>
  )
}
```

---

## Streaming Pattern

### Parallel Fetching con Suspense

```typescript
export default function Page() {
  return (
    <div>
      <Suspense fallback={<UserSkeleton />}>
        <UserProfile />
      </Suspense>
      <Suspense fallback={<OrdersSkeleton />}>
        <OrderList />
      </Suspense>
      <Suspense fallback={<RecsSkeleton />}>
        <Recommendations />
      </Suspense>
    </div>
  )
}

async function UserProfile() {
  const user = await fetchUser()
  return <div>{user.name}</div>
}

async function OrderList() {
  const orders = await fetchOrders()
  return <ul>{orders.map(o => <li key={o.id}>{o.total}</li>)}</ul>
}
```

### Nested Suspense

```typescript
export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <Dashboard />
    </Suspense>
  )
}

async function Dashboard() {
  return (
    <div>
      <Sidebar />
      <main>
        <Suspense fallback={<ChartSkeleton />}>
          <RevenueChart />
        </Suspense>
        <Suspense fallback={<TableSkeleton />}>
          <RecentOrders />
        </Suspense>
      </main>
    </div>
  )
}
```

---

## Error Boundaries

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
    <div className="error-container">
      <h2>Something went wrong!</h2>
      <button onClick={reset}>Try again</button>
    </div>
  )
}
```

---

## Best Practices

```typescript
// ✅ SÌ: Place Suspense boundaries strategically
<Suspense fallback={<SpecificSkeleton />}>
  <ExpensiveComponent />
</Suspense>

// ❌ NON: Unico Suspense in alto livello
<Suspense fallback={<GenericLoading />}>
  <EntirePage />
</Suspense>

// ✅ SÌ: Fetch nel componente che usa i dati
async function ProductList() {
  const products = await fetchProducts()
  return <div>{...}</div>
}

// ❌ NON: Passare dati attraverso props
async function Page() {
  const products = await fetchProducts()
  return <ProductList products={products} />
}
```
