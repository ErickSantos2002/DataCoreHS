import React, { useEffect, useState } from "react";

import { fetchObservacoesDaVenda } from "../services/notasapi";

interface Props {
  /** A nota cujas observações abrir. */
  idNota: number;
  onClose: () => void;
}

/**
 * As observações de uma nota, buscadas na hora em que o modal abre.
 *
 * Antes o texto vinha dentro de cada nota da listagem: ~1,7 MB de campo livre
 * trafegando em toda carga da tela para o punhado de notas que alguém abre. E
 * é o campo mais sensível da nota — número de série do aparelho, chave de
 * acesso da NF-e, nome de quem recebeu.
 *
 * A listagem passou a dizer apenas SE há observação (`tem_observacoes`), que é
 * o que o botão precisa saber para existir.
 */
const ModalObservacoesDaNota: React.FC<Props> = ({ idNota, onClose }) => {
  /**
   * Um estado só, carimbado com a nota a que pertence.
   *
   * Três `useState` separados obrigariam a zerá-los no começo do efeito
   * quando a nota muda — `setState` síncrono dentro de `useEffect`, que
   * dispara render em cascata. Com o carimbo, "ainda estou buscando" é
   * DERIVADO no render em vez de escrito: enquanto a resposta que está na mão
   * for de outra nota, o que se mostra é a espera.
   */
  const [resposta, setResposta] = useState<{
    idNota: number;
    texto: string | null;
    erro: boolean;
  } | null>(null);

  useEffect(() => {
    let ativo = true;
    fetchObservacoesDaVenda(idNota)
      .then((texto) => {
        // `ativo` guarda o caso de fechar o modal (ou abrir outro) antes de a
        // resposta chegar: sem ele, a resposta da nota antiga escreveria por
        // cima do texto da nota nova — que é observação de outro cliente.
        if (ativo) setResposta({ idNota, texto, erro: false });
      })
      .catch(() => {
        if (ativo) setResposta({ idNota, texto: null, erro: true });
      });
    return () => {
      ativo = false;
    };
  }, [idNota]);

  const carregando = resposta === null || resposta.idNota !== idNota;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-overlay z-50">
      <div className="bg-surface rounded-lg shadow-lg p-6 max-w-lg w-full">
        <h2 className="text-lg font-semibold mb-4 text-conteudo-heading">
          Observações da Nota
        </h2>

        <div className="max-h-60 overflow-y-auto text-sm text-conteudo whitespace-pre-line">
          {carregando && (
            <span className="text-conteudo-muted">Carregando…</span>
          )}
          {!carregando && resposta.erro && (
            <span className="text-conteudo-muted">
              Não foi possível carregar as observações desta nota.
            </span>
          )}
          {!carregando &&
            !resposta.erro &&
            (resposta.texto || "Esta nota não tem observações.")}
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalObservacoesDaNota;
