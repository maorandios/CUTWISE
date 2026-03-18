import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'

const navLinks = [
  { href: '/#about', label: 'About us' },
  { href: '/#why-it-matters', label: 'Why it matters' },
  { href: '/#shop-floor', label: 'Shop floor' },
  { href: '/#precision', label: 'Precision' },
  { href: '/#positioning', label: 'Positioning' },
  { href: '/#pricing', label: 'Pricing' },
  { href: '/blog', label: 'Blog', isLink: true },
  { href: '/#faq', label: "Faq's" },
  { href: '/#contact', label: 'Contact' },
]

export const BlogHeader = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header className="bg-gradient-to-br from-primary to-primary/90 text-primary-foreground">
      <div className="container flex h-16 items-center justify-between max-w-app mx-auto px-6">
        <Link to="/" className="flex items-center gap-2">
          <img src="/Icons/cutwise manu logo.svg" alt="Cutwise" className="h-10" />
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((item) =>
            item.isLink ? (
              <Link
                key={item.href}
                to={item.href}
                className="text-sm font-medium text-white/70 hover:text-white transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <a
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-white/70 hover:text-white transition-colors"
              >
                {item.label}
              </a>
            )
          )}
          <a href="https://app.cutwise.pro/signup">
            <Button className="rounded-full bg-[#111827] text-[#00FF9F] hover:bg-white hover:text-gray-800 h-11 px-7 text-sm font-bold shadow-lg">
              Start Free
            </Button>
          </a>
        </nav>

        <button
          className="md:hidden flex items-center justify-center w-10 h-10 rounded-lg hover:bg-white/10 transition-colors"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? (
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden bg-primary/98 backdrop-blur-sm border-t border-white/10">
          <nav className="container max-w-app mx-auto px-6 py-4 flex flex-col gap-4">
            {navLinks.map((item) =>
              item.isLink ? (
                <Link
                  key={item.href}
                  to={item.href}
                  className="text-base font-medium text-white/70 hover:text-white transition-colors py-2 text-center"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ) : (
                <a
                  key={item.href}
                  href={item.href}
                  className="text-base font-medium text-white/70 hover:text-white transition-colors py-2 text-center"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.label}
                </a>
              )
            )}
            <a href="https://app.cutwise.pro/signup" className="mt-2" onClick={() => setMobileMenuOpen(false)}>
              <Button className="w-full rounded-full bg-[#111827] text-[#00FF9F] hover:bg-white hover:text-gray-800 h-12 px-7 text-base font-bold shadow-lg">
                Start Free
              </Button>
            </a>
          </nav>
        </div>
      )}
    </header>
  )
}
