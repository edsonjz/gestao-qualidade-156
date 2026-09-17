import React from 'react';
import { Sun, Moon, Bell, User, LogOut, ShieldCheck } from 'lucide-react';

export default function Header({ 
  currentUser,
  userRole = 'admin',
  darkMode, 
  setDarkMode, 
  alertsCount = 0, 
  activeTab,
  onLogout 
}) {
  const getTitle = () => {
    switch (activeTab) {
      case 'dashboard': return 'Dashboard Principal';
      case 'queue': return userRole === 'supervisor' ? 'Fila de Feedbacks' : 'Painel da Monitora';
      case 'operators': return 'Gestão de Colaboradores';
      case 'monitorings_history': return 'Histórico de Monitorias';
      case 'monitors': return 'Monitoras & Supervisores';
      case 'intelligence': return 'Inteligência Analítica (IA)';
      case 'reports': return 'Central de Relatórios';
      case 'config': return 'Configurações de Checklist';
      case 'users': return 'Gestão de Acessos & Credenciais';
      case 'portal': return 'Meu Painel de Avaliações';
      default: return 'Sistema de Qualidade 156';
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin':
        return <span className="bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 text-[11px] px-2 py-0.5 rounded-md font-bold">Admin Master</span>;
      case 'monitor':
        return <span className="bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 text-[11px] px-2 py-0.5 rounded-md font-bold">Monitor(a)</span>;
      case 'supervisor':
        return <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 text-[11px] px-2 py-0.5 rounded-md font-bold">Supervisor(a)</span>;
      case 'operador':
        return <span className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 text-[11px] px-2 py-0.5 rounded-md font-bold">Operador</span>;
      default:
        return <span className="bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 text-[11px] px-2 py-0.5 rounded-md font-bold">{role}</span>;
    }
  };

  return (
    <header className="h-16 bg-white dark:bg-[#0c0c0f] border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between px-6 no-print shrink-0">
      <div className="flex items-center gap-4">
        <h2 className="text-xl font-bold text-zinc-950 dark:text-zinc-50 tracking-tight">
          {getTitle()}
        </h2>
      </div>

      <div className="flex items-center gap-4">
        {/* Identificação do Usuário Logado */}
        <div className="flex items-center gap-2.5 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-1.5 shadow-sm">
          <div className="w-7 h-7 rounded-lg bg-blue-600/10 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">
            <User className="w-4 h-4" />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 leading-tight">
              {currentUser?.name || currentUser?.email || 'Usuário'}
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              {getRoleBadge(userRole)}
            </div>
          </div>
        </div>

        {/* Notificações */}
        <div className="relative">
          <button className="p-2 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg transition-colors">
            <Bell className="w-4.5 h-4.5" />
            {alertsCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full animate-pulse"></span>
            )}
          </button>
        </div>

        {/* Toggle Dark/Light Mode */}
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="p-2 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg transition-colors cursor-pointer"
          title="Alternar Tema Claro/Escuro"
        >
          {darkMode ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
        </button>

        {/* Sair do Sistema */}
        <button
          onClick={onLogout}
          className="p-2 text-zinc-500 dark:text-zinc-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
          title="Sair do Sistema"
        >
          <LogOut className="w-4.5 h-4.5" />
        </button>
      </div>
    </header>
  );
}
