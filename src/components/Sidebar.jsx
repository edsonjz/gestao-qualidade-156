import React from 'react';
import { 
  LayoutDashboard, 
  UserCheck, 
  Users, 
  ShieldAlert, 
  FileSpreadsheet, 
  Settings, 
  Brain,
  Award,
  ClipboardList,
  ShieldCheck,
  Sparkles
} from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, unreadAlertsCount, userRole = 'admin' }) {
  
  // Lista de menus filtrada conforme o cargo / role do usuário autenticado
  const getMenuItems = () => {
    // 1. Operador: Somente seu portal de monitorias e feedbacks
    if (userRole === 'operador') {
      return [
        { id: 'portal', label: 'Minhas Avaliações', icon: Award },
      ];
    }

    // 2. Supervisor: Visão da sua equipe, dashboard, feedbacks e relatórios
    if (userRole === 'supervisor') {
      return [
        { id: 'dashboard', label: 'Dashboard da Equipe', icon: LayoutDashboard },
        { id: 'queue', label: 'Fila de Feedbacks', icon: UserCheck },
        { id: 'monitorings_history', label: 'Histórico de Monitorias', icon: ClipboardList },
        { id: 'audits', label: 'Auditorias', icon: Sparkles },
        { id: 'monitors', label: 'Qualidade & Equipes', icon: Award },
        { id: 'reports', label: 'Relatórios', icon: FileSpreadsheet },
      ];
    }

    // 3. Monitor(a): Fila de monitoria, Dashboard, Operadores, Histórico, Auditorias, Checklist, Qualidade & Equipes
    if (userRole === 'monitor') {
      return [
        { id: 'queue', label: 'Fila de Monitoria', icon: UserCheck },
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'operators', label: 'Operadores', icon: Users },
        { id: 'monitorings_history', label: 'Histórico de Monitorias', icon: ClipboardList },
        { id: 'audits', label: 'Auditorias', icon: Sparkles },
        { id: 'monitors', label: 'Qualidade & Equipes', icon: Award },
        { id: 'config', label: 'Checklist de Qualidade', icon: Settings },
      ];
    }

    // 4. Administrador (Master ou admin): Acesso completo
    return [
      { id: 'dashboard', label: 'Dashboard Geral', icon: LayoutDashboard },
      { id: 'queue', label: 'Fila Inteligente', icon: UserCheck },
      { id: 'operators', label: 'Operadores', icon: Users },
      { id: 'monitorings_history', label: 'Histórico de Monitorias', icon: ClipboardList },
      { id: 'audits', label: 'Auditorias', icon: Sparkles },
      { id: 'monitors', label: 'Qualidade & Equipes', icon: Award },
      { id: 'intelligence', label: 'Inteligência Analítica', icon: Brain, badge: unreadAlertsCount },
      { id: 'reports', label: 'Relatórios', icon: FileSpreadsheet },
      { id: 'config', label: 'Checklist de Qualidade', icon: Settings },
      { id: 'users', label: 'Gestão de Acessos', icon: ShieldCheck },
    ];
  };

  const menuItems = getMenuItems();

  return (
    <aside className="w-64 bg-white dark:bg-[#0c0c0f] border-r border-zinc-200 dark:border-zinc-800 flex flex-col h-screen no-print shrink-0">
      <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-extrabold text-lg shadow-sm">
          Q
        </div>
        <div>
          <h1 className="font-bold text-zinc-950 dark:text-zinc-50 tracking-tight leading-tight">Qualidade 156</h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Operação 156+POA</p>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {menuItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive 
                  ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30 font-semibold' 
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-200 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-zinc-400 dark:text-zinc-500'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge > 0 && (
                <span className="bg-rose-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Rodapé da barra lateral */}
      <div className="p-4 border-t border-zinc-200 dark:border-zinc-800">
        <div className="p-3 bg-zinc-50 dark:bg-zinc-900/40 rounded-xl border border-zinc-200/60 dark:border-zinc-800/60">
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
            Perfil Atual:
          </p>
          <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 capitalize">
            {userRole === 'admin' ? 'Administrador' : userRole === 'monitor' ? 'Monitor(a)' : userRole === 'supervisor' ? 'Supervisor(a)' : 'Operador'}
          </span>
        </div>
      </div>
    </aside>
  );
}
