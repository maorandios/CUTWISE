interface FooterProps {
  className?: string
}

export const Footer = ({ className = '' }: FooterProps) => {
  const currentYear = new Date().getFullYear()

  return (
    <footer className={`bg-[#F9FAFB] border-t border-[#E0E0E0] ${className}`}>
      <div className="max-w-[1440px] mx-auto px-6 py-8">
        <div className="flex flex-col items-center gap-[5px]">
          {/* Logo */}
          <img
            src="/Icons/cutwise logo light.svg"
            alt="Cutwise"
            className="h-10"
          />

          {/* Copyright */}
          <span className="text-sm text-gray-600">
            © {currentYear} CUTWISE. All rights reserved.
          </span>
        </div>
      </div>
    </footer>
  )
}
