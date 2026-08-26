import React from 'react';

interface VaultLogoProps {
  className?: string;
  size?: number;
}

export const VaultLogo: React.FC<VaultLogoProps> = ({ className = 'w-8 h-8', size = 32 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Outer Shield with glowing aesthetic */}
      <path
        d="M50 8L86 22V50C86 72 50 92 50 92C50 92 14 72 14 50V22L50 8Z"
        stroke="#0070f3"
        strokeWidth="5"
        strokeLinejoin="round"
        fill="#0070f3"
        fillOpacity="0.08"
      />
      {/* Inner Book / Circuit Architecture */}
      {/* Left Book Page */}
      <path
        d="M26 36V66C36 62 45 64 50 68V38C45 34 36 32 26 36Z"
        stroke="#aec6ff"
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      {/* Right Book Page */}
      <path
        d="M74 36V66C64 62 55 64 50 68V38C55 34 64 32 74 36Z"
        stroke="#aec6ff"
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      {/* Circuit Traces Left */}
      <path
        d="M34 44H42M32 52H38M34 60H43"
        stroke="#0070f3"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle cx="43" cy="44" r="2" fill="#4edea3" />
      <circle cx="39" cy="52" r="2" fill="#4edea3" />
      <circle cx="44" cy="60" r="2" fill="#4edea3" />

      {/* Circuit Traces Right */}
      <path
        d="M66 44H58M68 52H62M66 60H57"
        stroke="#0070f3"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle cx="57" cy="44" r="2" fill="#4edea3" />
      <circle cx="61" cy="52" r="2" fill="#4edea3" />
      <circle cx="56" cy="60" r="2" fill="#4edea3" />

      {/* Vault Keyhole in Center */}
      <path
        d="M50 26C45.5 26 42 29.5 42 34C42 37.2 43.8 39.9 46.5 41.2L45 52H55L53.5 41.2C56.2 39.9 58 37.2 58 34C58 29.5 54.5 26 50 26Z"
        fill="#0070f3"
        stroke="#aec6ff"
        strokeWidth="2"
      />
      <circle cx="50" cy="33" r="2.5" fill="#0e0e0e" />
      
      {/* Base Shield Accent */}
      <path
        d="M30 76C42 83 50 86 50 86C50 86 58 83 70 76"
        stroke="#4edea3"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
};
