import React, { useState, useLayoutEffect } from "react";
import logo from "../assets/logo.png";

const Home: React.FC = () => {
  const [altura, setAltura] = useState("100dvh");

  // Calcula dinamicamente a altura disponível, considerando header
  useLayoutEffect(() => {
    const ajustarAltura = () => {
      const header = document.querySelector("header");
      const headerAltura = header ? header.clientHeight : 0;
      const alturaViewport =
        window.innerHeight || document.documentElement.clientHeight;
      setAltura(`${alturaViewport - headerAltura}px`);
    };

    ajustarAltura();
    window.addEventListener("resize", ajustarAltura);
    return () => window.removeEventListener("resize", ajustarAltura);
  }, []);

  return (
    <div
      className="flex flex-col bg-white dark:bg-[#0a192f] transition-colors"
      style={{
        height: altura,
        overflow: "hidden",
      }}
    >
      {/* Logo centralizada e responsiva */}
      <div className="flex-1 flex items-center justify-center overflow-hidden">
        <img
          src={logo}
          alt="Logo Health & Safety"
          className="max-w-[950px] w-[70%] h-auto object-contain md:w-[60%] sm:w-[80%]"
          style={{
            maxHeight: "80%",
          }}
        />
      </div>

      {/* Rodapé colado no fundo */}
      <footer className="w-full bg-white dark:bg-[#0a192f] py-3.5 flex flex-col sm:flex-row justify-center items-center gap-1 sm:gap-3 shadow transition-colors text-center px-4">
        <p className="text-gray-700 dark:text-gray-200 text-sm sm:text-base font-medium">
          © {new Date().getFullYear()} Health Safety — Todos os direitos reservados.
        </p>
      </footer>

    </div>
  );
};

export default Home;
