import React from 'react';
import { Sun, Moon, Bell, User, LogOut } from 'lucide-react';

export default function Header({ 
  activeProfile, 
  setActiveProfile, 
  darkMode, 
  setDarkMode, 
  alertsCount, 
  activeTab,
  onLogout
}) {
  const getTitle = () => {
    switch (activeTab) {
      case 'dashboard': return 'Dashboard Principal';
      case 'queue': return 'Painel da Monitora';
      case 'operators': return 'Gestão de Operadores';
      case 'monitors': return 'Monitoras & Supervisores';
      case 'intelligence': return 'Inteligência Analítica (IA)';
      case 'reports': return 'Central de Relatórios';
      case 'config': return 'Configurações de Checklist';
      default: return 'Sistema de Qualidade';
    }
  };

  const profiles = [
    { id: 'Clarice', name: 'Clarice (Monitora)', role: 'Monitora' },
    { id: 'Simone', name: 'Simone (Monitora)', role: 'Monitora' },
    { id: 'Carlos', name: 'Carlos (Supervisor)', role: 'Supervisor' },
    { id: 'Admin', name: 'Administrador (Admin)', role: 'Admin' },
  ];

  return (
    <header className="h-16 bg-white dark:bg-[#0c0c0f] border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between px-6 no-print">
      <div className="flex items-center gap-4">
        <h2 className="text-xl font-bold text-zinc-950 dark:text-zinc-50 tracking-tight">
          {getTitle()}
        </h2>
      </div>

      <div className="flex items-center gap-4">
        {/* Simulação de Perfil de Acesso */}
        <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5">
          <User className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
          <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Acesso Simulado:</span>
          <select
            value={activeProfile.id}
            onChange={(e) => {
              const prof = profiles.find(p => p.id === e.target.value);
              setActiveProfile(prof);
            }}
            className="bg-transparent text-xs font-semibold text-zinc-800 dark:text-zinc-200 border-none outline-none focus:ring-0 p-0 cursor-pointer"
          >
            {profiles.map(p => (
              <option key={p.id} value={p.id} className="bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200">
                {p.name}
              </option>
            ))}
          </select>
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
