# Metadata e SEO

## Overview

Next.js fornisce l'API Metadata per gestire i meta tag HTML in modo dichiarativo e type-safe.

---

## Pattern Base

### Static Metadata

```typescript
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'My Page',
  description: 'Page description for SEO',
}

export default function Page() {
  return <div>Content</div>
}
```

### Dynamic Metadata

```typescript
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const post = await fetchPost(slug)

  return {
    title: post.title,
    description: post.excerpt,
  }
}
```

---

## OpenGraph e Social

```typescript
export const metadata: Metadata = {
  title: {
    default: 'My Site',
    template: '%s | My Site',
  },
  description: 'Site description',
  openGraph: {
    title: 'My Page',
    description: 'Page description',
    url: 'https://mysite.com',
    siteName: 'My Site',
    images: [
      {
        url: 'https://mysite.com/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'My Site',
      },
    ],
    locale: 'it_IT',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'My Page',
    description: 'Page description',
    images: ['https://mysite.com/twitter-image.jpg'],
  },
}
```

---

## Robots e Sitemap

### robots.ts

```typescript
import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/admin/', '/private/'],
      },
    ],
    sitemap: 'https://mysite.com/sitemap.xml',
  }
}
```

### sitemap.ts

```typescript
import type { MetadataRoute } from 'next'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await fetchPosts()

  const postEntries = posts.map((post) => ({
    url: `https://mysite.com/blog/${post.slug}`,
    lastModified: post.updatedAt,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))

  return [
    {
      url: 'https://mysite.com',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    ...postEntries,
  ]
}
```

---

## Metadata Base

```typescript
export const metadata: Metadata = {
  metadataBase: new URL('https://mysite.com'),
  title: {
    default: 'My Site',
    template: '%s | My Site',
  },
  description: 'Default description',
  keywords: ['nextjs', 'react', 'web development'],
  authors: [{ name: 'Author Name' }],
  creator: 'Author Name',
  publisher: 'My Company',
  alternates: {
    canonical: '/',
    languages: {
      'en-US': '/en',
      'it-IT': '/it',
    },
  },
  verification: {
    google: 'google-site-verification-code',
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
}
```
