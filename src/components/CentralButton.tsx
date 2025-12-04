import React, { useState } from 'react';
import logo from '../assets/HS2.ico';

const CentralButton: React.FC = () => {
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = () => {
    window.open('https://centralhs.healthsafetytech.com', '_blank');
  };

  return (
    <>
      {/* Botão Flutuante */}
      <button
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="fixed bottom-6 right-6 z-50
                 bg-white hover:bg-gray-50
                 dark:bg-gray-800 dark:hover:bg-gray-700
                 border-2 border-blue-600 dark:border-blue-500
                 rounded-full
                 shadow-lg hover:shadow-2xl
                 transition-all duration-300 ease-in-out
                 flex items-center justify-center
                 group"
        style={{
          width: '64px',
          height: '64px',
          transform: isHovered ? 'scale(1.1)' : 'scale(1)',
        }}
        aria-label="Ir para Central HS"
      >
        {/* Logo */}
        <img
          src={logo}
          alt="Central HS"
          className="w-10 h-10 object-contain transition-transform duration-300
                   group-hover:rotate-12"
        />

        {/* Efeito de pulso (opcional) */}
        <span className="absolute inline-flex h-full w-full rounded-full
                       bg-blue-400 opacity-75 animate-ping"
              style={{ animationDuration: '2s' }}
        />
      </button>

      {/* Tooltip */}
      {isHovered && (
        <div
          className="fixed bottom-6 z-50
                   bg-gray-900 dark:bg-gray-800
                   text-white text-sm font-medium
                   px-3 py-2 rounded-lg shadow-lg
                   whitespace-nowrap
                   animate-fadeIn"
          style={{
            right: '90px',
          }}
        >
          Central HS
          {/* Seta do tooltip */}
          <div
            className="absolute top-1/2 -right-1
                     w-2 h-2 bg-gray-900 dark:bg-gray-800
                     transform rotate-45 -translate-y-1/2"
          />
        </div>
      )}
    </>
  );
};

export default CentralButton;
