import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Guarda de repositório da exportação para planilha.
 *
 * Trava dois defeitos que a Fase 4 acabou de tirar do código e que voltariam
 * pela mesma porta por onde entraram: copiar uma tela que exporta.
 */

const arquivosDeCodigo = readdirSync("src", {
  recursive: true,
  encoding: "utf8",
})
  .filter(
    (c) =>
      /\.tsx?$/.test(c) && !c.endsWith(".test.tsx") && !c.endsWith(".test.ts"),
  )
  .map((c) => `src/${c}`);

// Telas que AINDA montam data em UTC fora de nome de arquivo — o preset de
// período (`hoje.toISOString()` para preencher os campos de data do filtro) e,
// em Clientes, a exibição de `ultimaCompra` em dd/mm/yyyy.
//
// É o mesmo defeito de fuso, e é o PRÓXIMO item da Fase 4: em `anoAtual` o
// preset mistura `getFullYear()` (local) com `toISOString()` (UTC), que é
// textualmente o que `pages/contas/contas.ts:257` documenta.
//
// Cada entrada existe para ser APAGADA quando aquela tela trocar o preset por
// `diaLocal` — apagar a linha é parte de migrar, não um passo opcional.
//
// A lista SÓ ENCOLHE. Duas travas garantem isso:
//   1. arquivo fora da lista que use `toISOString` faz o guarda falhar;
//   2. arquivo NA lista que já não use `toISOString` TAMBÉM faz falhar,
//      para a lista não apodrecer com isenção vitalícia.
// Nunca acrescente linha aqui para calar o guarda.
//
// `src/pages/Estoque.tsx` não está na lista de propósito: ela exporta, mas não
// tem preset de período, então saiu limpa já na Fase 4.
const PENDENTES_UTC: string[] = [
  "src/pages/Clientes.tsx",
  "src/pages/Servicos.tsx",
];

/** Linha que só CITA `toISOString` em comentário não é infração.
 *
 *  Vários arquivos falam do defeito justamente para explicar o que deixaram de
 *  ter — `contas.ts:257` e `:637` são o caso. Acusar esses comentários seria
 *  acusar código certo, e o desfecho provável é alguém apagar o comentário para
 *  o teste passar: o repositório perderia a explicação do defeito. */
function usosDeToISOString(caminho: string): string[] {
  const achados: string[] = [];
  readFileSync(caminho, "utf8")
    .split("\n")
    .forEach((linha, i) => {
      const semEspaco = linha.trim();
      const eComentario =
        semEspaco.startsWith("//") ||
        semEspaco.startsWith("*") ||
        semEspaco.startsWith("/*");
      if (!eComentario && /toISOString\s*\(/.test(linha)) {
        achados.push(`${caminho}:${i + 1}`);
      }
    });
  return achados;
}

describe("guarda de planilha", () => {
  it("o esqueleto do xlsx so existe em src/lib/planilha.ts", () => {
    // Eram nove cópias de `json_to_sheet` + `book_new` + `book_append_sheet` +
    // `writeFile`, e sete delas montavam o nome do arquivo em UTC. Concentrar o
    // esqueleto só vale se ele não voltar a se espalhar: a décima cópia
    // nasceria com o mesmo defeito, porque quem copia copia inteiro.
    const infratores: string[] = [];
    for (const caminho of arquivosDeCodigo) {
      if (caminho === "src/lib/planilha.ts") continue;
      const conteudo = readFileSync(caminho, "utf8");
      conteudo.split("\n").forEach((linha, i) => {
        if (
          /json_to_sheet|book_new|book_append_sheet|XLSX\.writeFile/.test(linha)
        ) {
          infratores.push(`${caminho}:${i + 1}`);
        }
      });
    }
    expect(infratores).toEqual([]);
  });

  it("nenhum nome de arquivo exportado sai de new Date().toISOString()", () => {
    // `toISOString()` devolve UTC: as 23h de 28/08 em São Paulo já são 02h de
    // 29/08 em UTC, e quem exportava à noite arquivava com a data do dia
    // seguinte. O dia local sai de `diaLocal`, em `src/lib/datas.ts`.
    //
    // Esta trava NÃO respeita o `PENDENTES_UTC`, de propósito. Cinco das seis
    // telas da lista tiveram o nome do arquivo consertado nesta mesma fase; se
    // a isenção valesse por arquivo inteiro, o defeito poderia voltar
    // exatamente onde acabou de sair, calado, e a lista o esconderia até o
    // preset migrar. `new Date().toISOString()` era a forma literal das DEZ
    // ocorrências corrigidas — o preset nunca usa essa forma, ele guarda o
    // instante em `const hoje` antes.
    //
    // Varre `src/` INTEIRO, e não só `src/pages/`: a décima ocorrência estava
    // em `components/SolicitacaoComprasModal.tsx`, fora de `pages/`, e um
    // guarda ancorado em `pages/` teria deixado ela passar.
    const infratores: string[] = [];
    for (const caminho of arquivosDeCodigo) {
      readFileSync(caminho, "utf8")
        .split("\n")
        .forEach((linha, i) => {
          const semEspaco = linha.trim();
          const eComentario =
            semEspaco.startsWith("//") ||
            semEspaco.startsWith("*") ||
            semEspaco.startsWith("/*");
          if (!eComentario && /new Date\(\)\s*\.\s*toISOString\s*\(/.test(linha)) {
            infratores.push(`${caminho}:${i + 1}`);
          }
        });
    }
    expect(infratores).toEqual([]);
  });

  it("nenhuma tela fora da lista monta data com toISOString", () => {
    // A trava larga: qualquer `toISOString` numa tela já limpa é regressão.
    // As cinco da lista continuam isentas só pelo preset de período, e só até
    // o próximo item da Fase 4.
    //
    // Esta fica em `src/pages/` de propósito, ao contrário da trava de cima.
    // `context/DataContext.tsx:75` e `context/DashboardContext.tsx:187` também
    // montam data com `toISOString`, mas são data de dado, não nome de arquivo,
    // e nenhum item da Fase 4 as cobre — estender a trava até lá exigiria uma
    // segunda lista de isenção para um problema que ninguém decidiu ainda.
    // Estão registradas no documento de divergências.
    const infratores: string[] = [];
    for (const caminho of arquivosDeCodigo) {
      if (!caminho.startsWith("src/pages/")) continue;
      if (PENDENTES_UTC.includes(caminho)) continue;
      infratores.push(...usosDeToISOString(caminho));
    }
    expect(infratores).toEqual([]);
  });

  it("nenhuma entrada da lista de pendentes esta obsoleta", () => {
    // Sem este teste a lista apodrece: alguém limpa o preset da tela, esquece
    // de tirar a linha, e o arquivo fica isento para sempre — o buraco volta
    // calado, e o próximo `toISOString` entra sem ninguém ver.
    const obsoletas: string[] = [];
    for (const caminho of PENDENTES_UTC) {
      if (!arquivosDeCodigo.includes(caminho)) {
        obsoletas.push(`${caminho}: arquivo nao existe mais — tire da lista`);
        continue;
      }
      if (usosDeToISOString(caminho).length === 0) {
        obsoletas.push(`${caminho}: ja esta limpo — tire da lista`);
      }
    }
    expect(obsoletas).toEqual([]);
  });
});
