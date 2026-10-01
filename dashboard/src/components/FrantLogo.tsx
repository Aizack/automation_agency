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
  const redAccent = '#E95835'; // Official Brand Red/Orange Accent

  let bgFill = '#141414'; // Dark rounded container background
  let fFill = '#F8F6F0';  // Off-white logo fill color
  let strokeColor = 'none';
  let strokeWidth = 0;

  if (variant === 'light') {
    bgFill = '#F8F6F0';
    fFill = '#1C1D1C';
  } else if (variant === 'outline') {
    bgFill = '#141414';
    fFill = 'none';
    strokeColor = '#F8F6F0';
    strokeWidth = 14;
  } else if (variant === 'mark') {
    bgFill = 'transparent';
    fFill = '#1C1D1C';
  } else if (variant === 'mark-light') {
    bgFill = 'transparent';
    fFill = '#F8F6F0';
  }

  const isMark = variant === 'mark' || variant === 'mark-light';

  const renderSvg = () => (
    <svg
      width={numSize}
      height={numSize}
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="flex-shrink-0 select-none"
      style={{ display: 'block' }}
    >
      {/* Outer rounded container for framed variants */}
      {!isMark && (
        <rect
          x="0"
          y="0"
          width="512"
          height="512"
          rx="130"
          fill={bgFill}
          stroke={variant === 'light' ? '#E2DFD7' : 'none'}
          strokeWidth={variant === 'light' ? 12 : 0}
        />
      )}

      {/* Official Frant Logo Vector Paths */}
      <g transform={isMark ? 'translate(0,0) scale(1)' : 'translate(64, 64) scale(0.75)'}>
        {variant === 'outline' ? (
          <g stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" fill="none">
            <path d="M134.81,8.47v496.69H23.57c-7.25,0-19.51-16.56-17.64-24.96l1-353.41c2.33-5.54,4.24-12.47,8.12-17.02C23.69,99.67,113.68,14.49,120.22,11.4c4.83-2.27,9.16-3.67,14.59-2.94Z" />
            <path d="M162.14,131.68V8.47h333.73c13.09,0,4.31,64.85-2.44,78.45-7.77,15.64-38.94,44.76-56.11,44.76H162.14Z" />
            <path d="M287.04,216.39v105.88c0,.41-5.44,5.78-5.85,5.78h-119.05v-111.66h124.91Z" />
            <rect x="304.35" y="216.39" width="102.9" height="111.66" rx="15" ry="15" fill={redAccent} stroke="none" />
          </g>
        ) : (
          <g fill={fFill}>
            <path d="M134.81,8.47v496.69H23.57c-7.25,0-19.51-16.56-17.64-24.96l1-353.41c2.33-5.54,4.24-12.47,8.12-17.02C23.69,99.67,113.68,14.49,120.22,11.4c4.83-2.27,9.16-3.67,14.59-2.94Z" />
            <path d="M162.14,131.68V8.47h333.73c13.09,0,4.31,64.85-2.44,78.45-7.77,15.64-38.94,44.76-56.11,44.76H162.14Z" />
            <path d="M287.04,216.39v105.88c0,.41-5.44,5.78-5.85,5.78h-119.05v-111.66h124.91Z" />
            <rect fill={redAccent} x="304.35" y="216.39" width="102.9" height="111.66" rx="15" ry="15" />
          </g>
        )}
      </g>
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
