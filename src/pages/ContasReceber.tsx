import React from "react";

import { useContasReceber, type ContaReceberEnriquecida } from "../context/ContasReceberContext";
import { TelaDeContas, type ConfiguracaoDeContas } from "./contas/TelaDeContas";
import type { DialetoDeContas } from "./contas/contas";

/**
 * O que Contas a Receber tem de diferente da gêmea.
 *
 * A tela em si é `contas/TelaDeContas`, compartilhada com Contas a Pagar: as
 * duas eram 83% linha idêntica, e manter duas cópias era garantir que uma
 * correção entrasse só numa delas — foi assim que nasceram as divergências
 * que o levantamento de 31/08/2026 catalogou.
 *
 * Divergência de domínio nº 1 — **o que conta como quitado**. Aqui vale
 * `recebido` OU `pago`; em Contas a Pagar vale só `pago`. Está certo pelos
 * nomes (a API do Tiny manda os dois em contas a receber), e por tabela
 * mesmo, e não por um `if` espalhado por seis lugares.
 *
 * Divergência de domínio nº 2 — **qual campo de data manda no período**. Aqui
 * é `data`; em Contas a Pagar é `data_emissao`. SUPOSIÇÃO NÃO CONFIRMADA
 * CONTRA O TINY: que `contas_receber.data` é mesmo a data de emissão. A
 * decisão do Erick foi preservar o comportamento de hoje exatamente como
 * está, travado por teste, até a conferência ser feita. Se ela disser outra
 * coisa, muda esta linha e o rótulo da coluna "Data" junto.
 */
const DIALETO: DialetoDeContas<ContaReceberEnriquecida> = {
  emissao: (conta) => conta.data,
  situacoesQuitadas: ["recebido", "pago"],
  chaveQuitado: "recebido",
};

const CONFIGURACAO: ConfiguracaoDeContas<ContaReceberEnriquecida> = {
  titulo: "Contas a Receber",
  descricao: "Acompanhe e gerencie as contas a receber integradas ao Tiny ERP.",
  mensagemDeCarregamento: "Carregando contas a receber...",
  rotuloDaContraparte: "Cliente",
  rotuloDoAberto: "Total a Receber",
  rotuloDoQuitado: "Total Recebido",
  tituloDaTabela: "Detalhamento de Contas a Receber",
  tituloDasContrapartes: "Top 10 Clientes",
  legendaQuitado: "Recebido",
  legendaAberto: "A Receber",
  tomDoAberto: "acao",
  dialeto: DIALETO,
  // Divergência acidental 3.3, ainda não unificada: a ordem das colunas é a
  // de hoje. O desenho pede Vencimento · Cliente · Categoria · Valor · Saldo ·
  // Situação, e a unificação muda a asserção de caracterização das duas telas
  // — aguarda a decisão do Erick.
  colunas: [
    { chave: "id", rotulo: "ID Tiny", campo: "id_tiny" },
    { chave: "contraparte", rotulo: "Cliente", campo: "cliente_nome" },
    { chave: "categoria", rotulo: "Categoria", campo: "categoria" },
    { chave: "emissao", rotulo: "Data", campo: "data" },
    { chave: "vencimento", rotulo: "Vencimento", campo: "vencimento" },
    { chave: "valor", rotulo: "Valor", campo: "valor_numero" },
    { chave: "saldo", rotulo: "Saldo", campo: "saldo_numero" },
    { chave: "situacao", rotulo: "Situação", campo: "situacao" },
  ],
  // Divergência acidental 3.4, ainda não unificada: só esta tela exporta
  // `ID Tiny`, e `Forma Pagamento`/`Portador` só existem na API de contas a
  // receber (essas duas ficam mesmo só aqui).
  planilha: {
    aba: "Contas a Receber",
    prefixoDoArquivo: "contas_a_receber",
    rotuloDaContraparte: "Cliente",
    rotuloDaEmissao: "Data",
    incluirIdTiny: true,
    colunasProprias: (conta) => ({
      "Forma Pagamento": conta.forma_pagamento ?? "",
      Portador: conta.portador ?? "",
    }),
  },
  // Divergências acidentais 3.1 e 3.2: esta tela não desenha mensagem de
  // tabela vazia e mostra a situação crua no selo verde. Contas a Pagar faz
  // o contrário nas duas. Ver `TabelaDeContas`.
  mostrarDocumento: true,
};

/** Contas a Receber — os títulos do Tiny ERP que a empresa tem para receber. */
const ContasReceber: React.FC = () => {
  const { contasEnriquecidas, carregando } = useContasReceber();

  return (
    <TelaDeContas
      configuracao={CONFIGURACAO}
      contas={contasEnriquecidas}
      carregando={carregando}
    />
  );
};

export default ContasReceber;
