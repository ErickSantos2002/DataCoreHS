"use client"

import React, { useState, useEffect } from "react"
import { useAuth } from "../hooks/useAuth"
import { useNavigate } from "react-router-dom"
import logo from "../assets/logo.png"
import fundo from "../assets/fundo.jpeg"

const Login: React.FC = () => {
  const { login, loading, error, user } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")

  useEffect(() => {
    if (user && location.pathname !== "/inicio") {
      navigate("/inicio", { replace: true });
    }
  }, [user, navigate, location.pathname]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await login(username, password)
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-cover bg-center"
      style={{ backgroundImage: `url(${fundo})` }}
    >
      <div
        className="w-full max-w-[320px] bg-white rounded-[15px] shadow-2xl relative z-10 overflow-hidden"
      >
        <div className="px-6 py-8">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <img src={logo} alt="Logo" className="max-h-[80px] object-contain" />
          </div>

          {/* Título */}
          <div className="text-center mb-8">
            <h1 className="text-[22px] font-bold text-[#121417] font-['Manrope']"></h1>
          </div>

          {/* Formulário */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <input
              id="username"
              type="text"
              value={username}
              autoComplete="username"
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              placeholder="Usuário"
              style={{ backgroundColor: 'white' }}
              className="w-full h-[56px] px-4 py-3 bg-white border border-[#DBE0E6] rounded-[12px] text-[16px] placeholder:text-[#61758A] font-['Manrope'] focus:ring-2 focus:ring-[#3D99F5] focus:border-[#3D99F5] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
              required
            />

            <input
              id="password"
              type="password"
              value={password}
              autoComplete="current-password"
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              placeholder="Senha"
              style={{ backgroundColor: 'white' }}
              className="w-full h-[56px] px-4 py-3 bg-white border border-[#DBE0E6] rounded-[12px] text-[16px] placeholder:text-[#61758A] font-['Manrope'] focus:ring-2 focus:ring-[#3D99F5] focus:border-[#3D99F5] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
              required
            />

            {error && (
              <div className="text-sm text-red-600 text-center bg-red-50 p-3 rounded-lg border border-red-200">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-[50%] h-[48px] bg-[#3D99F5] hover:bg-[#2E86AB] disabled:bg-[#3D99F5]/50 disabled:cursor-not-allowed text-white font-bold text-[16px] rounded-[12px] font-['Manrope'] transition-colors duration-200 flex items-center justify-center mx-auto"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Entrando...
                </div>
              ) : (
                "Entrar"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default Login
