# Image Optimization - next/image

## Overview

Next.js fornisce un componente `Image` ottimizzato che:
- Ottimizza automaticamente le immagini
- Serve formati moderni (WebP, AVIF)
- Responsive images automatiche
- Lazy loading nativo
- Previene layout shift

---

## Configurazione Base

### next.config.js

```javascript
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.example.com',
        port: '',
        pathname: '/images/**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    quality: 75,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
}
```

---

## Pattern Comuni

### 1. Immagine Hero (LCP)

```typescript
import Image from 'next/image'

export function Hero() {
  return (
    <div className="relative w-full h-[600px]">
      <Image
        src="/hero.jpg"
        alt="Hero image"
        fill
        priority
        quality={85}
        className="object-cover"
        sizes="100vw"
        placeholder="blur"
        blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ..."
      />
    </div>
  )
}
```

### 2. Immagini Responsive

```typescript
import Image from 'next/image'

export function ResponsiveImage() {
  return (
    <Image
      src="/photo.jpg"
      alt="Photo"
      width={800}
      height={600}
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 800px"
    />
  )
}
```

### 3. Grid di Immagini

```typescript
import Image from 'next/image'

export function ImageGrid({ images }: { images: { src: string; alt: string }[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {images.map((img, i) => (
        <div key={i} className="relative aspect-square">
          <Image
            src={img.src}
            alt={img.alt}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover rounded-lg"
            loading={i < 3 ? 'eager' : 'lazy'}
          />
        </div>
      ))}
    </div>
  )
}
```

### 4. Immagini da CMS/CDN Esterno

```typescript
import Image from 'next/image'

const contentfulLoader = ({ src, width, quality }: {
  src: string
  width: number
  quality?: number
}) => {
  return `${src}?w=${width}&q=${quality || 75}&fm=webp`
}

export function CMSImage({ src, alt }: { src: string; alt: string }) {
  return (
    <Image
      loader={contentfulLoader}
      src={src}
      alt={alt}
      width={800}
      height={600}
    />
  )
}
```

---

## Placeholder e Loading States

### Blur Placeholder

```typescript
import { getPlaiceholder } from 'plaiceholder'

async function getBlurData(src: string) {
  const buffer = await fetch(src).then(async (res) =>
    Buffer.from(await res.arrayBuffer())
  )
  const { base64 } = await getPlaiceholder(buffer)
  return base64
}

export async function ImageWithBlur({ src, alt }: { src: string; alt: string }) {
  const blurDataURL = await getBlurData(src)

  return (
    <Image
      src={src}
      alt={alt}
      width={800}
      height={600}
      placeholder="blur"
      blurDataURL={blurDataURL}
    />
  )
}
```

### Color Placeholder

```typescript
<Image
  src="/photo.jpg"
  alt="Photo"
  width={800}
  height={600}
  placeholder="blur"
  blurDataURL="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1'%3E%3Crect width='1' height='1' fill='%23e2e8f0'/%3E%3C/svg%3E"
/>
```
