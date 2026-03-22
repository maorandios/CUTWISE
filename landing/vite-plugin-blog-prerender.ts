import type { Plugin } from 'vite'
import fs from 'node:fs'
import path from 'node:path'
import { blogMetaForPrerender } from './src/data/blogMetaForPrerender'

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function blogPrerenderPlugin(): Plugin {
  return {
    name: 'blog-prerender',
    apply: 'build',
    closeBundle() {
      const outDir = path.join(process.cwd(), 'dist')
      const mainHtmlPath = path.join(outDir, 'index.html')
      const mainHtml = fs.readFileSync(mainHtmlPath, 'utf-8')

      const scripts = mainHtml.match(/<script[\s\S]*?<\/script>/g) || []
      const allLinks = mainHtml.match(/<link[^>]*>/g) || []
      const links = allLinks.filter((l) => /href="[^"]*assets\/[^"]+\.css"/.test(l))

      for (const meta of blogMetaForPrerender) {
        const dir = path.join(outDir, 'blog', meta.slug)
        fs.mkdirSync(dir, { recursive: true })

        const titleEsc = escapeHtml(meta.title)
        const descEsc = escapeHtml(meta.excerpt)

        const head = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${titleEsc} – CutWise</title>
    <meta name="description" content="${descEsc}" />
    <meta name="robots" content="index,follow" />
    <link rel="canonical" href="${meta.url}" />

    <link rel="icon" type="image/png" href="/Icons/Favicon.png" />
    <link rel="apple-touch-icon" href="/Icons/Favicon.png" />
    <meta name="theme-color" content="#002D2A" />

    <meta property="og:type" content="article" />
    <meta property="og:title" content="${titleEsc}" />
    <meta property="og:description" content="${descEsc}" />
    <meta property="og:url" content="${meta.url}" />
    <meta property="og:image" content="${meta.image}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${titleEsc}" />
    <meta name="twitter:description" content="${descEsc}" />
    <meta name="twitter:image" content="${meta.image}" />
    ${links.join('\n    ')}
  </head>
  <body>
    <div id="root"></div>
    ${scripts.join('\n    ')}
  </body>
</html>`

        fs.writeFileSync(path.join(dir, 'index.html'), head)
      }
    },
  }
}
