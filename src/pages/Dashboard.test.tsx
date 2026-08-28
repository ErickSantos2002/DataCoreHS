import type { ReactNode } from "react";
import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import Dashboard from "./Dashboard";
import { AuthContext } from "../context/AuthContext";
import { ToastProvider } from "../components/ToastProvider";

/**
 * Teste de caracterização da tela de Meta do trimestre.
 *
 * Fixa o comportamento que existia ANTES da migração para o design system,
 * porque a regra de negócio dela não está em lugar nenhum além deste arquivo
 * de tela: o parse do valor da META, a divisão da META anual por 4 e os três
 * degraus de bonificação. Um refactor que "simplifique" qualquer um dos três
 * muda o número que a empresa inteira usa para medir bônus — em silêncio, se
 * ninguém tiver fixado o número aqui.
 *
 * Tudo é observado pela tela renderizada, nunca por função exportada de
 * propósito para o teste: assim o teste sobrevive a quebrar a página em
 * componentes, que é exatamente o passo seguinte.
 */

const confettiEspiao = vi.hoisted(() => vi.fn());
vi.mock("canvas-confetti", () => ({ default: confettiEspiao }));

const estadoDashboard = vi.hoisted(() => ({
  atual: {
    dados: [] as { mes: string; total: number }[],
    total: 0,
    totalAno: 0,
    carregando: false,
  },
}));
vi.mock("../context/DashboardContext", () => ({
  useDashboard: () => estadoDashboard.atual,
}));

const estadoConfiguracoes = vi.hoisted(() => ({
  atual: [] as { id: number; chave: string; valor: string }[],
}));
vi.mock("../context/ConfiguracoesContext", () => ({
  useConfiguracoes: () => ({
    configuracoes: estadoConfiguracoes.atual,
    carregando: false,
    editarConfiguracao: vi.fn(),
    criarConfiguracao: vi.fn(),
  }),
}));

const USUARIO = { id: 1, username: "erick", role: "admin" };

function Molde({ children }: { children: ReactNode }) {
  return (
    <AuthContext.Provider
      value={{
        user: USUARIO,
        token: "t",
        loading: false,
        login: vi.fn(),
        logout: vi.fn(),
        error: null,
      }}
    >
      <ToastProvider>{children}</ToastProvider>
    </AuthContext.Provider>
  );
}

interface Cenario {
  /** Valor cru da chave META, como vem da tabela de configurações. */
  meta?: string;
  /** Valor cru da chave ANIMACAO_META. */
  animacao?: string;
  total?: number;
  totalAno?: number;
  dados?: { mes: string; total: number }[];
  carregando?: boolean;
}

function montar({
  meta,
  animacao,
  total = 0,
  totalAno = 0,
  dados = [],
  carregando = false,
}: Cenario) {
  const configuracoes: { id: number; chave: string; valor: string }[] = [];
  if (meta !== undefined) configuracoes.push({ id: 1, chave: "META", valor: meta });
  if (animacao !== undefined)
    configuracoes.push({ id: 2, chave: "ANIMACAO_META", valor: animacao });

  estadoConfiguracoes.atual = configuracoes;
  estadoDashboard.atual = { dados, total, totalAno, carregando };

  return render(<Dashboard />, { wrapper: Molde });
}

/** Texto de um velocímetro, na ordem em que aparecem (55%, 85%, 100%). */
function velocimetros(): string[] {
  return screen
    .getAllByText(/^(55|85|100)%$/)
    .map((rotulo) => rotulo.parentElement?.textContent ?? "");
}

beforeEach(() => {
  confettiEspiao.mockClear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("Meta do trimestre — leitura do valor da META", () => {
  // Os três formatos que a chave META já teve na tabela de configurações.
  // Todos representam doze milhões, e todos têm que dar a MESMA meta.
  const DOZE_MILHOES = [
    ["ponto decimal americano", "12000000.00"],
    ["milhar com ponto e decimal com vírgula", "12.000.000,00"],
    ["decimal com vírgula, sem milhar", "12000000,00"],
    ["inteiro sem separador nenhum", "12000000"],
  ];

  it.each(DOZE_MILHOES)(
    "aceita META em %s e chega no mesmo degrau de 55%%",
    (_rotulo, valor) => {
      montar({ meta: valor, total: 0 });

      // META anual 12.000.000 → trimestre 3.000.000 → degrau 55% = 2.700.000.
      expect(velocimetros()[0]).toContain("R$2.700.000,00");
    },
  );

  it("META de doze milhões e setecentos com centavo quebrado nao perde o centavo", () => {
    montar({ meta: "12.666.666,72", total: 0 });

    // 12.666.666,72 / 4 = 3.166.666,68 → × 0,9 = 2.850.000,012
    expect(velocimetros()[0]).toContain("R$2.850.000,01");
  });

  it.each([
    ["vazia", ""],
    ["ausente", undefined],
    ["texto que nao e numero", "meta a definir"],
  ])("trata META %s como zero, sem quebrar a tela", (_rotulo, valor) => {
    montar({ meta: valor, total: 0 });

    // Meta zero: nao ha diferenca a percorrer, entao os tres velocimetros ja
    // nascem "atingidos" — e o progresso, que seria 0/0 = NaN, cai para 0.
    expect(screen.getAllByText("Meta atingida!")).toHaveLength(3);
    expect(screen.getAllByText("0.0%")).toHaveLength(3);
  });
});

describe("Meta do trimestre — meta anual dividida por 4", () => {
  it("divide a META anual por 4 para chegar na meta do trimestre", () => {
    montar({ meta: "12000000", total: 0 });

    // Os tres degraus saem de META = 12.000.000 / 4 = 3.000.000.
    // Se a divisao sumir (ou virar /2), estes tres numeros quadruplicam
    // (ou dobram) e o bonus da equipe inteira muda sem ninguem ver.
    const [degrau55, degrau85, degrau100] = velocimetros();
    expect(degrau55).toContain("R$2.700.000,00"); // 3.000.000 × 0,9
    expect(degrau85).toContain("R$3.600.000,00"); // 3.000.000 × 1,2
    expect(degrau100).toContain("R$4.200.000,00"); // 3.000.000 × 1,4
  });
});

describe("Meta do trimestre — os tres degraus de bonificacao", () => {
  it("abaixo do primeiro degrau, os tres mostram quanto falta", () => {
    montar({ meta: "12000000", total: 1_350_000 });

    const [degrau55, degrau85, degrau100] = velocimetros();
    // 1.350.000 / 2.700.000 = 50%
    expect(degrau55).toContain("50.0%");
    expect(degrau55).toContain("R$1.350.000,00");
    // 1.350.000 / 3.600.000 = 37,5%
    expect(degrau85).toContain("37.5%");
    expect(degrau85).toContain("R$2.250.000,00");
    // 1.350.000 / 4.200.000 = 32,142…%
    expect(degrau100).toContain("32.1%");
    expect(degrau100).toContain("R$2.850.000,00");

    expect(screen.queryByText("Meta atingida!")).toBeNull();
  });

  it("entre o primeiro e o segundo degrau, so o primeiro esta atingido", () => {
    montar({ meta: "12000000", total: 3_000_000 });

    const [degrau55, degrau85, degrau100] = velocimetros();
    // Passou de 2.700.000: o progresso e limitado em 100%.
    expect(degrau55).toContain("100.0%");
    expect(degrau55).toContain("Meta atingida!");
    expect(degrau85).toContain("83.3%");
    expect(degrau85).toContain("R$600.000,00");
    expect(degrau100).toContain("71.4%");
    expect(degrau100).toContain("R$1.200.000,00");

    expect(screen.getAllByText("Meta atingida!")).toHaveLength(1);
  });

  it("acima do terceiro degrau, os tres estao atingidos e travados em 100%", () => {
    montar({ meta: "12000000", total: 5_000_000 });

    expect(screen.getAllByText("Meta atingida!")).toHaveLength(3);
    expect(screen.getAllByText("100.0%")).toHaveLength(3);
  });

  it("mostra o valor realizado do trimestre nos tres velocimetros", () => {
    montar({ meta: "12000000", total: 1_350_000 });

    for (const texto of velocimetros()) {
      expect(texto).toContain("R$ 1.350.000");
    }
  });
});

describe("Meta do trimestre — comemoracao", () => {
  function avancarAnimacao() {
    act(() => {
      vi.advanceTimersByTime(1000);
    });
  }

  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("dispara a comemoracao quando a meta foi batida e a animacao esta ligada", () => {
    montar({ meta: "12000000", animacao: "true", total: 3_000_000 });
    avancarAnimacao();

    expect(confettiEspiao).toHaveBeenCalled();
  });

  it("nao dispara quando a animacao esta desligada na configuracao", () => {
    montar({ meta: "12000000", animacao: "false", total: 5_000_000 });
    avancarAnimacao();

    expect(confettiEspiao).not.toHaveBeenCalled();
  });

  it("nao dispara quando a chave ANIMACAO_META nem existe", () => {
    montar({ meta: "12000000", total: 5_000_000 });
    avancarAnimacao();

    expect(confettiEspiao).not.toHaveBeenCalled();
  });

  it("nao dispara enquanto os dados ainda estao carregando", () => {
    montar({
      meta: "12000000",
      animacao: "true",
      total: 5_000_000,
      carregando: true,
    });
    avancarAnimacao();

    expect(confettiEspiao).not.toHaveBeenCalled();
  });

  it("nao dispara quando o total ainda nao alcancou o primeiro degrau", () => {
    montar({ meta: "12000000", animacao: "true", total: 2_699_999 });
    avancarAnimacao();

    expect(confettiEspiao).not.toHaveBeenCalled();
  });

  it("dispara uma vez so: a animacao nao recomeca a cada re-render", () => {
    const { rerender } = montar({
      meta: "12000000",
      animacao: "true",
      total: 3_000_000,
    });
    avancarAnimacao();
    const disparosDaPrimeiraVez = confettiEspiao.mock.calls.length;
    expect(disparosDaPrimeiraVez).toBeGreaterThan(0);

    // Deixa a animacao dos 3 segundos terminar antes de re-renderizar.
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    const disparosDepoisDaAnimacao = confettiEspiao.mock.calls.length;

    act(() => {
      rerender(<Dashboard />);
    });
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(confettiEspiao.mock.calls.length).toBe(disparosDepoisDaAnimacao);
  });
});

describe("Meta do trimestre — estados da tela", () => {
  it("mostra o aviso de carregando no lugar do conteudo", () => {
    montar({ meta: "12000000", carregando: true });

    expect(screen.getByText(/Carregando os dados da meta do trimestre/i)).toBeInTheDocument();
    expect(screen.queryByText("Trimestre Atual")).toBeNull();
  });

  it("lista os meses e o total do ano quando os dados chegam", () => {
    montar({
      meta: "12000000",
      total: 1_350_000,
      totalAno: 4_000_000,
      dados: [
        { mes: "Junho/2026", total: 500_000 },
        { mes: "Julho/2026", total: 850_000 },
      ],
    });

    expect(screen.getByText("Junho/2026:")).toBeInTheDocument();
    expect(screen.getByText("Julho/2026:")).toBeInTheDocument();
    expect(screen.getByText("R$ 4.000.000,00")).toBeInTheDocument();
  });

  it("sauda o usuario logado com o papel dele", () => {
    montar({ meta: "12000000" });

    expect(screen.getByText("erick")).toBeInTheDocument();
    expect(screen.getByText(/\(admin\)/)).toBeInTheDocument();
  });
});
