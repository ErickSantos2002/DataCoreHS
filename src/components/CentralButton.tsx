import React, { useState } from "react";
import logo from "../assets/HS2.ico";

const CentralButton: React.FC = () => {
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = () => {
    window.open("https://centralhs.healthsafetytech.com", "_blank");
  };

  return (
    <>
      {/* Botão Flutuante */}
      <button
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="group fixed bottom-6 right-6 z-50 flex items-center justify-center rounded-full border-2 border-action bg-surface shadow-lg transition-all duration-300 ease-in-out hover:bg-surface-elevated hover:shadow-2xl"
        style={{
          width: "64px",
          height: "64px",
          transform: isHovered ? "scale(1.1)" : "scale(1)",
        }}
        aria-label="Ir para Central HS"
      >
        {/* Logo */}
        <img
          src={logo}
          alt="Central HS"
          className="h-10 w-10 object-contain transition-transform duration-300 group-hover:rotate-12"
        />

        {/* Efeito de pulso (opcional) */}
        {/* `opacity-75` é a propriedade opacity no elemento, e não alfa sobre
            a classe de token (`bg-action/75`), que o Tailwind não gera quando
            o token guarda hexadecimal dentro de var(). */}
        <span
          className="absolute inline-flex h-full w-full animate-ping rounded-full bg-action opacity-75"
          style={{ animationDuration: "2s" }}
        />
      </button>

      {/* Tooltip */}
      {isHovered && (
        <div
          className="animate-fadeIn fixed bottom-6 z-50 whitespace-nowrap rounded-lg bg-tooltip px-3 py-2 text-sm font-medium text-tooltip-fg shadow-lg"
          style={{
            right: "90px",
          }}
        >
          Central HS
          {/* Seta do tooltip */}
          <div className="absolute -right-1 top-1/2 h-2 w-2 -translate-y-1/2 rotate-45 transform bg-tooltip" />
        </div>
      )}
    </>
  );
};

export default CentralButton;
