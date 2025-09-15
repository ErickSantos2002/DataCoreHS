import React from "react";
import { Helmet } from "react-helmet";

const Bloqueio: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-80px)] text-center px-4">
      <Helmet>
        <title>Acesso negado | DataCoreHS</title>
      </Helmet>
      <h1 className="text-4xl font-bold text-red-600 mb-4">Acesso negado</h1>
      <p className="text-lg text-gray-700 max-w-md">
        Você não tem permissão para acessar esta página.
      </p>
    </div>
  );
};

export default Bloqueio;