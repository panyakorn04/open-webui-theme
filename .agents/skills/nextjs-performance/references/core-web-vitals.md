# Core Web Vitals - Next.js Optimization

## Overview

Core Web Vitals (CWV) sono le metriche di performance critiche per l'esperienza utente e il SEO.

| Metrica | Target | Ottimizzazione Principale |
|---------|--------|---------------------------|
| **LCP** (Largest Contentful Paint) | < 2.5s | Ottimizzare l'elemento più grande visibile |
| **INP** (Interaction to Next Paint) | < 200ms | Minimizzare JS sul thread principale |
| **CLS** (Cumulative Layout Shift) | < 0.1 | Riservare spazio per elementi dinamici |

---

## LCP Optimization

### Elementi che contribuiscono a LCP
1. `<img>` elementi
2. `<image>` dentro SVG
3. Video poster
4. Elementi con background-image
5. Block-level text elements

### Strategie Next.js

```typescript
<Image
  src="/hero.jpg"
  alt="Hero"
  width={1200}
  height={600}
  priority
  quality={80}
  placeholder="blur"
  blurDataURL="data:image/jpeg;base64,..."
/>
```

### Preload Critical Resources

```typescript
export const metadata = {
  other: {
    preconnect: ['https://fonts.googleapis.com'],
    dnsPrefetch: ['https://api.example.com'],
  },
}
```

---

## INP Optimization

### Strategie

1. Spostare logica pesante su Web Workers
2. Utilizzare Server Components per ridurre JS client
3. Debouncing/Throttling degli event handlers

```typescript
'use client'

import { useTransition } from 'react'

export function OptimizedButton() {
  const [isPending, startTransition] = useTransition()

  const handleClick = () => {
    startTransition(() => {
      heavyComputation()
    })
  }

  return (
    <button onClick={handleClick} disabled={isPending}>
      {isPending ? 'Processing...' : 'Click'}
    </button>
  )
}
```

---

## CLS Optimization

```typescript
import Image from 'next/image'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

<Image
  src="/photo.jpg"
  alt="Photo"
  width={800}
  height={600}
  fill
  sizes="(max-width: 768px) 100vw, 800px"
/>
```

### Riservare spazio per contenuti dinamici

```typescript
export default function Page() {
  const [data, setData] = useState(null)

  useEffect(() => {
    fetchData().then(setData)
  }, [])

  return (
    <div className="min-h-[400px]">
      {data ? <Content data={data} /> : <Skeleton />}
    </div>
  )
}
```

---

## Monitoring CWV in Next.js

### Vercel Analytics

```bash
npm i @vercel/analytics
```

```typescript
import { Analytics } from '@vercel/analytics/next'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>{children}</body>
      <Analytics />
    </html>
  )
}
```

### Speed Insights

```bash
npm i @vercel/speed-insights
```

```typescript
import { SpeedInsights } from '@vercel/speed-insights/next'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>{children}</body>
      <SpeedInsights />
    </html>
  )
}
```

### Web Vitals API

```typescript
'use client'

import { useReportWebVitals } from 'next/web-vitals'

export function WebVitals() {
  useReportWebVitals((metric) => {
    console.log(metric)
    if (window.gtag) {
      window.gtag('event', metric.name, {
        value: Math.round(metric.value),
        event_category: 'Web Vitals',
        event_label: metric.id,
        non_interaction: true,
      })
    }
  })

  return null
}
```
