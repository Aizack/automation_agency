import React from 'react';

interface FrantLogoProps {
  variant?: 'dark' | 'light' | 'outline' | 'mark' | 'mark-light';
  size?: number | string;
  className?: string;
  showText?: boolean;
  textClassName?: string;
  subtext?: string;
}

export const FrantLogo: React.FC<FrantLogoProps> = ({
  variant = 'dark',
  size = 40,
  className = '',
  showText = false,
  textClassName = '',
  subtext
}) => {
  const numSize = typeof size === 'number' ? size : parseInt(size as string, 10) || 40;
  const redAccent = '#E03E25'; // Authentic Brand Red Accent

  let bgFill = '#141414'; // Dark rounded container background
  let fFill = '#F8F6F0';  // Off-white logo color
  let strokeColor = 'none';
  let strokeWidth = 0;

  if (variant === 'light') {
    bgFill = '#F8F6F0';
    fFill = '#141414';
  } else if (variant === 'outline') {
    bgFill = '#141414';
    fFill = 'none';
    strokeColor = '#F8F6F0';
    strokeWidth = 3.2;
  } else if (variant === 'mark') {
    bgFill = 'transparent';
    fFill = '#141414';
  } else if (variant === 'mark-light') {
    bgFill = 'transparent';
    fFill = '#F8F6F0';
  }

  const renderSvg = () => (
    <svg
      width={numSize}
      height={numSize}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="flex-shrink-0 select-none"
      style={{ display: 'block' }}
    >
      {/* Outer rounded square container */}
      {variant !== 'mark' && variant !== 'mark-light' && (
        <rect
          x="2"
          y="2"
          width="96"
          height="96"
          rx="26"
          fill={bgFill}
          stroke={variant === 'light' ? '#E2DFD7' : 'none'}
          strokeWidth={variant === 'light' ? 1.5 : 0}
        />
      )}

      {variant === 'outline' ? (
        <g stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" fill="none">
          {/* Vertical Stem with 45-degree diagonal fold */}
          <path d="M 28 77 V 37 L 44 21 V 77 Z" />
          {/* Seam line */}
          <line x1="28" y1="37" x2="44" y2="21" />
          {/* Top Bar (Longer) */}
          <path d="M 44 21 H 66 C 73.5 21 77.5 25.5 77.5 33.5 C 77.5 41.5 73.5 46 66 46 H 44 Z" />
          {/* Middle Bar (Shorter) */}
          <rect x="44" y="54" width="16" height="15" />
          {/* Red Accent Square */}
          <rect x="64" y="54" width="15" height="15" rx="2" fill={redAccent} stroke="none" />
        </g>
      ) : (
        <g fill={fFill}>
          {/* Vertical Stem with 45-degree origami fold */}
          <path d="M 28 77 V 37 L 44 21 V 77 H 28 Z" />
          {/* Top Bar (Longer with rounded right end) */}
          <path d="M 44 21 H 66 C 73.5 21 77.5 25.5 77.5 33.5 C 77.5 41.5 73.5 46 66 46 H 44 V 21 Z" />
          {/* Middle Bar (Shorter) */}
          <rect x="44" y="54" width="16" height="15" />
          {/* Signature Red Accent Square */}
          <rect x="64" y="54" width="15" height="15" rx="2" fill={redAccent} />
        </g>
      )}
    </svg>
  );

  if (!showText) {
    return <div className={`inline-flex items-center justify-center ${className}`}>{renderSvg()}</div>;
  }

  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      {renderSvg()}
      <div className="flex flex-col">
        <span
          className={`font-serif text-xl font-bold tracking-wider uppercase leading-none text-[#161616] ${textClassName}`}
          style={{ fontFamily: '"Instrument Serif", Georgia, serif' }}
        >
          FRANT ERP
        </span>
        {subtext && (
          <span className="text-[10px] font-medium text-[#6B6862] tracking-normal mt-0.5">
            {subtext}
          </span>
        )}
      </div>
    </div>
  );
};
