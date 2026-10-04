import React from 'react';

interface HanhPhamLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  showText?: boolean;
  layout?: 'horizontal' | 'vertical';
  subtitle?: string;
  brandName?: string;
  variant?: 'dark' | 'light' | 'gold' | 'monochrome';
}

export const HanhPhamLogo: React.FC<HanhPhamLogoProps> = ({
  className = '',
  size = 'md',
  showText = false,
  layout = 'horizontal',
  brandName = 'HẠNH PHẠM MANAGER',
}) => {
  const sizeMap = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
    xl: 'w-20 h-20',
    '2xl': 'w-28 h-28',
  };

  return (
    <div
      className={`inline-flex ${
        layout === 'vertical' ? 'flex-col items-center text-center' : 'items-center text-left'
      } gap-3 ${className}`}
    >
      {/* Bridal Crest: Original Black Background with Crisp White Logo */}
      <div
        className={`${sizeMap[size]} bg-black text-white rounded-2xl flex items-center justify-center p-2 relative flex-shrink-0 transition-transform duration-300 hover:scale-105 group overflow-hidden border border-stone-800 shadow-md`}
      >
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full object-contain filter drop-shadow-sm"
        >
          {/* Octagon Diamond Crest Outline in White */}
          <rect
            x="10"
            y="10"
            width="80"
            height="80"
            rx="16"
            stroke="#FFFFFF"
            strokeWidth="1.6"
            strokeOpacity="0.9"
          />

          {/* Corner Sparkles in Crisp White */}
          <circle cx="50" cy="13" r="1.5" fill="#FFFFFF" />
          <circle cx="50" cy="87" r="1.5" fill="#FFFFFF" />
          <circle cx="13" cy="50" r="1.5" fill="#FFFFFF" />
          <circle cx="87" cy="50" r="1.5" fill="#FFFFFF" />

          {/* Apex Diamond Motif in White */}
          <path
            d="M 50 17 L 52.5 21 L 50 25 L 47.5 21 Z"
            fill="#FFFFFF"
          />

          {/* LETTER 'H' (Left Serif Pillar) in White */}
          <path
            d="M 28 32 L 36 32 M 32 32 L 32 68 M 28 68 L 36 68"
            stroke="#FFFFFF"
            strokeWidth="3.2"
            strokeLinecap="round"
          />

          {/* LETTER 'H' (Crossbar linking seamlessly to P) in White */}
          <path
            d="M 32 50 L 52 50"
            stroke="#FFFFFF"
            strokeWidth="2.6"
            strokeLinecap="round"
          />

          {/* LETTER 'H' Right Pillar & 'P' Vertical Spine in White */}
          <path
            d="M 48 32 L 56 32 M 52 32 L 52 68 M 48 68 L 56 68"
            stroke="#FFFFFF"
            strokeWidth="3.2"
            strokeLinecap="round"
          />

          {/* LETTER 'P' (Haute Couture Curve) in White */}
          <path
            d="M 52 33 C 68 33, 73 39, 73 47 C 73 55, 66 59, 52 59"
            stroke="#FFFFFF"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Bridal Veil Swash in White */}
          <path
            d="M 24 72 C 34 67, 44 71, 56 65 C 66 60, 72 57, 76 53"
            stroke="#FFFFFF"
            strokeWidth="1.6"
            strokeLinecap="round"
            opacity="0.9"
          />
        </svg>
      </div>

      {showText && (
        <div className={layout === 'vertical' ? 'text-center mt-1' : 'text-left'}>
          <span className="font-bridal text-xl sm:text-2xl font-bold tracking-[0.08em] text-stone-900 uppercase block leading-none">
            {brandName}
          </span>
        </div>
      )}
    </div>
  );
};
