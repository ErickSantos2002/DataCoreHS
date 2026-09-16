import React, { useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { diaLocal } from "../lib/datas";
import logo from "../assets/logo.png"; // ajuste o caminho se necessário

interface Produto {
  id: number;
  nome: string;
  codigo: string;
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

const SolicitacaoComprasModal: React.FC<Props> = ({
  aberto,
  fechar,
  produtos,
  solicitante,
}) => {
  const [solicitacao, setSolicitacao] = useState<Solicitacao[]>([]);
  const [busca, setBusca] = useState("");

  const atualizarQuantidade = (id: number, quantidade: number) => {
    setSolicitacao((prev) => {
      const existe = prev.find((item) => item.id === id);
      if (existe) {
        return prev.map((item) =>
          item.id === id ? { ...item, quantidade } : item,
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
          produto?.codigo || "",
          produto?.nome || "",
          produto?.saldo ?? 0,
          item.quantidade,
        ];
      });

    autoTable(doc, {
      startY: 40,
      head: [["Código", "Produto", "Saldo Atual", "Quantidade Solicitada"]],
      body: dadosTabela,
      theme: "grid",
      styles: { fontSize: 10 },
      headStyles: {
        fillColor: [37, 99, 235],
        textColor: 255,
        halign: "center",
      },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      columnStyles: {
        0: { cellWidth: 25, halign: "center" }, // Código
        1: { cellWidth: 70, halign: "left" }, // Produto
        2: { halign: "center" }, // Saldo
        3: { halign: "center" }, // Quantidade
      },
    });

    // Rodapé
    doc.setFontSize(12);
    doc.text(
      `Solicitante: ${solicitante}`,
      14,
      doc.internal.pageSize.height - 10,
    );

    // Salvar
    doc.save(`solicitacao_compras_${diaLocal(new Date())}.pdf`);
    fechar();
  };

  const produtosFiltrados = produtos.filter((p) => {
    const termo = busca.toLowerCase();
    return (
      p.nome.toLowerCase().includes(termo) ||
      String(p.codigo).toLowerCase().includes(termo) // ✅ garante que funcione mesmo se for número
    );
  });

  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay">
      <div className="w-full max-w-2xl rounded-xl bg-surface p-6 shadow-lg transition-colors">
        <h2 className="mb-4 text-lg font-semibold text-conteudo">
          Selecionar Produtos
        </h2>

        {/* Campo de pesquisa */}
        <input
          type="text"
          placeholder="Pesquisar produto..."
          className="mb-4 w-full rounded-lg border border-borda bg-surface px-3 py-2 text-conteudo placeholder-conteudo-faint focus:outline-none focus:ring-2 focus:ring-focus"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />

        {/* Lista de produtos */}
        <div className="max-h-64 divide-y divide-borda overflow-y-auto">
          {produtosFiltrados.map((produto) => (
            <div
              key={produto.id}
              className="flex items-center justify-between py-2 text-conteudo"
            >
              <span>
                <span className="font-medium">{produto.codigo}</span> -{" "}
                {produto.nome}{" "}
                <span className="text-sm text-conteudo-muted">
                  (Saldo: {produto.saldo})
                </span>
              </span>
              <input
                type="number"
                min={0}
                className="w-24 rounded-lg border border-borda bg-surface px-2 py-1 text-conteudo"
                onChange={(e) =>
                  atualizarQuantidade(produto.id, Number(e.target.value))
                }
              />
            </div>
          ))}
        </div>

        {/* Botões */}
        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={fechar}
            className="rounded-lg border border-borda bg-surface px-4 py-2 text-conteudo transition-colors hover:bg-surface-elevated"
          >
            Cancelar
          </button>
          <button
            onClick={gerarPDF}
            className="rounded-lg bg-success px-4 py-2 text-on-success transition-colors hover:bg-success-hover"
          >
            Gerar PDF
          </button>
        </div>
      </div>
    </div>
  );
};

export default SolicitacaoComprasModal;
