// src/pages/Home.tsx

import React from "react";
import { useAuth } from "../hooks/useAuth";

const Home: React.FC = () => {
  const { user } = useAuth();

  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">Início</h1>
      <p className="mb-2">
        Seja bem-vindo ao sistema DataCoreHS, <span className="font-semibold">{user?.username}</span>!
      </p>
      <p>
        Sua permissão:{" "}
        <span className="inline-block rounded bg-blue-100 px-2 py-1 text-blue-800">
          {user?.role}
        </span>
      </p>
      <div className="mt-8 p-6 rounded-xl bg-white shadow">
        <span className="text-gray-500">
          Você está autenticado. Agora você pode visualizar os módulos e dashboards do sistema!
        </span>
      </div>
    </div>
  );
};

export default Home;
