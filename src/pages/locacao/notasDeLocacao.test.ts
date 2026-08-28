import { describe, expect, it } from "vitest";

import type { NotaLocacao } from "../../services/notasapi";
import {
  dataDaNota,
  linhasDaPlanilha,
  nomeDoArquivo,
  paraNumero,
  tomDaSituacao,
} from "./notasDeLocacao";

/**
 * A conta da Locação, testada como conta.
 *
 * O arquivo de tela (`Locacao.test.tsx`) já fixa os KPIs, a busca, a
 * ordenação e as colunas da planilha pelo que a tela mostra. Aqui ficam as
 * regras que a tela não consegue exercitar sozinha: o mapa de cor da
 * situação (a base real só tem uma situação, "Emitida DANFE"), o nome do
 * arquivo numa data fixa, e a divergência entre a data que a tela mostra e
 * a data que sai no Excel.
 */

function nota(campos: Partial<NotaLocacao> & { id: number }): NotaLocacao {
  return {
    numero: null,
    data_emissao: "2026-07-10",
    valor_nota: 0,
    descricao_situacao: null,
    natureza_operacao: null,
    nome_vendedor: null,
    cliente: null,
    ...campos,
  };
}

describe("valor da nota", () => {
  it.each([
    ["número já numérico", 49000, 49000],
    ["string decimal com ponto", "1500.50", 1500.5],
    ["string vazia", "", 0],
    ["nulo", null, 0],
    ["indefinido", undefined, 0],
    ["texto que não é número", "sem valor", 0],
    // parseFloat para no primeiro caractere que não cabe: o separador de
    // milhar brasileiro vira ponto decimal e o resto da string é jogado fora.
    ["valor formatado em português", "1.234,56", 1.234],
  ])("%s vira %s", (_rotulo, entrada, esperado) => {
    expect(paraNumero(entrada as number | string | null | undefined)).toBe(esperado);
  });
});

describe("data da nota na tela", () => {
  it("converte na string, sem passar por Date", () => {
    expect(dataDaNota("2026-07-10")).toBe("10/07/2026");
    expect(dataDaNota("2026-07-10T14:57:00")).toBe("10/07/2026");
  });

  it("sem data, mostra o travessão em vez de string vazia", () => {
    expect(dataDaNota(null)).toBe("—");
    expect(dataDaNota("")).toBe("—");
  });
});

describe("cor do selo de situação", () => {
  it.each([
    ["Cancelada", "danger"],
    ["Denegada", "danger"],
    ["Rejeitada pela SEFAZ", "danger"],
    ["Aguardando autorização", "warning"],
    ["Pendente", "warning"],
    ["Emitida DANFE", "success"],
    ["Autorizada", "success"],
    ["Registrada", "success"],
  ])("%s é %s", (situacao, esperado) => {
    expect(tomDaSituacao(situacao)).toBe(esperado);
  });

  it("não diferencia caixa", () => {
    expect(tomDaSituacao("CANCELADA")).toBe("danger");
  });

  it("sem situação, o selo fica neutro — não verde", () => {
    // Antes da migração toda situação saía verde, inclusive a ausente e a
    // cancelada. Verde é a cor de "deu certo"; nenhuma das duas deu.
    expect(tomDaSituacao(null)).toBe("muted");
    expect(tomDaSituacao("")).toBe("muted");
  });
});

describe("arquivo exportado", () => {
  it("leva a data de hoje em ISO no nome", () => {
    expect(nomeDoArquivo(new Date("2026-08-28T12:00:00Z"))).toBe("locacao_2026-08-28.xlsx");
  });
});

describe("data na planilha", () => {
  it("não é a mesma data que a tela mostra, e sai um dia antes", () => {
    // REGISTRO DE DEFEITO, NÃO CONTRATO DESEJADO.
    //
    // A API manda a data sem fuso ("2026-07-10"). A tela quebra a string e
    // acerta; a planilha passa por `new Date(...)`, que lê a string como
    // meia-noite em UTC — e num fuso a oeste de Greenwich, como o do Brasil,
    // isso é o dia anterior. A planilha sai com 09/07/2026 onde a tela
    // mostra 10/07/2026.
    const naTela = dataDaNota("2026-07-10");
    const naPlanilha = linhasDaPlanilha([nota({ id: 1, data_emissao: "2026-07-10" })])[0].Data;

    expect(naTela).toBe("10/07/2026");
    const aOesteDeGreenwich = new Date("2026-07-10").getTimezoneOffset() > 0;
    expect(naPlanilha).toBe(aOesteDeGreenwich ? "09/07/2026" : "10/07/2026");
  });

  it("com hora junto, os dois caminhos concordam", () => {
    const naPlanilha = linhasDaPlanilha([
      nota({ id: 1, data_emissao: "2026-07-10T14:57:00" }),
    ])[0].Data;
    expect(naPlanilha).toBe(dataDaNota("2026-07-10T14:57:00"));
  });
});
