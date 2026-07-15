# Bundle Optimization

## Overview

Ottimizzazioni per ridurre il JavaScript bundle e migliorare i tempi di caricamento.

---

## Code Splitting

### Dynamic Imports

```typescript
import dynamic from 'next/dynamic'

const HeavyChart = dynamic(() => import('./HeavyChart'), {
  loading: () => <ChartSkeleton />,
  ssr: false,
})

export default function Dashboard() {
  return <HeavyChart />
}
```

### Condizionale Loading

```typescript
'use client'

import dynamic from 'next/dynamic'

const MapComponent = dynamic(() => import('./Map'), {
  ssr: false,
  loading: () => <MapPlaceholder />,
})

export function LocationSection({ showMap }: { showMap: boolean }) {
  return showMap ? <MapComponent /> : null
}
```

### Import con Named Exports

```typescript
const DynamicComponent = dynamic(
  () => import('./components').then((mod) => mod.HeavyChart),
  {
    loading: () => <Loading />,
  }
)
```

---

## Tree Shaking

### Export Named vs Default

```typescript
// ✅ SÌ: Named exports per tree shaking
export { Button, Input, Select }

// ❌ NON: Tutto in un oggetto
export default { Button, Input, Select }

// ✅ SÌ: Import specifici
import { debounce } from 'lodash-es'
```

---

## Bundle Analysis

### `@next/bundle-analyzer`

```bash
npm install --save-dev @next/bundle-analyzer
```

```javascript
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

module.exports = withBundleAnalyzer({})
```

```bash
ANALYZE=true npm run build
```

---

## Ottimizzazioni Librerie

### Modular Imports

```javascript
module.exports = {
  modularizeImports: {
    '@mui/material': {
      transform: '@mui/material/{{member}}',
    },
    '@mui/icons-material': {
      transform: '@mui/icons-material/{{member}}',
    },
    lodash: {
      transform: 'lodash/{{member}}',
    },
  },
}
```

---

## Best Practices

```typescript
// ✅ SÌ: Lazy load componenti pesanti
const HeavyEditor = dynamic(() => import('./Editor'), { ssr: false })

// ✅ SÌ: Intersection Observer per below-fold
'use client'
import { useEffect, useRef, useState } from 'react'

export function LazyComponent({ component: Component }) {
  const [shouldLoad, setShouldLoad] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setShouldLoad(true)
        observer.disconnect()
      }
    })

    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  return <div ref={ref}>{shouldLoad ? <Component /> : <Placeholder />}</div>
}

// ✅ SÌ: Prefetch route importante
import Link from 'next/link'

<Link href="/dashboard" prefetch={true}>Dashboard</Link>

// ❌ NON: Prefetch tutto
<Link href="/rarely-used" prefetch={true}>Rare</Link>
```
