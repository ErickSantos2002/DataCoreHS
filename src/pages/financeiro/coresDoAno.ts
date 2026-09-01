import { corDaSerie } from "../../design-system/chartTheme";
import { ANOS, type Ano } from "./financeiro";

/**
 * A cor de um ano — a mesma no pill que o liga, no cartão de KPI e na barra
 * do gráfico.
 *
 * Antes eram cinco hexadecimais soltos no topo da tela (`#a16207`, `#7c3aed`,
 * …), escolhidos à mão e sem relação nenhuma com a paleta do sistema. Sair da
 * rampa de séries do `chartTheme` resolve duas coisas de uma vez: as cores
 * passam a reagir ao tema, e o ano fica com a MESMA cor em todo lugar da tela
 * porque só existe um lugar que a decide.
 */
export function corDoAno(ano: Ano): string {
  return corDaSerie(ANOS.indexOf(ano));
}
