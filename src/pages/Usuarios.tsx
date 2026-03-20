import React, { useEffect, useState } from "react";
import { Pencil, Lock, Trash2, Plus, X } from "lucide-react";
import {
  getUsers,
  getRoles,
  createUser,
  updateUser,
  deleteUser,
  updateUserPassword,
} from "../services/api";
import { useAuth } from "../hooks/useAuth";
import ModalTrocarSenha from "../components/ModalTrocarSenha";

interface Usuario {
  id: number;
  username: string;
  role: { id: number; name: string };
  created_at: string;
}

interface Role {
  id: number;
  name: string;
}

const ROLES: Role[] = [
  { id: 1, name: "admin" },
  { id: 2, name: "vendas" },
  { id: 3, name: "financeiro" },
  { id: 4, name: "servicos" },
  { id: 5, name: "comum" },
];

const ROLE_BADGE: Record<string, string> = {
  admin: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  vendas: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  financeiro: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  servicos: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  comum: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
};

const formatarData = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

// ── Modal genérico ────────────────────────────────────────────────────────────
const Modal: React.FC<{ titulo: string; onClose: () => void; children: React.ReactNode }> = ({
  titulo,
  onClose,
  children,
}) => (
  <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 p-4">
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">{titulo}</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
          <X size={20} />
        </button>
      </div>
      <div className="p-6">{children}</div>
    </div>
  </div>
);

// ── Página principal ──────────────────────────────────────────────────────────
const Usuarios: React.FC = () => {
  const { user } = useAuth();

  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [roles, setRoles] = useState<Role[]>(ROLES);
  const [carregando, setCarregando] = useState(true);

  const [modalCriar, setModalCriar] = useState(false);
  const [modalEditar, setModalEditar] = useState<Usuario | null>(null);
  const [modalSenha, setModalSenha] = useState<Usuario | null>(null);
  const [modalExcluir, setModalExcluir] = useState<Usuario | null>(null);

  // form criar
  const [novoUsername, setNovoUsername] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [novaSenhaConfirm, setNovaSenhaConfirm] = useState("");
  const [novoRoleName, setNovoRoleName] = useState("comum");

  // form editar
  const [editUsername, setEditUsername] = useState("");
  const [editRoleName, setEditRoleName] = useState("comum");

  const [salvando, setSalvando] = useState(false);
  const [erroModal, setErroModal] = useState<string | null>(null);

  const carregar = async () => {
    setCarregando(true);
    try {
      const [u, r] = await Promise.all([getUsers(), getRoles()]);
      setUsuarios(u);
      setRoles(r);
    } catch {
      // silencioso — tabela ficará vazia
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => { carregar(); }, []);

  const nomeRole = (u: Usuario) => u.role?.name ?? "—";

  // ── Criar ──────────────────────────────────────────────────────────────────
  const handleCriar = async () => {
    setErroModal(null);
    if (!novoUsername.trim()) return setErroModal("Informe um nome de usuário.");
    if (novaSenha.length < 6) return setErroModal("A senha deve ter pelo menos 6 caracteres.");
    if (novaSenha !== novaSenhaConfirm) return setErroModal("As senhas não coincidem.");
    setSalvando(true);
    try {
      await createUser({ username: novoUsername.trim(), password: novaSenha, role_name: novoRoleName });
      setModalCriar(false);
      setNovoUsername(""); setNovaSenha(""); setNovaSenhaConfirm(""); setNovoRoleName("comum");
      await carregar();
    } catch (e: any) {
      setErroModal(e?.response?.data?.detail ?? "Erro ao criar usuário.");
    } finally {
      setSalvando(false);
    }
  };

  // ── Editar ─────────────────────────────────────────────────────────────────
  const abrirEditar = (u: Usuario) => {
    setEditUsername(u.username);
    setEditRoleName(u.role?.name ?? "comum");
    setErroModal(null);
    setModalEditar(u);
  };

  const handleEditar = async () => {
    if (!modalEditar) return;
    setErroModal(null);
    if (!editUsername.trim()) return setErroModal("Informe um nome de usuário.");
    setSalvando(true);
    try {
      await updateUser(modalEditar.id, { username: editUsername.trim(), role_name: editRoleName });
      setModalEditar(null);
      await carregar();
    } catch (e: any) {
      setErroModal(e?.response?.data?.detail ?? "Erro ao atualizar usuário.");
    } finally {
      setSalvando(false);
    }
  };

  // ── Senha ──────────────────────────────────────────────────────────────────
  const handleTrocarSenha = async (senha: string) => {
    if (!modalSenha) return;
    await updateUserPassword(modalSenha.id, senha);
    setModalSenha(null);
  };

  // ── Excluir ────────────────────────────────────────────────────────────────
  const handleExcluir = async () => {
    if (!modalExcluir) return;
    setSalvando(true);
    try {
      await deleteUser(modalExcluir.id);
      setModalExcluir(null);
      await carregar();
    } catch (e: any) {
      setErroModal(e?.response?.data?.detail ?? "Erro ao excluir usuário.");
    } finally {
      setSalvando(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  if (carregando) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-darkBlue">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-300">Carregando usuários...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 min-h-screen bg-gray-50 dark:bg-darkBlue transition-colors">
      {/* Header */}
      <div className="bg-white dark:bg-[#0f172a] shadow-sm rounded-xl px-6 py-4 mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-yellow-400">Usuários</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
            Gerenciamento de acessos — {usuarios.length} usuários cadastrados
          </p>
        </div>
        <button
          onClick={() => { setErroModal(null); setModalCriar(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
        >
          <Plus size={16} />
          Novo Usuário
        </button>
      </div>

      {/* Tabela */}
      <div className="bg-white dark:bg-[#0f172a] rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700 text-left">
              <th className="py-3 px-4 text-gray-500 dark:text-gray-400 font-semibold w-12">#</th>
              <th className="py-3 px-4 text-gray-500 dark:text-gray-400 font-semibold">Usuário</th>
              <th className="py-3 px-4 text-gray-500 dark:text-gray-400 font-semibold">Perfil</th>
              <th className="py-3 px-4 text-gray-500 dark:text-gray-400 font-semibold">Criado em</th>
              <th className="py-3 px-4 text-gray-500 dark:text-gray-400 font-semibold text-center">Ações</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => {
              const role = nomeRole(u);
              const isMe = u.id === user?.id;
              return (
                <tr
                  key={u.id}
                  className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <td className="py-3 px-4 text-gray-400 dark:text-gray-500">{u.id}</td>
                  <td className="py-3 px-4 font-medium text-gray-800 dark:text-gray-200">
                    {u.username}
                    {isMe && (
                      <span className="ml-2 text-xs text-blue-500 font-normal">(você)</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-semibold capitalize ${
                        ROLE_BADGE[role] ?? ROLE_BADGE.comum
                      }`}
                    >
                      {role}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-500 dark:text-gray-400">
                    {formatarData(u.created_at)}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => abrirEditar(u)}
                        title="Editar"
                        className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => { setModalSenha(u); }}
                        title="Trocar senha"
                        className="p-1.5 text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/30 rounded-lg transition-colors"
                      >
                        <Lock size={15} />
                      </button>
                      <button
                        onClick={() => { setErroModal(null); setModalExcluir(u); }}
                        title={isMe ? "Não é possível excluir seu próprio usuário" : "Excluir"}
                        disabled={isMe}
                        className={`p-1.5 rounded-lg transition-colors ${
                          isMe
                            ? "text-gray-300 dark:text-gray-600 cursor-not-allowed"
                            : "text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30"
                        }`}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Modal Criar ─────────────────────────────────────────────────────── */}
      {modalCriar && (
        <Modal titulo="Novo Usuário" onClose={() => setModalCriar(false)}>
          {erroModal && (
            <p className="mb-4 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
              {erroModal}
            </p>
          )}
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Usuário
              </label>
              <input
                type="text"
                value={novoUsername}
                onChange={(e) => setNovoUsername(e.target.value)}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                placeholder="nome de usuário"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Senha
              </label>
              <input
                type="password"
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                placeholder="mínimo 6 caracteres"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Confirmar senha
              </label>
              <input
                type="password"
                value={novaSenhaConfirm}
                onChange={(e) => setNovaSenhaConfirm(e.target.value)}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Perfil
              </label>
              <select
                value={novoRoleName}
                onChange={(e) => setNovoRoleName(e.target.value)}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              >
                {roles.map((r) => (
                  <option key={r.id} value={r.name}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={() => setModalCriar(false)}
              className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              Cancelar
            </button>
            <button
              onClick={handleCriar}
              disabled={salvando}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60"
            >
              {salvando ? "Criando..." : "Criar Usuário"}
            </button>
          </div>
        </Modal>
      )}

      {/* ── Modal Editar ────────────────────────────────────────────────────── */}
      {modalEditar && (
        <Modal titulo={`Editar — ${modalEditar.username}`} onClose={() => setModalEditar(null)}>
          {erroModal && (
            <p className="mb-4 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
              {erroModal}
            </p>
          )}
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Usuário
              </label>
              <input
                type="text"
                value={editUsername}
                onChange={(e) => setEditUsername(e.target.value)}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Perfil
              </label>
              <select
                value={editRoleName}
                onChange={(e) => setEditRoleName(e.target.value)}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              >
                {roles.map((r) => (
                  <option key={r.id} value={r.name}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={() => setModalEditar(null)}
              className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              Cancelar
            </button>
            <button
              onClick={handleEditar}
              disabled={salvando}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60"
            >
              {salvando ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </Modal>
      )}

      {/* ── Modal Trocar Senha ───────────────────────────────────────────────── */}
      <ModalTrocarSenha
        isOpen={!!modalSenha}
        onClose={() => setModalSenha(null)}
        onConfirm={handleTrocarSenha}
      />

      {/* ── Modal Excluir ────────────────────────────────────────────────────── */}
      {modalExcluir && (
        <Modal titulo="Confirmar Exclusão" onClose={() => setModalExcluir(null)}>
          {erroModal && (
            <p className="mb-4 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
              {erroModal}
            </p>
          )}
          <p className="text-gray-700 dark:text-gray-300">
            Tem certeza que deseja excluir o usuário{" "}
            <span className="font-semibold text-gray-900 dark:text-white">
              {modalExcluir.username}
            </span>
            ? Esta ação não pode ser desfeita.
          </p>
          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={() => setModalExcluir(null)}
              className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              Cancelar
            </button>
            <button
              onClick={handleExcluir}
              disabled={salvando}
              className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-60"
            >
              {salvando ? "Excluindo..." : "Excluir"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Usuarios;
