import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/card'
import { WasteOptimizationPreview } from './components/WasteOptimizationPreview'
import { NestingPreview } from './components/NestingPreview'
import { BOMPreview } from './components/BOMPreview'
import { ModelViewerPreview } from './components/ModelViewerPreview'

function App() {
  const [activeFaq, setActiveFaq] = useState<number | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

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
              <a href="#features" className="text-sm font-medium text-white/70 hover:text-white transition-colors">Powerful features</a>
              <a href="#pricing" className="text-sm font-medium text-white/70 hover:text-white transition-colors">Pricing</a>
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
                  href="#features" 
                  className="text-base font-medium text-white/70 hover:text-white transition-colors py-2 text-center"
                  onClick={closeMobileMenu}
                >
                  Powerful features
                </a>
                <a 
                  href="#pricing" 
                  className="text-base font-medium text-white/70 hover:text-white transition-colors py-2 text-center"
                  onClick={closeMobileMenu}
                >
                  Pricing
                </a>
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
        <section className="container max-w-app mx-auto px-6 py-10 md:py-12 text-center flex-1 flex flex-col justify-center">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-[-1.3px] leading-tight mb-4 md:mb-6">
            Optimizing Steel Cutting Plans for{' '}
            <span className="relative inline-block">
              Maximum
              <span className="absolute left-0 -bottom-1 h-1 w-full rounded-full bg-orange-400/90" aria-hidden="true" />
            </span>{' '}
            Material Use,{' '}
            <span className="relative inline-block">
              Minimum
              <span className="absolute left-0 -bottom-1 h-1 w-full rounded-full bg-orange-400/90" aria-hidden="true" />
            </span>{' '}
            Waste
          </h1>
          <p className="text-xl md:text-xl text-primary-foreground/90 mb-6 md:mb-8 max-w-3xl mx-auto">
            Turn complex steel jobs into a clear plan-optimizing materials usage while minimizing waste from the first cut.
          </p>
          <div id="video" className="w-full max-w-4xl mx-auto mb-6 md:mb-8">
            <div className="w-full h-[220px] md:h-[360px] bg-gray-900/90 rounded-[15px] shadow-2xl flex items-center justify-center">
              <div className="text-center text-white">
                <svg className="w-20 h-20 mx-auto mb-4 text-[#2B6E54]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" strokeWidth="2"/>
                  <polygon points="10 8 16 12 10 16 10 8" fill="currentColor"/>
                </svg>
                <p className="text-lg">Video coming soon</p>
              </div>
            </div>
          </div>
          <div className="flex justify-center">
            <a href="https://app.cutwise.pro">
              <Button className="rounded-full bg-[#111827] text-[#00FF9F] hover:bg-white hover:text-gray-800 h-[60px] px-10 text-lg font-bold shadow-lg">
                Start Free
              </Button>
            </a>
          </div>
          <div className="mt-[25px] flex justify-center">
            <div className="flex flex-col md:flex-row max-w-full items-center gap-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-2 text-sm font-medium text-white whitespace-nowrap">
                <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M13 7l5 5-5 5M6 7l5 5-5 5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>Faster Optimization</span>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-2 text-sm font-medium text-white whitespace-nowrap">
                <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M17 7.5a6 6 0 1 0 0 9" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M7 10h8M7 14h8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>Lower Material Costs</span>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-2 text-sm font-medium text-white whitespace-nowrap">
                <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <rect x="3" y="5" width="6" height="6" rx="1.25" strokeWidth="1.8"/>
                  <rect x="15" y="5" width="6" height="6" rx="1.25" strokeWidth="1.8"/>
                  <rect x="9" y="13" width="6" height="6" rx="1.25" strokeWidth="1.8"/>
                  <path d="M9 8h6M12 11v2" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>Automated Cutting Plans</span>
              </div>
            </div>
          </div>
        </section>

      </div>

      {/* Advantages Section */}
      <section id="about" className="py-16 bg-background">
        <div className="container max-w-app mx-auto px-6">
          <div className="max-w-6xl mx-auto mb-16 px-8 md:px-14">
            <p className="text-center text-3xl md:text-5xl font-semibold leading-[1.35] tracking-[-1.3px] text-[#002D2A]">
              Cutwise converts IFC models into production-ready cutting plans in seconds—reducing material waste, lowering steel costs, and automating nesting, reporting, and purchasing in one workflow.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-0 md:divide-x md:divide-border">
            <Card className="border-0 shadow-none rounded-none bg-transparent md:px-6">
              <CardContent className="pt-6 flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <svg className="w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-3">Advanced Algorithms</h3>
                <p className="text-muted-foreground">Sophisticated optimization algorithms that find the best cutting patterns to minimize material waste</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-none rounded-none bg-transparent md:px-6">
              <CardContent className="pt-6 flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <svg className="w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M13 10V3L4 14h7v7l9-11h-7z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-3">Fast Processing</h3>
                <p className="text-muted-foreground">Generate optimal nesting reports in seconds, not hours. Upload your IFC file and get results instantly</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-none rounded-none bg-transparent md:px-6">
              <CardContent className="pt-6 flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <svg className="w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-3">Detailed Reports</h3>
                <p className="text-muted-foreground">Comprehensive cutting plans with bill of materials, stock requirements, and waste analysis</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-[#002D2A] text-white">
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

      {/* FAQ Section */}
      <section id="faq" className="py-20 bg-[#F4F6F9]">
        <div className="container max-w-app mx-auto px-6">
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

      {/* Contact Section */}
      <section id="contact" className="pt-16 pb-10 bg-gray-900 text-white">
        <div className="container max-w-app mx-auto px-6">
          <h2 className="text-4xl font-bold text-center mb-12">Get in Touch</h2>
          <div className="max-w-3xl mx-auto text-center">
            <div>
              <h3 className="text-2xl font-bold mb-4">Have questions?</h3>
              <p className="text-gray-300 mb-6">We're here to help you optimize your steel fabrication process.</p>
              <div className="inline-flex flex-col items-center gap-3 rounded-[36px] border border-[#194327] bg-[#00FF9F]/10 text-white px-10 py-6">
                <div className="w-14 h-14 rounded-full bg-[#00FF9F]/20 flex items-center justify-center">
                  <svg className="w-6 h-6 text-[#00FF9F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <p className="text-sm uppercase tracking-wide text-[#00FF9F]/90">Email us</p>
                <a href="mailto:Hello@cutwise.pro" className="text-lg font-semibold text-white hover:text-[#00FF9F] transition-colors">
                  Hello@cutwise.pro
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white pt-2 pb-12">
        <div className="container max-w-app mx-auto px-6">
          <div className="border-t border-gray-800 pt-8 text-center">
            <img src="/Icons/cutwise manu logo.svg" alt="Cutwise" className="h-10 mx-auto mb-4" />
            <p className="text-gray-500 text-xs">&copy; 2026 Cutwise. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App
