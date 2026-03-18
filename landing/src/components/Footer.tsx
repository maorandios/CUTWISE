export const Footer = () => (
  <>
    {/* Contact Section */}
    <section id="contact" className="pt-16 pb-10 bg-gray-900 text-white">
      <div className="container max-w-app mx-auto px-6">
        <h2 className="text-4xl font-bold text-center mb-12">Get in Touch</h2>
        <div className="max-w-3xl mx-auto text-center">
          <div>
            <h3 className="text-2xl font-bold mb-4">Have questions?</h3>
            <p className="text-gray-300 mb-6">We&apos;re here to help you optimize your steel fabrication process.</p>
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
  </>
)
