import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/card'
import { WasteOptimizationPreview } from './components/WasteOptimizationPreview'
import { NestingPreview } from './components/NestingPreview'
import { BOMPreview } from './components/BOMPreview'
import { ModelViewerPreview } from './components/ModelViewerPreview'
import { GroupedByProfilePreview } from './components/GroupedByProfilePreview'
import { OrganizedPerStockBarPreview } from './components/OrganizedPerStockBarPreview'
import { ReadyForSawOperatorsPreview } from './components/ReadyForSawOperatorsPreview'
import { EasyToExportSharePreview } from './components/EasyToExportSharePreview'
import { RealWorldConstraintsPreview } from './components/RealWorldConstraintsPreview'
import { ConsistentOutputsPreview } from './components/ConsistentOutputsPreview'
import { SimpleProcessPreview } from './components/SimpleProcessPreview'
import { PositioningSection } from './components/PositioningSection'
import { BlogSection } from './components/BlogSection'
import { Footer } from './components/Footer'
import { BlogPage } from './pages/BlogPage'
import { BlogPostPage } from './pages/BlogPostPage'

function HomePage() {
  const [activeFaq, setActiveFaq] = useState<number | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [shopFloorTopic, setShopFloorTopic] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setShopFloorTopic((s) => (s === 3 ? 0 : s + 1))
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  const toggleFaq = (index: number) => {
    setActiveFaq(activeFaq === index ? null : index)
  }

  const closeMobileMenu = () => {
    setMobileMenuOpen(false)
  }

  const faqs = [
    {
      question: "Which steel profile categories are currently supported by Cutwise?",
      answer: "Cutwise supports standard structural profile families including IPE, HEA, HEB, UPN, channels, angles, and user-defined/custom sections. Profile grouping is based on section metadata from the IFC model, so optimization is executed per compatible profile type."
    },
    {
      question: "What input file format is required for processing?",
      answer: "Cutwise currently accepts IFC (Industry Foundation Classes) files as the primary input format. The IFC model is parsed to extract profile geometry, element attributes, and quantities required for nesting, BOM generation, and stock planning."
    },
    {
      question: "What parameters are considered by the optimization engine?",
      answer: "The optimizer evaluates part lengths, profile compatibility, available stock lengths, and cut constraints (kerf, trim allowance, and tolerance). It computes feasible cutting combinations and ranks them by waste minimization and stock utilization, while maintaining production-ready output."
    },
    {
      question: "How are purchased stock and leftover stock lengths handled?",
      answer: "Both purchased stock and reusable leftover pieces can be included in the stock pool. The solver can prioritize leftovers first, then allocate purchased stock to satisfy unmet demand. This mixed-stock strategy improves residual reuse and reduces new material consumption."
    },
    {
      question: "Through which mechanisms does Cutwise reduce total fabrication cost?",
      answer: "Cost reduction comes from multiple levers: lower scrap ratio, higher reuse of remnants, fewer stock procurement inefficiencies, and reduced manual planning effort. In practice, this improves material yield, shortens planning cycles, and reduces avoidable operational overhead."
    }
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Header + Hero + Video - All in dark green background */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary to-primary/90 text-primary-foreground min-h-screen flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-50 w-full bg-primary/95 backdrop-blur-sm">
          <div className="container flex h-16 items-center justify-between max-w-app mx-auto px-6">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <img src="/Icons/cutwise manu logo.svg" alt="Cutwise" className="h-10" />
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-6">
              <a href="#about" className="text-sm font-medium text-white/70 hover:text-white transition-colors">About us</a>
              <a href="#why-it-matters" className="text-sm font-medium text-white/70 hover:text-white transition-colors">Why it matters</a>
              <a href="#shop-floor" className="text-sm font-medium text-white/70 hover:text-white transition-colors">Shop floor</a>
              <a href="#precision" className="text-sm font-medium text-white/70 hover:text-white transition-colors">Precision</a>
              <a href="#positioning" className="text-sm font-medium text-white/70 hover:text-white transition-colors">Positioning</a>
              <a href="#pricing" className="text-sm font-medium text-white/70 hover:text-white transition-colors">Pricing</a>
              <Link to="/blog" className="text-sm font-medium text-white/70 hover:text-white transition-colors">Blog</Link>
              <a href="#faq" className="text-sm font-medium text-white/70 hover:text-white transition-colors">Faq&apos;s</a>
              <a href="#contact" className="text-sm font-medium text-white/70 hover:text-white transition-colors">Contact</a>
              <a href="https://app.cutwise.pro/signup">
                <Button className="rounded-full bg-[#111827] text-[#00FF9F] hover:bg-white hover:text-gray-800 h-11 px-7 text-sm font-bold shadow-lg">Start Free</Button>
              </a>
            </nav>

            {/* Mobile Menu Toggle */}
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

          {/* Mobile Navigation Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden bg-primary/98 backdrop-blur-sm border-t border-white/10">
              <nav className="container max-w-app mx-auto px-6 py-4 flex flex-col gap-4">
                <a 
                  href="#about" 
                  className="text-base font-medium text-white/70 hover:text-white transition-colors py-2 text-center"
                  onClick={closeMobileMenu}
                >
                  About us
                </a>
                <a 
                  href="#why-it-matters" 
                  className="text-base font-medium text-white/70 hover:text-white transition-colors py-2 text-center"
                  onClick={closeMobileMenu}
                >
                  Why it matters
                </a>
                <a 
                  href="#shop-floor" 
                  className="text-base font-medium text-white/70 hover:text-white transition-colors py-2 text-center"
                  onClick={closeMobileMenu}
                >
                  Shop floor
                </a>
                <a 
                  href="#precision" 
                  className="text-base font-medium text-white/70 hover:text-white transition-colors py-2 text-center"
                  onClick={closeMobileMenu}
                >
                  Precision
                </a>
                <a 
                  href="#positioning" 
                  className="text-base font-medium text-white/70 hover:text-white transition-colors py-2 text-center"
                  onClick={closeMobileMenu}
                >
                  Positioning
                </a>
                <a 
                  href="#pricing" 
                  className="text-base font-medium text-white/70 hover:text-white transition-colors py-2 text-center"
                  onClick={closeMobileMenu}
                >
                  Pricing
                </a>
                <Link 
                  to="/blog" 
                  className="text-base font-medium text-white/70 hover:text-white transition-colors py-2 text-center"
                  onClick={closeMobileMenu}
                >
                  Blog
                </Link>
                <a 
                  href="#faq" 
                  className="text-base font-medium text-white/70 hover:text-white transition-colors py-2 text-center"
                  onClick={closeMobileMenu}
                >
                  Faq&apos;s
                </a>
                <a 
                  href="#contact" 
                  className="text-base font-medium text-white/70 hover:text-white transition-colors py-2 text-center"
                  onClick={closeMobileMenu}
                >
                  Contact
                </a>
                <a href="https://app.cutwise.pro/signup" className="mt-2">
                  <Button className="w-full rounded-full bg-[#111827] text-[#00FF9F] hover:bg-white hover:text-gray-800 h-12 px-7 text-base font-bold shadow-lg">
                    Start Free
                  </Button>
                </a>
              </nav>
            </div>
          )}
        </header>

        {/* Hero Section */}
        <section className="container max-w-app mx-auto px-6 py-10 md:py-12 text-center flex-1 flex flex-col justify-center min-h-0">
          <span className="inline-flex items-center gap-2.5 justify-center rounded-full border border-white/30 bg-white/10 pl-4 pr-5 py-2.5 text-sm font-medium text-primary-foreground/90 backdrop-blur-sm mb-6 md:mb-8 max-w-xl mx-auto">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00FF9F] opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#00FF9F]" />
            </span>
            Built for structural steel fabricators using real-world workflows.
          </span>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-[-1.3px] leading-tight mb-4 md:mb-6">
            Plan Your Steel{' '}
            <span className="relative inline-block">
              Before
              <span className="absolute left-0 -bottom-1 h-1 w-full rounded-full bg-orange-400/90" aria-hidden="true" />
            </span>{' '}
            You Order It
          </h1>
          <h2 className="text-xl md:text-2xl text-primary-foreground/90 mb-6 md:mb-8 max-w-3xl mx-auto leading-relaxed font-semibold">
            Turn IFC Models into Stock Bar Orders and Cutting Plans
          </h2>
          <p className="text-lg md:text-xl text-primary-foreground/80 font-medium mb-6 md:mb-8">
            No Excel <span className="mx-2 text-primary-foreground/50">·</span> No guesswork <span className="mx-2 text-primary-foreground/50">·</span> No over-ordering
          </p>
          <div id="video" className="w-full max-w-4xl mx-auto mb-6 md:mb-8">
            <div className="w-full h-[200px] md:h-[320px] bg-gray-900/90 rounded-[15px] shadow-2xl flex items-center justify-center">
              <div className="text-center text-white">
                <svg className="w-20 h-20 mx-auto mb-4 text-[#2B6E54]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" strokeWidth="2"/>
                  <polygon points="10 8 16 12 10 16 10 8" fill="currentColor"/>
                </svg>
                <p className="text-lg">Video coming soon</p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap justify-center items-center gap-3 md:gap-4">
            <a href="https://app.cutwise.pro">
              <Button className="rounded-full bg-[#00FF9F] text-[#002D2A] hover:bg-white h-[56px] px-10 text-lg font-bold shadow-lg shrink-0">
                Upload IFC
              </Button>
            </a>
            <a href="#video">
              <Button variant="outline" className="rounded-full border-2 border-white/50 bg-transparent text-primary-foreground hover:bg-white/10 hover:border-white hover:text-white h-[56px] px-10 text-lg font-bold shrink-0">
                Watch full demo
              </Button>
            </a>
          </div>
        </section>

      </div>

      {/* Advantages Section */}
      <section id="about" className="py-16 bg-background">
        <div className="container max-w-app mx-auto px-6">
          <div className="max-w-6xl mx-auto mb-12 px-8 md:px-14">
            <h2 className="text-center text-3xl md:text-5xl font-semibold leading-[1.35] tracking-[-1.3px] text-[#002D2A]">
              Built for Structural Steel Fabricators
            </h2>
            <p className="text-center text-xl md:text-2xl text-[#002D2A]/80 mt-6 max-w-3xl mx-auto">
              CutWise helps steel fabricators move from model to material —
              with clear, reliable plans for purchasing and production.
            </p>
            <div className="flex justify-center mt-10">
              <span className="inline-flex items-center rounded-full border border-[#002D2A]/20 bg-[#002D2A]/[0.02] px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-[#002D2A]/80">
                What you get
              </span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 md:gap-0 max-w-4xl mx-auto">
            <Card className="border-0 shadow-none rounded-none bg-transparent md:px-5 py-4">
              <CardContent className="pt-4 flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <svg className="w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-3">Exact Stock Quantities</h3>
                <p className="text-muted-foreground max-w-[320px] mx-auto">Know exactly how many stock bars to order. CutWise calculates precise quantities so you never overbuy or run short.</p>
              </CardContent>
            </Card>
            <Card className="border-0 md:border-l border-[#002D2A]/15 shadow-none rounded-none bg-transparent md:px-5 py-4">
              <CardContent className="pt-4 flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <svg className="w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-3">Production-Ready Cutting Plans</h3>
                <p className="text-muted-foreground max-w-[320px] mx-auto">Clean cutting plans ready for the shop floor. No extra formatting or manual cleanup—just print and produce.</p>
              </CardContent>
            </Card>
            <Card className="border-0 md:border-t border-[#002D2A]/15 shadow-none rounded-none bg-transparent md:px-5 py-4">
              <CardContent className="pt-4 flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <svg className="w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-3">Full Stock Bar Visibility</h3>
                <p className="text-muted-foreground max-w-[320px] mx-auto">See exactly how every stock bar is utilized across your projects. Track each cut&apos;s origin and destination for full traceability.</p>
              </CardContent>
            </Card>
            <Card className="border-0 md:border-l md:border-t border-[#002D2A]/15 shadow-none rounded-none bg-transparent md:px-5 py-4">
              <CardContent className="pt-4 flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <svg className="w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-3">Clear Outputs for All Teams</h3>
                <p className="text-muted-foreground max-w-[320px] mx-auto">Outputs designed for purchasers and operators. The right information in the right format for ordering and production.</p>
              </CardContent>
            </Card>
          </div>
          <p className="text-center text-lg font-medium text-[#002D2A]/80 mt-8">
            No interpretation needed. Just execution.
          </p>
        </div>
      </section>

      {/* Why It Matters Section */}
      <section id="why-it-matters" className="py-16 md:py-20 bg-background">
        <div className="container max-w-app mx-auto px-6">
          <div className="max-w-5xl mx-auto">
            <div className="flex justify-center mb-8">
              <span className="inline-flex items-center rounded-full border border-[#002D2A]/20 bg-[#002D2A]/[0.02] px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-[#002D2A]/80">
                Why it matters
              </span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-center text-[#002D2A] mb-20 tracking-[-1px]">
              Know Exactly What to Order — Without Excel
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-y-4 md:gap-y-0 mb-20 md:divide-x md:divide-[#002D2A]/15">
              <div className="px-6 py-9 rounded-none text-center">
                <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-3">Estimate stock manually</h3>
                <p className="text-muted-foreground max-w-[320px] mx-auto">Guesswork leads to wrong quantities and wasted time.</p>
              </div>
              <div className="px-6 py-9 rounded-none text-center">
                <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-3">Over-order to stay safe</h3>
                <p className="text-muted-foreground max-w-[320px] mx-auto">Extra buffer means extra cost and tied-up capital.</p>
              </div>
              <div className="px-6 py-9 rounded-none text-center">
                <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-3">Spend hours planning cuts</h3>
                <p className="text-muted-foreground max-w-[320px] mx-auto">Manual planning eats into your production capacity.</p>
              </div>
            </div>
            <div className="flex flex-col items-center gap-6">
              <svg className="w-8 h-8 text-primary shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14m0 0l-7-7m7 7l7-7"/>
              </svg>
              <div className="rounded-2xl px-8 md:px-10 py-12 md:py-16 text-center max-w-4xl mx-auto">
                <p className="text-xl md:text-2xl font-semibold text-[#002D2A] leading-relaxed">
                  CutWise replaces that process with a clear, structured plan — based directly on your model, with exact stock quantities and production-ready cutting plans.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="cta" className="relative overflow-hidden bg-gradient-to-br from-primary to-primary/90 text-primary-foreground py-20 md:py-24">
        <div className="container max-w-app mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 tracking-[-1px]">
            From Model to Production in Minutes
          </h2>
          <p className="text-white/80 text-lg md:text-xl mb-10 max-w-xl mx-auto">
            Upload your IFC model and get your first plan in minutes.
          </p>
          <a href="https://app.cutwise.pro/signup">
            <Button className="rounded-full bg-[#00FF9F] text-[#002D2A] hover:bg-white h-14 px-10 text-base font-bold shadow-lg">
              Upload IFC
            </Button>
          </a>
          <div className="flex flex-wrap justify-center gap-6 md:gap-10 mt-12">
            <div className="flex items-center gap-2.5 text-white/90 text-sm font-medium">
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-[#00FF9F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-2.5 text-white/90 text-sm font-medium">
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-[#00FF9F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span>3 projects free on signup</span>
            </div>
            <div className="flex items-center gap-2.5 text-white/90 text-sm font-medium">
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-[#00FF9F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span>Cost saving from the first use</span>
            </div>
          </div>
        </div>
      </section>

      {/* Built for Shop Floor Section */}
      <section id="shop-floor" className="py-20 bg-background">
        <div className="container max-w-app mx-auto px-6">
          <div className="flex justify-center mb-6">
            <span className="inline-flex items-center rounded-full border border-[#002D2A]/20 bg-[#002D2A]/[0.02] px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-[#002D2A]/80">
              Built for the shop floor
            </span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-center text-[#002D2A] mb-4 tracking-[-1px]">
            Designed Around How Fabricators Actually Work
          </h2>
          <p className="text-center text-muted-foreground text-lg mb-12 max-w-2xl mx-auto">
            Cutwise outputs match real workflows.
          </p>

          {/* Topic carousel */}
          {(() => {
            const topics = [
              {
                title: 'Grouped by profile',
                explainer: 'All cuts organized by section type — IPE, HEB, UPN, and more. No hunting through mixed lists. Each profile gets its own clear section with cut counts and stock bar requirements.',
                ui: <GroupedByProfilePreview />,
              },
              {
                title: 'Organized per stock bar',
                explainer: 'Each stock bar shows exactly how it’s used — cuts, lengths, and waste. Perfect for saw operators who need to know what to cut next.',
                ui: <OrganizedPerStockBarPreview />,
              },
              {
                title: 'Ready for saw operators',
                explainer: 'Clear cut lists with lengths and positions. No interpretation needed — just follow the plan and cut.',
                ui: <ReadyForSawOperatorsPreview />,
              },
              {
                title: 'Easy to export and share',
                explainer: 'Export to Excel or PDF. Share with purchasing, planning, or the shop floor. Everyone gets the same clear output.',
                ui: <EasyToExportSharePreview />,
              },
            ]
            const t = topics[shopFloorTopic]
            return (
              <div className="max-w-4xl mx-auto">
                <div className="h-[560px] flex flex-col">
                  <div
                    key={shopFloorTopic}
                    className="flex flex-col items-center gap-1 flex-1 min-h-0 animate-shop-floor-in"
                  >
                    <div className="text-center h-[100px] flex flex-col justify-center shrink-0">
                      <h3 className="text-2xl md:text-3xl font-bold text-[#002D2A] mb-2">{t.title}</h3>
                      <p className="text-muted-foreground text-lg leading-relaxed max-w-xl mx-auto">
                        {t.explainer}
                      </p>
                    </div>
                    <div className="w-full flex justify-center items-center flex-1 min-h-[360px]">
                      {t.ui}
                    </div>
                  </div>
                  {/* Carousel pagination */}
                  <div className="flex justify-center gap-2 shrink-0 pt-2">
                  {topics.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setShopFloorTopic(i)}
                      className={`w-2.5 h-2.5 rounded-full transition-colors ${
                        i === shopFloorTopic ? 'bg-primary' : 'bg-[#002D2A]/20 hover:bg-[#002D2A]/40'
                      }`}
                      aria-label={`Go to topic ${i + 1}`}
                    />
                  ))}
                  </div>
                </div>
              </div>
            )
          })()}

          <p className="text-center text-[#002D2A]/60 font-medium mt-12">
            No learning curve. No new system.
          </p>
        </div>
      </section>

      {/* Precision Without Complexity Section */}
      <section id="precision" className="py-20 bg-background">
        <div className="container max-w-app mx-auto px-6">
          <div className="flex justify-center mb-6">
            <span className="inline-flex items-center rounded-full border border-gray-300 bg-gray-100 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-gray-600">
              Precision without complexity
            </span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-4 tracking-[-1px]">
            Reliable Results, Without Overengineering
          </h2>

          <div className="flex flex-col gap-6 md:gap-8 mt-12 max-w-4xl mx-auto">
            {/* Card 1: Text left, UI right */}
            <div className="flex flex-col md:flex-row items-stretch gap-6 md:gap-10 py-8 md:py-12 min-h-[200px] md:min-h-[240px]">
              <div className="flex-1 flex flex-col gap-2 text-center md:text-left order-2 md:order-1 justify-center">
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center mb-1 mx-auto md:mx-0">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                </div>
                <h3 className="text-2xl md:text-3xl font-bold text-gray-900">Handles real-world constraints</h3>
                <p className="text-gray-600 text-lg leading-relaxed">
                  Kerf, trim, tolerance, and miter from your project — no oversimplification. Cutwise works with the actual parameters you use on the shop floor.
                </p>
              </div>
              <div className="flex shrink-0 order-1 md:order-2 flex items-center justify-center md:items-stretch md:justify-end">
                <div className="aspect-square w-[180px] h-[180px] md:w-[240px] md:h-[240px]">
                  <RealWorldConstraintsPreview />
                </div>
              </div>
            </div>

            {/* Card 2: Text left, UI right */}
            <div className="flex flex-col md:flex-row items-stretch gap-6 md:gap-10 py-8 md:py-12 min-h-[200px] md:min-h-[240px]">
              <div className="flex-1 flex flex-col gap-2 text-center md:text-left order-2 md:order-1 justify-center">
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center mb-1 mx-auto md:mx-0">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
                <h3 className="text-2xl md:text-3xl font-bold text-gray-900">Reliability - Plans You Can Rely On</h3>
                <p className="text-gray-600 text-lg leading-relaxed">
                  Clear, structured outputs that your team can follow without second-guessing — from purchasing to cutting.
                </p>
              </div>
              <div className="flex shrink-0 order-1 md:order-2 flex items-center justify-center md:items-stretch md:justify-end">
                <div className="aspect-square w-[180px] h-[180px] md:w-[240px] md:h-[240px]">
                  <ConsistentOutputsPreview />
                </div>
              </div>
            </div>

            {/* Card 3: Text left, UI right */}
            <div className="flex flex-col md:flex-row items-stretch gap-6 md:gap-10 py-8 md:py-12 min-h-[200px] md:min-h-[240px]">
              <div className="flex-1 flex flex-col gap-2 text-center md:text-left order-2 md:order-1 justify-center">
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center mb-1 mx-auto md:mx-0">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-2xl md:text-3xl font-bold text-gray-900">Keeps the process simple and fast</h3>
                <p className="text-gray-600 text-lg leading-relaxed">
                  Upload your model, get your plan. No complex setup or lengthy configuration. Fast enough for tight deadlines.
                </p>
              </div>
              <div className="flex shrink-0 order-1 md:order-2 flex items-center justify-center md:items-stretch md:justify-end">
                <div className="aspect-square w-[180px] h-[180px] md:w-[240px] md:h-[240px]">
                  <SimpleProcessPreview />
                </div>
              </div>
            </div>
          </div>

          <p className="text-center text-gray-500 font-medium mt-12">
            You stay in control — with better data.
          </p>
        </div>
      </section>

      <PositioningSection />

      {/* Features Section */}
      <section id="features" className="hidden py-20 bg-[#002D2A] text-white">
        <div className="container max-w-app mx-auto px-3 md:px-6">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-14 tracking-[-1.3px]">Powerful Features</h2>

          <div className="space-y-12 md:space-y-16">
            <div className="space-y-6 border-b border-[#084242] pb-12 md:pb-16">
              <div className="max-w-3xl mx-auto text-center px-2 md:px-0">
                <div className="mb-4">
                  <div className="w-14 h-14 rounded-full bg-white/10 border border-white/20 flex items-center justify-center mx-auto mb-4">
                    <svg className="w-7 h-7 text-[#00FF9F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M8 7h8M8 12h8M8 17h5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <rect x="4" y="4" width="16" height="16" rx="2" strokeWidth="2"/>
                    </svg>
                  </div>
                  <h3 className="text-3xl font-bold">Profiles Cutting Plan</h3>
                </div>
                <p className="text-white/80 text-lg leading-relaxed max-w-xl mx-auto">
                  Generate practical cut patterns automatically, so your team spends less time planning and more time producing.
                </p>
              </div>
              <div className="overflow-hidden w-[90vw] md:w-full mx-auto">
                <NestingPreview />
              </div>
            </div>

            <div className="space-y-6 border-b border-[#084242] pb-12 md:pb-16">
              <div className="max-w-3xl mx-auto text-center px-2 md:px-0">
                <div className="mb-4">
                  <div className="w-14 h-14 rounded-full bg-white/10 border border-white/20 flex items-center justify-center mx-auto mb-4">
                    <svg className="w-7 h-7 text-[#00FF9F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M8 8h8M8 12h8M8 16h6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M6 4h9l3 3v13H6V4z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <h3 className="text-3xl font-bold">Bill Of Materials</h3>
                </div>
                <p className="text-white/80 text-lg leading-relaxed max-w-xl mx-auto">
                  Get a clear bill of materials with quantities, stock requirements, and leftovers ready for purchasing decisions.
                </p>
              </div>
              <div className="overflow-hidden w-[90vw] md:w-full mx-auto">
                <BOMPreview />
              </div>
            </div>

            <div className="space-y-6 border-b border-[#084242] pb-12 md:pb-16">
              <div className="max-w-3xl mx-auto text-center px-2 md:px-0">
                <div className="mb-4">
                  <div className="w-14 h-14 rounded-full bg-white/10 border border-white/20 flex items-center justify-center mx-auto mb-4">
                    <svg className="w-7 h-7 text-[#00FF9F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="8" strokeWidth="2"/>
                      <path d="M12 4v16M4 12h16" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <h3 className="text-3xl font-bold">3D Model Viewer</h3>
                </div>
                <p className="text-white/80 text-lg leading-relaxed max-w-xl mx-auto">
                  Validate parts directly in a model context, improving confidence before cutting and reducing shop-floor mistakes.
                </p>
              </div>
              <div className="overflow-hidden w-[90vw] md:w-full mx-auto">
                <ModelViewerPreview />
              </div>
            </div>

            <div className="space-y-6">
              <div className="max-w-3xl mx-auto text-center px-2 md:px-0">
                <div className="mb-4">
                  <div className="w-14 h-14 rounded-full bg-white/10 border border-white/20 flex items-center justify-center mx-auto mb-4">
                    <svg className="w-7 h-7 text-[#00FF9F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M4 14h5v6H4v-6zm6-4h5v10h-5V10zm6-6h5v16h-5V4z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <h3 className="text-3xl font-bold">Waste Optimization</h3>
                </div>
                <p className="text-white/80 text-lg leading-relaxed max-w-xl mx-auto">
                  See how every profile is arranged to reduce offcuts and maximize usable steel from each stock length.
                </p>
              </div>
              <div className="overflow-hidden w-[90vw] md:w-full mx-auto">
                <WasteOptimizationPreview />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-16 bg-[#F4F6F9]">
        <div className="container max-w-app mx-auto px-6">
          <div className="flex justify-center mb-6">
            <span className="inline-flex items-center rounded-full border border-gray-300 bg-gray-100 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-gray-600">
              Pricing
            </span>
          </div>
          <h2 className="text-4xl font-bold text-center mb-2 text-[#111827]">Pricing</h2>
          <p className="text-center text-[#4B5563] mb-10">Select the perfect credit package for your needs</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            <Card className="border border-[#D1D5DB] shadow-none bg-[#F9FAFB] h-full">
              <CardContent className="pt-6 flex h-full flex-col">
                <div className="w-12 h-12 rounded-xl bg-[#E5E7EB] flex items-center justify-center mb-5">
                  <svg className="w-6 h-6 text-[#4B5563]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M9 7h6M9 11h6M9 15h4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <rect x="6" y="3" width="12" height="18" rx="2" strokeWidth="2"/>
                  </svg>
                </div>
                <h3 className="text-4xl font-semibold text-[#111827] mb-1">Single Use</h3>
                <p className="text-[#6B7280] mb-4 min-h-[48px]">Perfect for trying out our service</p>
                <div className="h-px bg-[#D1D5DB] mb-5" />
                <div className="text-6xl font-bold tracking-tight text-[#111827] mb-6">€29</div>
                <p className="text-[#111827] font-semibold mb-5 opacity-0 select-none">Save 00% • €00.00 per project</p>
                <div className="flex items-center gap-2 text-[#111827] font-semibold mb-5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M5 13l4 4L19 7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>1 Project</span>
                </div>
                <div className="rounded-xl bg-[#F3F4F6] p-4 mb-5 flex-1">
                  <p className="text-xs font-bold tracking-wide text-[#6B7280] mb-3">EVERYTHING INCLUDED:</p>
                  <ul className="space-y-2 text-sm text-[#4B5563]">
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-[#6B7280] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M8 7h8M8 12h8M8 17h5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M6 4h9l3 3v13H6V4z" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span>Export Bill of Materials</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-[#6B7280] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M8 7h8M8 12h8M8 17h5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M4 12h16M16 8l4 4-4 4M8 8l-4 4 4 4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span>Export Optimized Cutting Plan</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-[#6B7280] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M4 6h16M7 10h10M9 14h6M11 18h2" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M5 4h14v16H5V4z" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span>Materials Analysis</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-[#6B7280] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M12 3l8 4-8 4-8-4 8-4zM4 7v10l8 4 8-4V7" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span>Live 3D Model Profile Selection</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-[#6B7280] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M6 18V9M12 18V6M18 18v-4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M4 20h16" strokeWidth="1.8" strokeLinecap="round"/>
                      </svg>
                      <span>Project Metrics</span>
                    </li>
                  </ul>
                </div>
                <a href="https://app.cutwise.pro/signup" className="block">
                  <Button className="w-full h-12 text-lg rounded-full bg-[#0F172A] hover:bg-[#111827] text-white">Select Plan</Button>
                </a>
              </CardContent>
            </Card>

            <Card className="border-2 border-[#111827] shadow-none bg-[#F9FAFB] relative h-full">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-[#0F172A] px-8 py-2 text-sm font-bold text-white tracking-wide">
                POPULAR
              </div>
              <CardContent className="pt-6 flex h-full flex-col">
                <div className="w-12 h-12 rounded-xl bg-[#E5E7EB] flex items-center justify-center mb-5">
                  <svg className="w-6 h-6 text-[#4B5563]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <ellipse cx="12" cy="6.5" rx="5.5" ry="2.5" strokeWidth="2" />
                    <path d="M6.5 6.5v6c0 1.4 2.5 2.5 5.5 2.5s5.5-1.1 5.5-2.5v-6" strokeWidth="2" />
                    <path d="M6.5 12.5v5c0 1.4 2.5 2.5 5.5 2.5s5.5-1.1 5.5-2.5v-5" strokeWidth="2" />
                  </svg>
                </div>
                <h3 className="text-4xl font-semibold text-[#111827] mb-1">Light Pack</h3>
                <p className="text-[#6B7280] mb-4 min-h-[48px]">Best for regular users</p>
                <div className="h-px bg-[#D1D5DB] mb-5" />
                <div className="text-6xl font-bold tracking-tight text-[#111827] mb-3">€499</div>
                <p className="text-[#111827] font-semibold mb-5">Save 14% • €24.95 per project</p>
                <div className="flex items-center gap-2 text-[#111827] font-semibold mb-5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M5 13l4 4L19 7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>20 Projects</span>
                </div>
                <div className="rounded-xl bg-[#F3F4F6] p-4 mb-5 flex-1">
                  <p className="text-xs font-bold tracking-wide text-[#6B7280] mb-3">EVERYTHING INCLUDED:</p>
                  <ul className="space-y-2 text-sm text-[#4B5563]">
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-[#6B7280] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M8 7h8M8 12h8M8 17h5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M6 4h9l3 3v13H6V4z" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span>Export Bill of Materials</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-[#6B7280] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M8 7h8M8 12h8M8 17h5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M4 12h16M16 8l4 4-4 4M8 8l-4 4 4 4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span>Export Optimized Cutting Plan</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-[#6B7280] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M4 6h16M7 10h10M9 14h6M11 18h2" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M5 4h14v16H5V4z" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span>Materials Analysis</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-[#6B7280] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M12 3l8 4-8 4-8-4 8-3zM4 7v10l8 4 8-4V7" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span>Live 3D Model Profile Selection</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-[#6B7280] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M6 18V9M12 18V6M18 18v-4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M4 20h16" strokeWidth="1.8" strokeLinecap="round"/>
                      </svg>
                      <span>Project Metrics</span>
                    </li>
                  </ul>
                </div>
                <a href="https://app.cutwise.pro/signup" className="block">
                  <Button className="w-full h-12 text-lg rounded-full bg-[#0A5A4A] hover:bg-[#084C3E] text-white">Select Plan</Button>
                </a>
              </CardContent>
            </Card>

            <Card className="border border-[#D1D5DB] shadow-none bg-[#F9FAFB] h-full">
              <CardContent className="pt-6 flex h-full flex-col">
                <div className="w-12 h-12 rounded-xl bg-[#E5E7EB] flex items-center justify-center mb-5">
                  <svg className="w-6 h-6 text-[#4B5563]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M7 4h10v3a5 5 0 0 1-10 0V4zM9 16h6M12 12v4M8 20h8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h3 className="text-4xl font-semibold text-[#111827] mb-1">Heavy Pack</h3>
                <p className="text-[#6B7280] mb-4 min-h-[48px]">Maximum savings for power users</p>
                <div className="h-px bg-[#D1D5DB] mb-5" />
                <div className="text-6xl font-bold tracking-tight text-[#111827] mb-3">€999</div>
                <p className="text-[#111827] font-semibold mb-5">Save 31% • €19.98 per project</p>
                <div className="flex items-center gap-2 text-[#111827] font-semibold mb-5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M5 13l4 4L19 7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>50 Projects</span>
                </div>
                <div className="rounded-xl bg-[#F3F4F6] p-4 mb-5 flex-1">
                  <p className="text-xs font-bold tracking-wide text-[#6B7280] mb-3">EVERYTHING INCLUDED:</p>
                  <ul className="space-y-2 text-sm text-[#4B5563]">
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-[#6B7280] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M8 7h8M8 12h8M8 17h5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M6 4h9l3 3v13H6V4z" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span>Export Bill of Materials</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-[#6B7280] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M8 7h8M8 12h8M8 17h5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M4 12h16M16 8l4 4-4 4M8 8l-4 4 4 4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span>Export Optimized Cutting Plan</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-[#6B7280] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M4 6h16M7 10h10M9 14h6M11 18h2" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M5 4h14v16H5V4z" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span>Materials Analysis</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-[#6B7280] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M12 3l8 4-8 4-8-4 8-3zM4 7v10l8 4 8-4V7" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span>Live 3D Model Profile Selection</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-[#6B7280] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M6 18V9M12 18V6M18 18v-4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M4 20h16" strokeWidth="1.8" strokeLinecap="round"/>
                      </svg>
                      <span>Project Metrics</span>
                    </li>
                  </ul>
                </div>
                <a href="https://app.cutwise.pro/signup" className="block">
                  <Button className="w-full h-12 text-lg rounded-full bg-[#0F172A] hover:bg-[#111827] text-white">Select Plan</Button>
                </a>
              </CardContent>
            </Card>
          </div>

          <div className="max-w-6xl mx-auto mt-10 pt-2">
            <div className="flex flex-wrap justify-center items-center gap-8 text-[#374151] text-xl font-medium">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
                <span>Secure Payment</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>SSL Encrypted</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-[#0070ba]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.067 8.478c.492.88.556 2.014.3 3.327-.74 3.806-3.276 5.12-6.514 5.12h-.5a.805.805 0 00-.794.68l-.04.22-.63 3.993-.028.15a.806.806 0 01-.795.68H8.29c-.44 0-.77-.36-.656-.793l2.4-15.213c.067-.42.44-.73.866-.73h4.92c.94 0 1.67.08 2.23.26.48.15.89.37 1.23.68.34.3.6.67.78 1.1z" />
                  <path d="M7.27 3.11c.07-.43.44-.73.87-.73h5.7c1.95 0 3.27.4 4.02 1.42.36.48.58 1.05.68 1.74.1.7.08 1.54-.08 2.54v.01c-.74 3.81-3.28 5.13-6.52 5.13h-.5c-.44 0-.82.32-.87.75l-.72 4.56c-.06.4-.4.69-.8.69H6.6c-.44 0-.77-.36-.66-.79L7.27 3.11z" opacity=".7" />
                </svg>
                <span>PayPal Protected</span>
              </div>
            </div>
            <p className="text-center text-sm text-[#6B7280] mt-3">
              All payments are processed securely through PayPal. Your financial information is never stored on our servers.
            </p>
            <p className="text-center text-sm text-[#6B7280]">
              PayPal's buyer protection ensures your purchase is safe and secure.
            </p>
          </div>
        </div>
      </section>

      <BlogSection />

      {/* FAQ Section */}
      <section id="faq" className="py-20 bg-[#F4F6F9]">
        <div className="container max-w-app mx-auto px-6">
          <div className="flex justify-center mb-6">
            <span className="inline-flex items-center rounded-full border border-gray-300 bg-gray-100 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-gray-600">
              Faq&apos;s
            </span>
          </div>
          <h2 className="text-5xl font-bold text-center mb-14">Frequently Asked Questions</h2>
          <div className="max-w-4xl mx-auto space-y-4">
            {faqs.map((faq, index) => (
              <Card key={index} className="border shadow-sm">
                <button
                  onClick={() => toggleFaq(index)}
                  className="w-full px-8 py-5 text-left flex justify-between items-center hover:bg-muted/50 transition-colors"
                >
                  <span className="font-semibold text-xl">{faq.question}</span>
                  <svg
                    className={`w-6 h-6 text-primary transition-transform ${activeFaq === index ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M19 9l-7 7-7-7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                {activeFaq === index && (
                  <div className="px-8 pt-3 pb-5">
                    <p className="text-muted-foreground text-base leading-relaxed">{faq.answer}</p>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/blog" element={<BlogPage />} />
        <Route path="/blog/:slug" element={<BlogPostPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
