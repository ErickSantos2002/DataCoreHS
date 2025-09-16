import React, { useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logo from "../assets/logo.png"; // ajuste o caminho se necessário

interface Produto {
  id: number;
  nome: string;
  saldo: number;
}

interface Solicitacao {
  id: number;
  quantidade: number;
}

interface Props {
  aberto: boolean;
  fechar: () => void;
  produtos: Produto[];
  solicitante: string;
}

const SolicitacaoComprasModal: React.FC<Props> = ({ aberto, fechar, produtos, solicitante }) => {
  const [solicitacao, setSolicitacao] = useState<Solicitacao[]>([]);
  const [busca, setBusca] = useState("");

  const atualizarQuantidade = (id: number, quantidade: number) => {
    setSolicitacao((prev) => {
      const existe = prev.find((item) => item.id === id);
      if (existe) {
        return prev.map((item) =>
          item.id === id ? { ...item, quantidade } : item
        );
      } else {
        return [...prev, { id, quantidade }];
      }
    });
  };

  const gerarPDF = () => {
    const doc = new jsPDF();

    // Cabeçalho com logo
    doc.addImage(logo, "PNG", 150, 10, 40, 20);

    doc.setFontSize(16);
    doc.text("Solicitação de Compras", 14, 20);
    doc.setFontSize(10);
    doc.text(`Data: ${new Date().toLocaleDateString("pt-BR")}`, 14, 28);

    // Montar tabela
    const dadosTabela = solicitacao
      .filter((item) => item.quantidade > 0)
      .map((item) => {
        const produto = produtos.find((p) => p.id === item.id);
        return [
          produto?.nome || "",
          produto?.saldo ?? 0,
          item.quantidade,
        ];
      });

    autoTable(doc, {
      startY: 40,
      head: [["Produto", "Saldo Atual", "Quantidade Solicitada"]],
      body: dadosTabela,
      theme: "grid",
      headStyles: { fillColor: [22, 160, 133], textColor: 255 }, // verde no cabeçalho
      alternateRowStyles: { fillColor: [240, 240, 240] },       // cinza nas linhas alternadas
    });

    // Rodapé
    doc.setFontSize(12);
    doc.text(
      `Solicitante: ${solicitante}`,
      14,
      doc.internal.pageSize.height - 10
    );

    // Salvar
    doc.save(`solicitacao_compras_${new Date().toISOString().split("T")[0]}.pdf`);
    fechar();
  };

  const produtosFiltrados = produtos.filter((p) =>
    p.nome.toLowerCase().includes(busca.toLowerCase())
  );

  if (!aberto) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl p-6">
        <h2 className="text-lg font-semibold mb-4">Selecionar Produtos</h2>

        {/* Campo de pesquisa */}
        <input
          type="text"
          placeholder="Pesquisar produto..."
          className="w-full px-3 py-2 border rounded mb-4"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />

        <div className="max-h-64 overflow-y-auto">
          {produtosFiltrados.map((produto) => (
            <div key={produto.id} className="flex items-center justify-between border-b py-2">
              <span>{produto.nome} (Saldo: {produto.saldo})</span>
              <input
                type="number"
                min={0}
                className="w-24 border rounded px-2 py-1"
                onChange={(e) => atualizarQuantidade(produto.id, Number(e.target.value))}
              />
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={fechar}
            className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
          >
            Cancelar
          </button>
          <button
            onClick={gerarPDF}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Gerar PDF
          </button>
        </div>
      </div>
    </div>
  );
};

export default SolicitacaoComprasModal;
