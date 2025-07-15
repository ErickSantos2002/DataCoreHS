import React from "react";
import { Helmet } from "react-helmet";

interface EmConstrucaoProps {
  titulo: string;
}

const EmConstrucao: React.FC<EmConstrucaoProps> = ({ titulo }) => {
  return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-80px)] text-center px-4">
      <Helmet>
        <title>{titulo} | DataCoreHS</title>
      </Helmet>
      <h1 className="text-4xl font-bold text-blue-600 mb-4">Em construção</h1>
      <p className="text-lg text-gray-700 max-w-md">
        Em breve teremos gráficos e análises aqui para ajudar na sua tomada de decisão.
      </p>
    </div>
  );
};

export default EmConstrucao;
