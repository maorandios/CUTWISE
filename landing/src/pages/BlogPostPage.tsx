import { Link, useParams } from 'react-router-dom'
import { Footer } from '@/components/Footer'
import { BlogContent } from '@/components/BlogContent'
import { BlogHeader } from '@/components/BlogHeader'
import { getBlogIllustration } from '@/components/blogIllustrations'
import { getBlogImage } from '@/data/blogImages'
import { blogPosts } from '@/data/blogPosts'

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

export const BlogPostPage = () => {
  const { slug } = useParams<{ slug: string }>()
  const post = blogPosts.find((p) => p.slug === slug)

  if (!post) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <BlogHeader />
        <div className="flex items-center justify-center flex-1 py-24">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Post not found</h1>
            <Link to="/blog" className="text-[#002D2A] font-semibold hover:underline">
              Back to blog
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <BlogHeader />

      <article className="py-16">
        <div className="container max-w-app mx-auto px-6 max-w-3xl">
          <Link
            to="/blog"
            className="inline-flex items-center text-sm font-medium text-[#002D2A] hover:text-[#002D2A]/80 transition-colors mb-8"
          >
            ← Back to blog
          </Link>
          <div className="rounded-xl overflow-hidden mb-8 aspect-video bg-gray-100">
            {(() => {
              const localImage = getBlogImage(post.slug, '')
              const Illustration = getBlogIllustration(post.slug)
              if (localImage) {
                return (
                  <img
                    src={localImage}
                    alt={post.title}
                    className="w-full h-full object-cover"
                  />
                )
              }
              if (Illustration) {
                return <Illustration className="w-full h-full" />
              }
              return (
                <img
                  src={post.image}
                  alt={post.title}
                  className="w-full h-full object-cover"
                />
              )
            })()}
          </div>
          <time className="text-sm text-gray-500" dateTime={post.datePublished}>
            {formatDate(post.datePublished)}
          </time>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mt-2 mb-6 tracking-[-1px]">
            {post.title}
          </h1>
          <div className="prose prose-gray max-w-none">
            <BlogContent content={post.content} />
          </div>
        </div>
      </article>

      <Footer />
    </div>
  )
}
