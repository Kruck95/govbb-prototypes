import type { ReactNode } from 'react';
import { GobLogo } from './GobLogo';

/**
 * Outer chrome shared by every screen. Matches the structure of
 * every prototypes/*.html: blue top bar, yellow header, alpha-banner
 * slot, content, footer. `bannerSlot` lets each screen put its own
 * context info in the alpha-banner zone.
 */
interface ChromeFrameProps {
  children: ReactNode;
  bannerSlot?: ReactNode;
  /** When true, the main content area spans full width (tool surfaces) */
  fullWidth?: boolean;
}

export function ChromeFrame({ children, bannerSlot, fullWidth = false }: ChromeFrameProps) {
  return (
    <div className="flex min-h-screen flex-col bg-bb-white-00 text-bb-black-00">
      {/* Top bar — identical to citizen prototypes */}
      <div className="bg-bb-blue-100 text-bb-white-00">
        <div className="govbb-container flex items-center gap-2 py-2 text-[0.875rem]">
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/thumb/b/bc/Coat_of_arms_of_Barbados_%282%29.svg/1280px-Coat_of_arms_of_Barbados_%282%29.svg.png"
            alt="Coat of arms of Barbados"
            style={{ height: 20, width: 'auto' }}
          />
          Official website of the Government of Barbados
        </div>
      </div>

      {/* Yellow header — identical to citizen prototypes */}
      <header className="bg-bb-yellow-100">
        <div className="govbb-container py-s">
          <GobLogo />
        </div>
      </header>

      {/* Banner slot — alpha banner on citizen forms, tool context here */}
      {bannerSlot ? (
        <div className="bg-bb-blue-10 border-b border-[#c0c8d8]">
          <div className={fullWidth ? 'tool-container' : 'govbb-container'}>{bannerSlot}</div>
        </div>
      ) : null}

      {/* Main */}
      <main className="flex flex-1 min-h-0 flex-col">{children}</main>

      {/* Footer — matches citizen prototypes */}
      <footer className="bg-bb-blue-100 text-bb-white-00">
        <div className="govbb-container py-m text-[1rem]">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <p>&copy; 2026 Government of Barbados. All rights reserved.</p>
            <div className="flex gap-4">
              <a href="#" className="underline underline-offset-2 hover:no-underline text-bb-white-00">
                Privacy
              </a>
              <a href="#" className="underline underline-offset-2 hover:no-underline text-bb-white-00">
                Terms
              </a>
              <a href="#" className="underline underline-offset-2 hover:no-underline text-bb-white-00">
                Accessibility
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
