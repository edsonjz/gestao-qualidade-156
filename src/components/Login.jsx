import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Shield, KeyRound, Mail, AlertCircle, Loader2 } from 'lucide-react';

export default function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password
      });

      if (error) {
        if (error.message && error.message.includes('Invalid login credentials')) {
          setError('E-mail ou senha incorretos. Por favor, tente novamente.');
        } else {
          setError(error.message || 'Erro inesperado ao realizar login.');
        }
      } else {
        onLoginSuccess(data.session);
      }
    } catch (err) {
      console.error(err);
      setError('Erro de conexão ao tentar fazer login.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-[#09090b] p-4 font-sans transition-colors duration-300 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-500/10 dark:bg-blue-500/5 blur-[80px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-500/10 dark:bg-indigo-500/5 blur-[80px] pointer-events-none" />

      <div className="w-full max-w-md bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800/80 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-md relative z-10 transition-all duration-300">
        <div className="px-8 pt-10 pb-6 text-center border-b border-zinc-100 dark:border-zinc-800/50">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-500 mb-4 ring-8 ring-blue-500/5">
            <Shield className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight">
            156+POA Qualidade
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5 font-medium">
            Gestão Inteligente de Qualidade e Monitorias
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-5 text-xs">
          {error && (
            <div className="flex items-start gap-2.5 p-3.5 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400 rounded-xl animate-shake">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span className="leading-relaxed font-semibold">{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-[10px]">
              E-mail de Acesso
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400 dark:text-zinc-600 pointer-events-none">
                <Mail className="w-4 h-4" />
              </span>
              <input
                type="email"
                required
                placeholder="exemplo@156poa.com.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-[#070709] border border-zinc-200 dark:border-zinc-800/80 rounded-xl pl-10 pr-4 py-3 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-500 transition-all font-semibold"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-[10px]">
              Senha de Acesso
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400 dark:text-zinc-600 pointer-events-none">
                <KeyRound className="w-4 h-4" />
              </span>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-[#070709] border border-zinc-200 dark:border-zinc-800/80 rounded-xl pl-10 pr-4 py-3 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-500 transition-all font-semibold"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Autenticando...</span>
              </>
            ) : (
              <span>Entrar no Sistema</span>
            )}
          </button>
        </form>

        <div className="px-8 pb-8 text-center">
          <p className="text-[10px] text-zinc-400 dark:text-zinc-600 font-semibold leading-relaxed">
            Este sistema possui controle de acesso restrito.<br />
            Para acessos simultâneos, utilize a credencial institucional compartilhada.
          </p>
        </div>
      </div>
    </div>
  );
}
