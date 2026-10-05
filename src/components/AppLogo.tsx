import React, { useState } from 'react';

interface AppLogoProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  showBorder?: boolean;
}

export const AppLogo: React.FC<AppLogoProps> = ({
  className = '',
  size = 'md',
  showBorder = true
}) => {
  const [hasError, setHasError] = useState(false);

  const sizeClasses = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
    xl: 'w-20 h-20',
    '2xl': 'w-28 h-28'
  };

  // If the user's logo file fails to load or while developing, show this regal Sri Lanka / DS Vaharai emblem
  if (hasError) {
    return (
      <div
        className={`relative inline-flex items-center justify-center rounded-full overflow-hidden shrink-0 bg-gradient-to-br from-amber-600 via-amber-500 to-amber-700 text-white ${
          showBorder ? 'ring-2 ring-amber-300 shadow-md' : ''
        } ${sizeClasses[size]} ${className}`}
        title="Divisional Secretariat Vaharai • வாகரை பிரதேச செயலகம்"
      >
        <svg viewBox="0 0 100 100" className="w-full h-full p-1" fill="none">
          {/* Outer Sun / Dharma wheel ring */}
          <circle cx="50" cy="50" r="46" stroke="#fef08a" strokeWidth="2.5" fill="#78350f" />
          <circle cx="50" cy="50" r="41" stroke="#fde047" strokeWidth="1" strokeDasharray="3 2" />
          {/* Sri Lankan Golden Lion with Sword */}
          <path
            d="M48 24C46 22 43 23 41 26C39 29 40 33 42 35C38 35 34 38 33 42C32 46 34 50 37 53C35 55 34 59 36 63C38 67 43 70 48 70C54 70 59 66 61 61C62 58 62 54 60 51C63 48 64 43 62 39C61 36 58 34 55 34C56 31 55 27 52 25C51 24 49 24 48 24Z"
            fill="#facc15"
          />
          {/* Sword in hand */}
          <path
            d="M62 36L72 26M72 26L74 28M72 26L70 24M64 34L66 32"
            stroke="#ffffff"
            strokeWidth="2"
            strokeLinecap="round"
          />
          {/* Pedestal / Rice sheaf base */}
          <path
            d="M26 73C33 70 42 68 50 68C58 68 67 70 74 73C74 76 66 79 50 79C34 79 26 76 26 73Z"
            fill="#ca8a04"
          />
          <text
            x="50"
            y="88"
            textAnchor="middle"
            fill="#fef08a"
            fontSize="8"
            fontFamily="sans-serif"
            fontWeight="bold"
            letterSpacing="1"
          >
            VAHARAI DS
          </text>
        </svg>
      </div>
    );
  }

  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-full overflow-hidden shrink-0 bg-white ${
        showBorder ? 'border border-slate-300 shadow-2xs' : ''
      } ${sizeClasses[size]} ${className}`}
      title="Divisional Secretariat Vaharai • வாகரை பிரதேச செயலகம்"
    >
      <img
        src="/logo.png"
        alt="Divisional Secretariat Vaharai Official Logo"
        onError={() => setHasError(true)}
        className="w-full h-full object-contain p-0.5 rounded-full"
      />
    </div>
  );
};

export default AppLogo;
