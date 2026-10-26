import React from 'react';

interface BlueStarLogoProps {
  className?: string;
  compact?: boolean;
}

/**
 * Authentic Blue Star Corporate Logo SVG matching the official corporate emblem
 * supplied by the user (blue square emblem with the iconic 5-point split-leg star
 * paired with the bold geometric BLUE STAR wordmark block).
 * Preserves aspect ratio and contrast across both light and dark surfaces.
 */
export const BlueStarLogo: React.FC<BlueStarLogoProps> = ({
  className = 'h-9',
  compact = false,
}) => {
  if (compact) {
    return (
      <svg
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${className} w-auto shrink-0 select-none`}
        role="img"
        aria-label="Blue Star"
      >
        <rect width="64" height="64" fill="#0757A6" />
        <rect x="5" y="5" width="54" height="54" fill="#FFFFFF" />
        <path
          d="M32 10L37.4 25.8H54L40.6 35.4L45.8 51.2L32 41.3L18.2 51.2L23.4 35.4L10 25.8H26.6L32 10Z"
          fill="#0757A6"
        />
        <path
          d="M32 20.5L35.1 29.6H44.6L36.9 35.1L39.8 44.2L32 38.6L24.2 44.2L27.1 35.1L19.4 29.6H28.9L32 20.5Z"
          fill="#FFFFFF"
        />
        {/* Iconic Blue Star split-leg detail */}
        <path d="M31.5 23L34.5 31" stroke="#0757A6" strokeWidth="1.6" />
        <path d="M34 37.5L44.5 50" stroke="#FFFFFF" strokeWidth="2.4" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 340 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} w-auto shrink-0 select-none`}
      role="img"
      aria-label="Blue Star"
    >
      {/* Left Star Emblem Box */}
      <rect x="0" y="0" width="64" height="64" fill="#0757A6" />
      <rect x="5" y="5" width="54" height="54" fill="#FFFFFF" />
      <path
        d="M32 10L37.4 25.8H54L40.6 35.4L45.8 51.2L32 41.3L18.2 51.2L23.4 35.4L10 25.8H26.6L32 10Z"
        fill="#0757A6"
      />
      <path
        d="M32 20.5L35.1 29.6H44.6L36.9 35.1L39.8 44.2L32 38.6L24.2 44.2L27.1 35.1L19.4 29.6H28.9L32 20.5Z"
        fill="#FFFFFF"
      />
      <path d="M34 37.5L44.5 50" stroke="#FFFFFF" strokeWidth="2.4" />

      {/* Right Corporate Blue Banner with Geometric BLUE STAR Wordmark */}
      <rect x="72" y="0" width="268" height="64" fill="#0757A6" />
      <text
        x="206"
        y="41"
        textAnchor="middle"
        fill="#FFFFFF"
        fontFamily="'Outfit', 'Plus Jakarta Sans', sans-serif"
        fontWeight="700"
        fontSize="28"
        letterSpacing="0.14em"
      >
        BLUE STAR
      </text>
    </svg>
  );
};
