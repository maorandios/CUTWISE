import { Button } from '@/components/ui/Button';
import { Wrench, CreditCard } from 'lucide-react';

interface HeaderProps {
  onSettingsClick?: () => void;
  onLogout: () => void;
  showBackButton?: boolean;
  onBackClick?: () => void;
  showUploadButton?: boolean;
  onUploadClick?: () => void;
  title?: string;
  showNestingSettings?: boolean;
  onNestingSettingsClick?: () => void;
  credits?: number;
  showCredits?: boolean;
}

export function Header({
  onSettingsClick,
  onLogout,
  showBackButton = false,
  onBackClick,
  showUploadButton = false,
  onUploadClick,
  title,
  showNestingSettings = false,
  onNestingSettingsClick,
  credits,
  showCredits = false,
}: HeaderProps) {
  return (
    <>
      <header className="bg-[#11181C]">
        <div className="max-w-[1200px] mx-auto px-6 py-4 flex items-center justify-between">
          <img
            src="/Icons/cutwise manu logo.svg"
            alt="Cutwise"
            className="h-10 -ml-1"
          />
          <div className="flex items-center gap-3">
            {showCredits && (
              <div className="flex items-center gap-2 px-4 py-2 bg-[#0A5048] rounded-lg">
                <CreditCard className="w-4 h-4 text-white" />
                <span className="text-white font-semibold">{credits !== undefined ? credits : '...'}</span>
                <span className="text-white/80 text-sm">credits</span>
              </div>
            )}
            {showUploadButton && onUploadClick && (
              <Button onClick={onUploadClick} className="bg-blue-600 hover:bg-blue-700 text-white">
                Upload New Project
              </Button>
            )}
            {onSettingsClick && (
              <Button
                variant="ghost"
                onClick={onSettingsClick}
                className="text-white hover:text-white hover:bg-gray-700 flex items-center gap-2"
              >
                <img src="/Icons/cog.svg" alt="Settings" className="w-5 h-5 select-none" style={{ imageRendering: '-webkit-optimize-contrast' }} />
                <span className="text-sm font-medium">Settings</span>
              </Button>
            )}
            <Button
              variant="ghost"
              onClick={onLogout}
              className="text-white hover:text-white hover:bg-gray-700 flex items-center gap-2"
            >
              <img src="/Icons/logout.svg" alt="Logout" className="w-5 h-5 select-none" style={{ imageRendering: '-webkit-optimize-contrast' }} />
              <span className="text-sm font-medium">Logout</span>
            </Button>
          </div>
        </div>
      </header>
      
      {/* Back Button - Separate from header */}
      {showBackButton && onBackClick && (
        <div className="bg-[#11181C]">
          <div className="max-w-[1200px] mx-auto px-6 py-2 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                onClick={onBackClick}
                title="Back to dashboard"
                className="text-white hover:text-white hover:bg-gray-700 flex items-center gap-2 px-3 py-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="text-sm">Back to dashboard</span>
              </Button>
              
              {title && (
                <>
                  <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                  <span className="text-white text-sm font-medium">
                    Project name: {title}
                  </span>
                </>
              )}
            </div>
            
            {showNestingSettings && onNestingSettingsClick && (
              <Button
                variant="ghost"
                onClick={onNestingSettingsClick}
                title="Technical Settings"
                className="text-white hover:text-white hover:bg-gray-700 flex items-center gap-2 px-3 py-1"
              >
                <Wrench className="w-5 h-5" />
                <span className="text-sm">Technical Settings</span>
              </Button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
