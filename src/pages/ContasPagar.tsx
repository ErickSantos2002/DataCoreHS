import React from "react";

import { useContasPagar, type ContaPagarEnriquecida } from "../context/ContasPagarContext";
import { TelaDeContas, type ConfiguracaoDeContas } from "./contas/TelaDeContas";
import type { DialetoDeContas } from "./contas/contas";

/**
 * O que Contas a Pagar tem de diferente da gêmea.
 *
 * A tela em si é `contas/TelaDeContas`, compartilhada com Contas a Receber.
 *
 * Divergência de domínio nº 1 — **o que conta como quitado**. Aqui vale só
 * `pago`; em Contas a Receber vale `recebido` OU `pago`.
 *
 * Divergência de domínio nº 2 — **qual campo de data manda no período**. Aqui
 * é `data_emissao`, o nome que a API de contas a pagar usa; a de contas a
 * receber chama o mesmo dado de `data`.
 *
 * `cliente_nome` não é cópia mal feita da gêmea: é o nome do campo que a API
 * manda para o FORNECEDOR, e é por isso que a tela o rotula "Fornecedor".
 */
const DIALETO: DialetoDeContas<ContaPagarEnriquecida> = {
  emissao: (conta) => conta.data_emissao,
  situacoesQuitadas: ["pago"],
  chaveQuitado: "pago",
};

const CONFIGURACAO: ConfiguracaoDeContas<ContaPagarEnriquecida> = {
  titulo: "Contas a Pagar",
  descricao: "Acompanhe e gerencie as contas a pagar integradas ao Tiny ERP.",
  mensagemDeCarregamento: "Carregando contas a pagar...",
  rotuloDaContraparte: "Fornecedor",
  rotuloDoAberto: "Total em Aberto",
  rotuloDoQuitado: "Total Pago",
  tituloDaTabela: "Detalhamento de Contas",
  tituloDasContrapartes: "Top 10 Fornecedores",
  legendaQuitado: "Pago",
  legendaAberto: "Em Aberto",
  tomDoAberto: "perigo",
  dialeto: DIALETO,
  // Divergência acidental 3.3, ainda não unificada: a ordem das colunas é a
  // de hoje, e é diferente da gêmea sem razão aparente (lá o par de datas vem
  // antes do dinheiro, aqui depois). Ver `ContasReceber.tsx`.
  colunas: [
    { chave: "id", rotulo: "ID Tiny", campo: "id_tiny" },
    { chave: "contraparte", rotulo: "Fornecedor", campo: "cliente_nome" },
    { chave: "categoria", rotulo: "Categoria", campo: "categoria" },
    { chave: "valor", rotulo: "Valor", campo: "valor_numero" },
    { chave: "saldo", rotulo: "Saldo", campo: "saldo_numero" },
    { chave: "emissao", rotulo: "Emissão", campo: "data_emissao" },
    { chave: "vencimento", rotulo: "Vencimento", campo: "vencimento" },
    { chave: "situacao", rotulo: "Situação", campo: "situacao" },
  ],
  // Divergência acidental 3.4, ainda não unificada: esta tela NÃO exporta
  // `ID Tiny` e chama a data de `Emissão`. `Ocorrência` só existe na API de
  // contas a pagar, e essa fica mesmo só aqui.
  planilha: {
    aba: "Contas a Pagar",
    prefixoDoArquivo: "contas_a_pagar",
    rotuloDaContraparte: "Fornecedor",
    rotuloDaEmissao: "Emissão",
    incluirIdTiny: false,
    colunasProprias: (conta) => ({ Ocorrência: conta.ocorrencia }),
  },
  // Divergências acidentais 3.1, 3.2 e 3.5: só esta tela diz que a lista está
  // vazia, só ela escreve "Pago" em vez da situação crua, e só ela esconde o
  // CPF/CNPJ da célula do fornecedor. Ver `TabelaDeContas`.
  mensagemDeVazio: "Nenhuma conta encontrada.",
  rotuloDeQuitada: "Pago",
};

/** Contas a Pagar — os títulos do Tiny ERP que a empresa tem para pagar. */
const ContasPagar: React.FC = () => {
  const { contasEnriquecidas, carregando } = useContasPagar();

  return (
    <TelaDeContas
      configuracao={CONFIGURACAO}
      contas={contasEnriquecidas}
      carregando={carregando}
    />
  );
};

export default ContasPagar;
