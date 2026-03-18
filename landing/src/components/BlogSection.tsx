import { Link } from 'react-router-dom'
import { BlogCard } from './BlogCard'
import { getLatestPosts } from '@/data/blogPosts'

export const BlogSection = () => {
  const posts = getLatestPosts(3)

  return (
    <section id="blog" className="py-16 bg-background">
      <div className="container max-w-app mx-auto px-6">
        <div className="flex justify-center mb-6">
          <span className="inline-flex items-center rounded-full border border-gray-300 bg-gray-100 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-gray-600">
            Blog
          </span>
        </div>
        <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-4 tracking-[-1px]">
          Cutwise Blog
        </h2>
        <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
          Tips, insights, and updates for steel fabricators.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto items-stretch">
          {posts.map((post) => (
            <BlogCard key={post.id} post={post} />
          ))}
        </div>

        <div className="flex justify-center mt-10">
          <Link
            to="/blog"
            className="inline-flex items-center justify-center rounded-full bg-gray-200 text-gray-800 hover:bg-gray-300 h-12 px-8 text-base font-bold transition-colors"
          >
            View all posts
          </Link>
        </div>
      </div>
    </section>
  )
}
