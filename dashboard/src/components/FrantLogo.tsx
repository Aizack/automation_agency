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

  // Render SVG Mark (F with red square accent)
  const renderSvg = () => {
    // Colors
    const redAccent = '#D9381E'; // Wabi-Sabi Red Accent
    
    let bgFill = '#161616'; // Dark badge background
    let fFill = '#FAF8F3';  // Off-white cream 'F'
    let strokeColor = 'none';
    let strokeWidth = 0;

    if (variant === 'light') {
      bgFill = '#FAF8F3';
      fFill = '#161616';
    } else if (variant === 'outline') {
      bgFill = '#161616';
      fFill = 'none';
      strokeColor = '#FAF8F3';
      strokeWidth = 3.5;
    } else if (variant === 'mark') {
      bgFill = 'transparent';
      fFill = '#161616';
    } else if (variant === 'mark-light') {
      bgFill = 'transparent';
      fFill = '#FAF8F3';
    }

    return (
      <svg
        width={numSize}
        height={numSize}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0 select-none transition-transform duration-200"
        style={{ display: 'block' }}
      >
        {/* Rounded square container for badge modes */}
        {variant !== 'mark' && variant !== 'mark-light' && (
          <rect
            x="2"
            y="2"
            width="96"
            height="96"
            rx="24"
            fill={bgFill}
            stroke={variant === 'light' ? '#E2DFD7' : 'none'}
            strokeWidth={variant === 'light' ? 1.5 : 0}
          />
        )}

        {/* Outer path of the 'F' stem and top bar */}
        {variant === 'outline' ? (
          <path
            d="M 28 76 V 42 C 28 32 34 26 44 26 H 64 C 70 26 74 30 74 36 C 74 42 70 46 64 46 H 44 V 76 Z"
            fill="none"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : (
          <path
            d="M 27 76 V 40 C 27 30 33 24 43 24 H 63 C 69 24 73 28 73 34 C 73 40 69 44 63 44 H 43 V 76 H 27 Z"
            fill={fFill}
          />
        )}

        {/* Middle arm of the 'F' */}
        {variant === 'outline' ? (
          <rect
            x="44"
            y="52"
            width="14"
            height="14"
            rx="2"
            fill="none"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
          />
        ) : (
          <rect
            x="43"
            y="52"
            width="15"
            height="14"
            rx="2"
            fill={fFill}
          />
        )}

        {/* Signature Red Accent Square */}
        <rect
          x="62"
          y="52"
          width="14"
          height="14"
          rx="3"
          fill={redAccent}
        />
      </svg>
    );
  };

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
