# Font Optimization - next/font

## Overview

`next/font` ottimizza automaticamente i font:
- Elimina layout shift (CLS)
- Automatic subsetting
- Preload dei font critici
- Zero runtime JavaScript
- Supporto Google Fonts e font locali

---

## Configurazione Base

### Google Font

```typescript
import { Inter } from 'next/font/google'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={`${inter.className} antialiased`}>
        {children}
      </body>
    </html>
  )
}
```

### Local Font

```typescript
import localFont from 'next/font/local'

const myFont = localFont({
  src: [
    {
      path: './fonts/Custom-Regular.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: './fonts/Custom-Bold.woff2',
      weight: '700',
      style: 'normal',
    },
    {
      path: './fonts/Custom-Italic.woff2',
      weight: '400',
      style: 'italic',
    },
  ],
  variable: '--font-custom',
  display: 'swap',
})
```

---

## Pattern Comuni

### Multiple Fonts

```typescript
import { Inter, Playfair_Display } from 'next/font/google'

export const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
})

// tailwind.config.ts
const config = {
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        serif: ['var(--font-playfair)', 'Georgia', 'serif'],
      },
    },
  },
}
```

### Variable Fonts

```typescript
import { Inter } from 'next/font/google'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

// Uso con qualsiasi weight
<p className="font-sans font-light">Light text</p>
<p className="font-sans font-normal">Normal text</p>
<p className="font-sans font-bold">Bold text</p>
```

### Font Ottimizzati per Performance

```typescript
import { Inter } from 'next/font/google'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
  adjustFontFallback: true,
})

export const metadata = {
  other: {
    preconnect: ['https://fonts.googleapis.com', 'https://fonts.gstatic.com'],
  },
}
```

---

## Errori Comuni

```typescript
// ❌ NON: Dimenticare subsets
const inter = Inter({})

// ✅ SÌ: Specificare subsets
const inter = Inter({ subsets: ['latin'] })

// ❌ NON: Usare display: block
const inter = Inter({ display: 'block' })

// ✅ SÌ: Usare swap per immediate text render
const inter = Inter({ display: 'swap' })

// ❌ NON: Importare font in ogni componente
// components/Button.tsx
import { Inter } from 'next/font/google'
const inter = Inter({ subsets: ['latin'] }) // ❌

// ✅ SÌ: Importare una sola volta in layout
// app/layout.tsx
import { Inter } from 'next/font/google'
const inter = Inter({ subsets: ['latin'] })
```
