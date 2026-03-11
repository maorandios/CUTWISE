interface FooterProps {
  className?: string
}

export const Footer = ({ className = '' }: FooterProps) => {
  return (
    <footer className={`bg-gray-50 border-t border-[#E0E0E0] ${className}`}>
      <div className="max-w-[1200px] mx-auto px-6 py-5">
        <div className="flex items-center justify-between">
          {/* Logo and Support Email */}
          <div className="flex items-center gap-3">
            <img
              src="/Icons/Cutwise for pdf main.svg"
              alt="Cutwise"
              className="h-10"
            />
            <span className="text-gray-400">•</span>
            <span className="text-sm text-gray-600">
              Support: <a href="mailto:Hello@cutwise.pro" className="text-gray-600 hover:text-gray-900 transition-colors">Hello@cutwise.pro</a>
            </span>
          </div>
          
          {/* Live Status Indicator */}
          <div className="flex items-center gap-2">
            <div className="relative flex items-center justify-center">
              <div className="h-2 w-2 rounded-full bg-green-500"></div>
              <div className="absolute h-2 w-2 rounded-full bg-green-500 animate-ping opacity-75"></div>
            </div>
            <span className="text-sm text-gray-600">System Status: Operational <span className="text-gray-400 mx-1">•</span> Optimization Engine Ready</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
