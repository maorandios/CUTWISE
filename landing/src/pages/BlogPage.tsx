import { Link } from 'react-router-dom'
import { BlogCard } from '@/components/BlogCard'
import { BlogHeader } from '@/components/BlogHeader'
import { Footer } from '@/components/Footer'
import { blogPosts } from '@/data/blogPosts'

export const BlogPage = () => {
  const sortedPosts = [...blogPosts].sort(
    (a, b) => new Date(b.datePublished).getTime() - new Date(a.datePublished).getTime()
  )

  return (
    <div className="min-h-screen bg-background">
      <BlogHeader />

      <main className="py-16">
        <div className="container max-w-app mx-auto px-6">
          <Link
            to="/"
            className="inline-flex items-center text-sm font-medium text-[#002D2A] hover:text-[#002D2A]/80 transition-colors mb-6"
          >
            ← Back to home
          </Link>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 tracking-[-1px]">
            Cutwise Blog
          </h1>
          <p className="text-gray-600 mb-12 max-w-2xl">
            Tips, insights, and updates for steel fabricators.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedPosts.map((post) => (
              <BlogCard key={post.id} post={post} />
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
