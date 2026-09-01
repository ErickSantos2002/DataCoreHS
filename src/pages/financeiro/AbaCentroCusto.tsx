import React, { useCallback, useEffect, useState } from "react";
import { Check } from "lucide-react";

import {
  Alert,
  Button,
  Card,
  Spinner,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../design-system/ui";
import {
  fetchCentroCustoConfig,
  fetchResumoProduto,
  salvarCentroCustoConfig,
} from "../../services/notasapi";
import {
  PRODUTOS,
  calcularCusto,
  configuracaoDoFormulario,
  formularioDaConfiguracao,
  formularioVazio,
  type FormularioDeCusto,
  type ProdutoKey,
  type ResumoDoSistema,
} from "./centroCusto";
import { FormularioDePrecificacao } from "./FormularioDePrecificacao";
import { ResumoDoCusto } from "./ResumoDoCusto";
import { SeletorDeAno } from "./SeletorDeAno";
import type { Ano } from "./financeiro";

/** Quanto tempo a confirmação de gravação fica na tela. */
const TEMPO_DA_CONFIRMACAO = 2500;

type PorProduto<T> = Record<ProdutoKey, T>;

function porProduto<T>(valor: () => T): PorProduto<T> {
  return PRODUTOS.reduce(
    (mapa, produto) => ({ ...mapa, [produto.chave]: valor() }),
    {} as PorProduto<T>,
  );
}

export interface AbaCentroCustoProps {
  anoCentro: number;
  setAnoCentro: (ano: number) => void;
}

/**
 * Centro de Custo — quanto custa e quanto rende cada bafômetro.
 *
 * A aba guarda um formulário por produto, todos carregados de uma vez: trocar
 * de produto não refaz busca nenhuma, e o que foi digitado num não se perde
 * ao olhar o outro. O ano vem de fora, da página, porque é ela quem o mantém
 * enquanto se passeia pelas outras abas.
 *
 * As contas moram em `centroCusto.ts`; aqui ficam só a carga, a gravação e a
 * composição.
 */
const AbaCentroCusto: React.FC<AbaCentroCustoProps> = ({
  anoCentro,
  setAnoCentro,
}) => {
  const [produtoAtivo, setProdutoAtivo] = useState<ProdutoKey>(
    PRODUTOS[0].chave,
  );
  const [resumos, setResumos] = useState<PorProduto<ResumoDoSistema | null>>(
    () => porProduto(() => null),
  );
  const [forms, setForms] = useState<PorProduto<FormularioDeCusto>>(() =>
    porProduto(formularioVazio),
  );
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [confirmado, setConfirmado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const carregarTudo = useCallback(async () => {
    setCarregando(true);
    try {
      const resultados = await Promise.all(
        PRODUTOS.map(async (produto) => {
          const [linhas, config] = await Promise.all([
            fetchResumoProduto(produto.chave, anoCentro),
            fetchCentroCustoConfig(produto.chave, anoCentro),
          ]);
          return {
            chave: produto.chave as ProdutoKey,
            resumo: {
              receita: linhas.reduce((soma, linha) => soma + linha.receita, 0),
              quantidade: linhas.reduce(
                (soma, linha) => soma + linha.quantidade,
                0,
              ),
            },
            form: formularioDaConfiguracao(config?.config_json),
          };
        }),
      );

      // Reconstrói os dois mapas inteiros a partir do resultado, em vez de
      // remendar o estado anterior: os três produtos vêm sempre juntos, e
      // partir do anterior arrastaria o formulário do ano que se acabou de
      // deixar para trás.
      setResumos(
        Object.fromEntries(
          resultados.map((r) => [r.chave, r.resumo]),
        ) as PorProduto<ResumoDoSistema | null>,
      );
      setForms(
        Object.fromEntries(
          resultados.map((r) => [r.chave, r.form]),
        ) as PorProduto<FormularioDeCusto>,
      );
    } finally {
      setCarregando(false);
    }
  }, [anoCentro]);

  useEffect(() => {
    carregarTudo();
  }, [carregarTudo]);

  async function salvar() {
    setSalvando(true);
    setErro(null);
    try {
      await salvarCentroCustoConfig({
        produto: produtoAtivo,
        ano: anoCentro,
        cmv_unitario: null,
        frete_unitario: null,
        outros_custos_unitario: null,
        config_json: configuracaoDoFormulario(forms[produtoAtivo]),
      });
      setConfirmado(true);
      setTimeout(() => setConfirmado(false), TEMPO_DA_CONFIRMACAO);
    } catch (err: unknown) {
      setErro(mensagemDoErro(err));
    } finally {
      setSalvando(false);
    }
  }

  const mudarForm = (mudanca: Partial<FormularioDeCusto>) =>
    setForms((atuais) => ({
      ...atuais,
      [produtoAtivo]: { ...atuais[produtoAtivo], ...mudanca },
    }));

  const form = forms[produtoAtivo];
  const resumo = resumos[produtoAtivo];
  const calculo = calcularCusto(form, resumo);
  const rotuloDoProduto =
    PRODUTOS.find((produto) => produto.chave === produtoAtivo)?.rotulo ?? "";

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-wrap items-center gap-4">
        <SeletorDeAno ano={anoCentro} onAno={(ano: Ano) => setAnoCentro(ano)} />
      </Card>

      <Tabs
        value={produtoAtivo}
        onChange={(valor) => setProdutoAtivo(valor as ProdutoKey)}
        className="flex flex-col gap-4"
      >
        <Card className="w-fit">
          <TabsList>
            {PRODUTOS.map((produto) => (
              <TabsTrigger key={produto.chave} value={produto.chave}>
                {produto.rotulo}
              </TabsTrigger>
            ))}
          </TabsList>
        </Card>

        {carregando ? (
          <div className="flex items-center justify-center py-20">
            <Spinner size="lg" />
          </div>
        ) : (
          PRODUTOS.map((produto) => (
            <TabsContent key={produto.chave} value={produto.chave}>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <div className="flex flex-col gap-4 lg:col-span-2">
                  <FormularioDePrecificacao
                    form={form}
                    onMudar={mudarForm}
                    calculo={calculo}
                  />

                  <Button
                    variant="primary"
                    onClick={salvar}
                    disabled={salvando}
                    icon={
                      confirmado ? (
                        <Check className="h-4 w-4" aria-hidden="true" />
                      ) : undefined
                    }
                    className="w-full"
                  >
                    {salvando
                      ? "Salvando..."
                      : confirmado
                        ? "Configuração salva!"
                        : `Salvar configuração — ${rotuloDoProduto}`}
                  </Button>

                  {erro && (
                    <Alert variant="danger">Erro ao salvar: {erro}</Alert>
                  )}
                </div>

                <ResumoDoCusto resumo={resumo} calculo={calculo} />
              </div>
            </TabsContent>
          ))
        )}
      </Tabs>
    </div>
  );
};

/**
 * A frase de erro que a tela mostra.
 *
 * A API manda o motivo em `response.data.detail`; quando a rede cai não há
 * resposta nenhuma e sobra a mensagem do próprio erro. O `JSON.stringify` do
 * último caso é para o `detail` que vem como objeto de validação — feio, mas
 * melhor do que "[object Object]" na cara de quem está tentando gravar.
 */
function mensagemDoErro(err: unknown): string {
  const resposta = err as {
    response?: { data?: { detail?: unknown } };
    message?: string;
  };
  const detalhe = resposta?.response?.data?.detail ?? resposta?.message;
  if (detalhe === undefined || detalhe === null) return "Erro desconhecido";
  return typeof detalhe === "string" ? detalhe : JSON.stringify(detalhe);
}

export default AbaCentroCusto;
