import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Shield, KeyRound, Mail, AlertCircle, Loader2, UserCheck, Users, Sparkles } from 'lucide-react';

export default function Login({ onLoginSuccess }) {
  const [loginMode, setLoginMode] = useState('matricula'); // 'matricula' | 'email'
  const [matricula, setMatricula] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let emailToAuth = '';

      if (loginMode === 'matricula') {
        const matClean = matricula.trim().toLowerCase();
        if (!matClean) {
          setError('Por favor, informe a sua matrícula.');
          setLoading(false);
          return;
        }
        // Padronização da credencial de autenticação do operador via matrícula
        emailToAuth = `op_${matClean}@156poa.com.br`;
      } else {
        emailToAuth = email.trim().toLowerCase();
        if (!emailToAuth) {
          setError('Por favor, informe o seu e-mail institucional.');
          setLoading(false);
          return;
        }
      }

      let { data, error: authErr } = await supabase.auth.signInWithPassword({
        email: emailToAuth,
        password: password
      });

      // Auto-provisionamento no primeiro acesso: se o operador usar a senha inicial padrão 123456
      // e a conta ainda não existir no Supabase Auth, cria a conta na hora e realiza o login
      if (authErr && loginMode === 'matricula' && password === '123456') {
        try {
          const matClean = matricula.trim().toLowerCase();
          const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
            email: emailToAuth,
            password: '123456',
            options: {
              data: {
                matricula: matClean,
                role: 'operador'
              }
            }
          });

          if (!signUpErr) {
            if (signUpData?.session) {
              onLoginSuccess(signUpData.session);
              return;
            }
            // Tenta logar em seguida
            const retryRes = await supabase.auth.signInWithPassword({
              email: emailToAuth,
              password: '123456'
            });
            if (retryRes?.data?.session) {
              onLoginSuccess(retryRes.data.session);
              return;
            }
          }
        } catch (autoErr) {
          console.warn('Auto-provisionamento no primeiro acesso:', autoErr);
        }
      }

      if (authErr) {
        const msg = authErr.message || '';
        if (msg.includes('Email not confirmed')) {
          setError('Acesso ainda não confirmado no Supabase. Solicite a confirmação ao Administrador.');
        } else if (msg.includes('Invalid login credentials')) {
          if (loginMode === 'matricula') {
            setError('Matrícula ou senha incorretos. Verifique os dados. (A senha inicial padrão é 123456).');
          } else {
            setError('E-mail ou senha incorretos. Por favor, verifique suas credenciais.');
          }
        } else if (msg.includes('rate limit')) {
          setError('Muitas tentativas consecutivas. Aguarde alguns instantes e tente novamente.');
        } else {
          setError(msg || 'Erro inesperado ao realizar login.');
        }
      } else {
        onLoginSuccess(data.session);
      }
    } catch (err) {
      console.error(err);
      setError('Erro de conexão ao tentar fazer login. Verifique sua internet.');
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
        
        {/* Header com Logo */}
        <div className="px-8 pt-8 pb-5 text-center border-b border-zinc-100 dark:border-zinc-800/50">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-500 mb-3 ring-8 ring-blue-500/5">
            <Shield className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight">
            156+POA Qualidade
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 font-medium">
            Gestão Inteligente de Qualidade, Monitorias & Auditorias
          </p>

          {/* Seletor de Perfil de Login (Operador vs Gestão) */}
          <div className="grid grid-cols-2 gap-2 mt-5 p-1 bg-zinc-100 dark:bg-[#070709] rounded-xl border border-zinc-200/80 dark:border-zinc-800/80">
            <button
              type="button"
              onClick={() => {
                setLoginMode('matricula');
                setError('');
              }}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                loginMode === 'matricula'
                  ? 'bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Operador (Matrícula)
            </button>

            <button
              type="button"
              onClick={() => {
                setLoginMode('email');
                setError('');
              }}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                loginMode === 'email'
                  ? 'bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              Gestão (E-mail)
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-4 text-xs">
          {error && (
            <div className="flex items-start gap-2.5 p-3.5 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400 rounded-xl">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span className="leading-relaxed font-semibold">{error}</span>
            </div>
          )}

          {/* Campo Condicional: Matrícula (Operador) ou E-mail (Gestão) */}
          {loginMode === 'matricula' ? (
            <div className="space-y-1.5">
              <label className="font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-[10px]">
                Matrícula do Operador
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400 dark:text-zinc-600 pointer-events-none">
                  <Users className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  required
                  placeholder="Ex: 156001 ou 12345"
                  value={matricula}
                  onChange={(e) => setMatricula(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-[#070709] border border-zinc-200 dark:border-zinc-800/80 rounded-xl pl-10 pr-4 py-3 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-500 transition-all font-semibold"
                />
              </div>
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500">
                Digite o número da sua matrícula cadastrado na planilha.
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-[10px]">
                E-mail Institucional (Gestão / Monitores)
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400 dark:text-zinc-600 pointer-events-none">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  required
                  placeholder="exemplo@explorercallcenter.com.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-[#070709] border border-zinc-200 dark:border-zinc-800/80 rounded-xl pl-10 pr-4 py-3 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-500 transition-all font-semibold"
                />
              </div>
            </div>
          )}

          {/* Senha */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-[10px]">
                Senha de Acesso
              </label>
              {loginMode === 'matricula' && (
                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">
                  Padrão Inicial: 123456
                </span>
              )}
            </div>
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
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:pointer-events-none mt-2"
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

        <div className="px-8 pb-7 text-center">
          <p className="text-[10px] text-zinc-400 dark:text-zinc-600 font-medium leading-relaxed">
            {loginMode === 'matricula' 
              ? 'Operadores podem acessar suas avaliações e trocar sua senha padrão no portal.' 
              : 'Acesso restrito para Supervisores, Monitores e Administrador Master.'}
          </p>
        </div>
      </div>
    </div>
  );
}
