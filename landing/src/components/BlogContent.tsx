interface BlogContentProps {
  content: string
}

const parseBold = (text: string): React.ReactNode[] => {
  const parts: React.ReactNode[] = []
  let remaining = text
  let key = 0
  while (remaining.length > 0) {
    const idx = remaining.indexOf('**')
    if (idx < 0) {
      parts.push(<span key={key++}>{remaining}</span>)
      break
    }
    if (idx > 0) {
      parts.push(<span key={key++}>{remaining.slice(0, idx)}</span>)
    }
    const end = remaining.indexOf('**', idx + 2)
    if (end >= 0) {
      parts.push(
        <strong key={key++} className="font-bold text-gray-900">
          {remaining.slice(idx + 2, end)}
        </strong>
      )
      remaining = remaining.slice(end + 2)
    } else {
      parts.push(<span key={key++}>{remaining.slice(idx, idx + 2)}</span>)
      remaining = remaining.slice(idx + 2)
    }
  }
  return parts
}

export const BlogContent = ({ content }: BlogContentProps) => {
  const blocks = content.split(/\n\n+/)

  return (
    <div className="text-lg text-gray-600 leading-relaxed space-y-4">
      {blocks.map((block, i) => {
        const trimmed = block.trim()
        if (trimmed.startsWith('{{') && trimmed.endsWith('}}')) {
          const quoteText = trimmed.slice(2, -2).trim()
          return (
            <blockquote
              key={i}
              className="my-8 pl-6 border-l-4 border-[#002D2A] text-xl md:text-2xl font-semibold text-gray-800 italic"
            >
              {quoteText}
            </blockquote>
          )
        }
        return (
          <p key={i} className="whitespace-pre-line">
            {parseBold(block)}
          </p>
        )
      })}
    </div>
  )
}
