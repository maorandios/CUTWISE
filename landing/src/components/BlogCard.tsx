import { Link } from 'react-router-dom'
import type { BlogPost } from '@/data/blogPosts'
import { getBlogIllustration } from '@/components/blogIllustrations'

interface BlogCardProps {
  post: BlogPost
}

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

export const BlogCard = ({ post }: BlogCardProps) => {
  const Illustration = getBlogIllustration(post.slug)

  return (
  <article className="flex flex-col rounded-xl border border-gray-200 bg-white overflow-hidden h-full">
    <div className="aspect-video w-full shrink-0 overflow-hidden bg-gray-100">
      {Illustration ? (
        <Illustration className="w-full h-full" />
      ) : (
        <img
          src={post.image}
          alt={post.title}
          className="w-full h-full object-cover"
        />
      )}
    </div>
    <div className="flex flex-col flex-1 min-h-0 p-4 text-left">
      <h3 className="text-base font-bold text-[#002D2A] line-clamp-2 min-h-[3rem] leading-snug">
        {post.title}
      </h3>
      <p className="text-sm text-gray-600 line-clamp-3 mt-2 min-h-[3.75rem]">
        {post.excerpt}
      </p>
      <time className="text-xs text-gray-500 mt-2 shrink-0" dateTime={post.datePublished}>
        {formatDate(post.datePublished)}
      </time>
      <Link
        to={`/blog/${post.slug}`}
        className="mt-4 shrink-0 inline-flex items-center justify-center w-full py-2.5 px-4 rounded-lg bg-[#002D2A] text-white text-sm font-semibold hover:bg-[#002D2A]/90 transition-colors"
      >
        Read post
      </Link>
    </div>
  </article>
  )
}
