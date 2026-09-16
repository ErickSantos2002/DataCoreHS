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
                 bg-surface hover:bg-surface-elevated
                 border-2 border-action
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
        {/* `opacity-75` é a propriedade opacity no elemento, e não alfa sobre
            a classe de token (`bg-action/75`), que o Tailwind não gera quando
            o token guarda hexadecimal dentro de var(). */}
        <span className="absolute inline-flex h-full w-full rounded-full
                       bg-action opacity-75 animate-ping"
              style={{ animationDuration: '2s' }}
        />
      </button>

      {/* Tooltip */}
      {isHovered && (
        <div
          className="fixed bottom-6 z-50
                   bg-tooltip
                   text-tooltip-fg text-sm font-medium
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
                     w-2 h-2 bg-tooltip
                     transform rotate-45 -translate-y-1/2"
          />
        </div>
      )}
    </>
  );
};

export default CentralButton;
