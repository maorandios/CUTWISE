/**
 * Blog metadata for static prerender (OG/Twitter cards).
 * Used by the Vite plugin to emit /blog/[slug]/index.html per post.
 */
import { blogPosts } from './blogPosts'
import { getBlogImage } from './blogImages'

const SITE = 'https://www.cutwise.pro'

export const blogMetaForPrerender = blogPosts.map((p) => {
  const img = getBlogImage(p.slug, p.image)
  const imageUrl = img.startsWith('http') ? img : SITE + encodeURI(img)
  return {
    slug: p.slug,
    title: p.title,
    excerpt: p.excerpt,
    image: imageUrl,
    url: `${SITE}/blog/${p.slug}`,
  }
})
