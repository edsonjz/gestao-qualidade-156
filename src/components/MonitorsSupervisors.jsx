import React, { useState, useMemo } from 'react';
import { 
  Award, 
  Target, 
  Clock, 
  CheckCircle, 
  Percent, 
  Users,
  Plus,
  Trash2,
  Edit,
  KeyRound,
  Mail,
  User,
  X,
  AlertCircle,
  RefreshCw,
  Shield
} from 'lucide-react';

export default function MonitorsSupervisors({ 
  operators, 
  monitorings, 
  monitors, 
  supervisors,
  users = [],
  activeCycle,
  onSaveMonitor,
  onDeleteMonitor,
  onSaveSupervisor,
  onDeleteSupervisor
}) {
  // Estados para Modais
  const [showMonitorModal, setShowMonitorModal] = useState(false);
  const [editingMonitor, setEditingMonitor] = useState(null);
  const [monitorForm, setMonitorForm] = useState({
    name: '',
    daily_target: 17,
    email: '',
    password: ''
  });

  const [showSupervisorModal, setShowSupervisorModal] = useState(false);
  const [editingSupervisor, setEditingSupervisor] = useState(null);
  const [supervisorForm, setSupervisorForm] = useState({
    name: '',
    email: '',
    password: ''
  });

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // 1. Calcular estatísticas das Monitoras
  const monitorStats = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const currentMonthStr = new Date().toISOString().slice(0, 7); // YYYY-MM

    return monitors.map(m => {
      const monitorMonitorings = monitorings.filter(mon => mon.monitor_id === m.id);
      
      const realizedToday = monitorMonitorings.filter(mon => 
        mon.monitoring_date && mon.monitoring_date.startsWith(todayStr)
      ).length;

      const pendingFeedbacks = monitorMonitorings.filter(mon => 
        mon.status === 'Aguardando Feedback'
      ).length;

      const completedFeedbacks = monitorMonitorings.filter(mon => 
        mon.status === 'Feedback Concluído'
      ).length;

      const monthlyProductivity = monitorMonitorings.filter(mon => 
        mon.monitoring_date && mon.monitoring_date.startsWith(currentMonthStr)
      ).length;

      const dailyProductivityPct = m.daily_target > 0 
        ? Math.round((realizedToday / m.daily_target) * 100) 
        : 0;

      // Buscar credencial vinculada
      const linkedUser = users.find(u => u.monitor_id === m.id || (u.role === 'monitor' && u.name.toLowerCase() === m.name.toLowerCase()));

      return {
        ...m,
        realizedToday,
        pendingFeedbacks,
        completedFeedbacks,
        monthlyProductivity,
        dailyProductivityPct,
        linkedUser
      };
    });
  }, [monitors, monitorings, users]);

  // 2. Calcular estatísticas dos Supervisores
  const supervisorStats = useMemo(() => {
    return supervisors.map(s => {
      const activeOpsForSuper = operators.filter(o => o.active && o.supervisor_id === s.id);
      const activeOpsIds = new Set(activeOpsForSuper.map(o => o.id));

      const superMonitorings = monitorings.filter(m => activeOpsIds.has(m.operator_id));
      
      const pendingFeedbacks = superMonitorings.filter(m => m.status === 'Aguardando Feedback').length;
      const completedFeedbacks = superMonitorings.filter(m => m.status === 'Feedback Concluído').length;

      // Monitoramentos no ciclo ativo
      const opsMonitoredInActiveCycle = new Set(
        superMonitorings
          .filter(m => m.cycle_id === activeCycle?.id)
          .map(m => m.operator_id)
      );

      const monitoredActiveCount = activeOpsForSuper.filter(o => opsMonitoredInActiveCycle.has(o.id)).length;
      const coveragePct = activeOpsForSuper.length > 0 
        ? Math.round((monitoredActiveCount / activeOpsForSuper.length) * 100) 
        : 0;

      // Média de notas
      const scores = superMonitorings.map(m => m.score);
      const avgScore = scores.length > 0 
        ? Math.round(scores.reduce((sum, val) => sum + val, 0) / scores.length * 10) / 10 
        : 0;

      const opsSemMonitoria = activeOpsForSuper.filter(o => !opsMonitoredInActiveCycle.has(o.id)).length;
      const opsAguardandoFeedback = activeOpsForSuper.filter(o => o.status_feedback === 'Aguardando Feedback').length;

      // Buscar credencial vinculada
      const linkedUser = users.find(u => u.supervisor_id === s.id || (u.role === 'supervisor' && u.name.toLowerCase() === s.name.toLowerCase()));

      return {
        ...s,
        operatorCount: activeOpsForSuper.length,
        realizedCount: superMonitorings.length,
        pendingFeedbacks,
        completedFeedbacks,
        coveragePct,
        avgScore,
        opsSemMonitoria,
        opsAguardandoFeedback,
        linkedUser
      };
    });
  }, [supervisors, operators, monitorings, activeCycle, users]);

  // Handlers para Monitoras
  const handleOpenAddMonitor = () => {
    setEditingMonitor(null);
    setMonitorForm({
      name: '',
      daily_target: 17,
      email: '',
      password: ''
    });
    setErrorMsg('');
    setShowMonitorModal(true);
  };

  const handleOpenEditMonitor = (m) => {
    setEditingMonitor(m);
    setMonitorForm({
      name: m.name || '',
      daily_target: m.daily_target || 17,
      email: m.linkedUser?.email || '',
      password: ''
    });
    setErrorMsg('');
    setShowMonitorModal(true);
  };

  const handleSubmitMonitor = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);
    try {
      await onSaveMonitor({
        id: editingMonitor?.id,
        name: monitorForm.name.trim(),
        daily_target: parseInt(monitorForm.daily_target, 10) || 17,
        email: monitorForm.email.trim().toLowerCase(),
        password: monitorForm.password
      });
      setShowMonitorModal(false);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Erro ao salvar monitora e credencial.');
    } finally {
      setLoading(false);
    }
  };

  // Handlers para Supervisores
  const handleOpenAddSupervisor = () => {
    setEditingSupervisor(null);
    setSupervisorForm({
      name: '',
      email: '',
      password: ''
    });
    setErrorMsg('');
    setShowSupervisorModal(true);
  };

  const handleOpenEditSupervisor = (s) => {
    setEditingSupervisor(s);
    setSupervisorForm({
      name: s.name || '',
      email: s.linkedUser?.email || '',
      password: ''
    });
    setErrorMsg('');
    setShowSupervisorModal(true);
  };

  const handleSubmitSupervisor = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);
    try {
      await onSaveSupervisor({
        id: editingSupervisor?.id,
        name: supervisorForm.name.trim(),
        email: supervisorForm.email.trim().toLowerCase(),
        password: supervisorForm.password
      });
      setShowSupervisorModal(false);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Erro ao salvar supervisor e credencial.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      
      {/* SEÇÃO 1: MONITORAS DE QUALIDADE */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
              Controle de Produtividade das Monitoras
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Gerencie metas diárias, acompanhamento e credenciais de acesso das monitoras.
            </p>
          </div>
          <button 
            onClick={handleOpenAddMonitor}
            className="flex items-center gap-1.5 bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold py-2 px-3.5 rounded-lg transition-colors shadow-sm no-print"
          >
            <Plus className="w-3.5 h-3.5" />
            Adicionar Monitora
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {monitorStats.map(m => (
            <div 
              key={m.id} 
              className="bg-white dark:bg-[#0c0c0f] rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-6 space-y-4 relative"
            >
              {/* Header Monitora */}
              <div className="flex justify-between items-center border-b border-zinc-200 dark:border-zinc-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-md">
                    {m.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">{m.name}</h4>
                    {m.linkedUser ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                        <KeyRound className="w-3 h-3" />
                        {m.linkedUser.email}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                        <AlertCircle className="w-3 h-3" />
                        Sem login cadastrado
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 no-print">
                  <button
                    onClick={() => handleOpenEditMonitor(m)}
                    className="p-1.5 text-zinc-500 hover:text-blue-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors"
                    title="Editar Dados e Credencial"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => onDeleteMonitor(m.id)}
                    className="p-1.5 text-zinc-400 hover:text-rose-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors"
                    title="Excluir Monitora"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Grid de Estatísticas */}
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="bg-zinc-50 dark:bg-zinc-900/30 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800/40">
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase font-semibold block mb-0.5">Meta Diária</span>
                  <div className="flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-zinc-400" />
                    <span className="text-base font-bold text-zinc-800 dark:text-zinc-200">{m.daily_target}</span>
                  </div>
                </div>

                <div className="bg-zinc-50 dark:bg-zinc-900/30 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800/40">
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase font-semibold block mb-0.5">Realizado Hoje</span>
                  <div className="flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-base font-bold text-zinc-800 dark:text-zinc-200">{m.realizedToday}</span>
                  </div>
                </div>

                <div className="bg-zinc-50 dark:bg-zinc-900/30 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800/40 col-span-2 lg:col-span-1">
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase font-semibold block mb-0.5">Produtividade</span>
                  <div className="flex items-center gap-1.5">
                    <Percent className="w-3.5 h-3.5 text-blue-500" />
                    <span className={`text-base font-bold ${
                      m.dailyProductivityPct >= 100 ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-800 dark:text-zinc-200'
                    }`}>{m.dailyProductivityPct}%</span>
                  </div>
                </div>

                <div className="bg-zinc-50 dark:bg-zinc-900/30 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800/40">
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase font-semibold block mb-0.5">Feedbacks Pendentes</span>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-base font-bold text-zinc-800 dark:text-zinc-200">{m.pendingFeedbacks}</span>
                  </div>
                </div>

                <div className="bg-zinc-50 dark:bg-zinc-900/30 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800/40">
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase font-semibold block mb-0.5">Feedbacks Concluídos</span>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-base font-bold text-zinc-800 dark:text-zinc-200">{m.completedFeedbacks}</span>
                  </div>
                </div>

                <div className="bg-zinc-50 dark:bg-zinc-900/30 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800/40 col-span-2 lg:col-span-1">
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase font-semibold block mb-0.5">Realizado no Mês</span>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-purple-500" />
                    <span className="text-base font-bold text-zinc-800 dark:text-zinc-200">{m.monthlyProductivity}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SEÇÃO 2: CONTROLE POR SUPERVISOR */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
              Painel de Controle por Supervisor (Ciclo Atual)
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Supervisores cadastrados, status de credenciais de login e acompanhamento de equipe.
            </p>
          </div>
          <button 
            onClick={handleOpenAddSupervisor}
            className="flex items-center gap-1.5 bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold py-2 px-3.5 rounded-lg transition-colors shadow-sm no-print"
          >
            <Plus className="w-3.5 h-3.5" />
            Adicionar Supervisor
          </button>
        </div>

        <div className="bg-white dark:bg-[#0c0c0f] rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-900/40 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-800">
                  <th className="px-6 py-3.5">Supervisor</th>
                  <th className="px-6 py-3.5">Credencial / Login</th>
                  <th className="px-6 py-3.5 text-center">Operadores Ativos</th>
                  <th className="px-6 py-3.5 text-center">Monitorias Realizadas</th>
                  <th className="px-6 py-3.5 text-center">Média de Notas</th>
                  <th className="px-6 py-3.5 text-center">Cobertura no Ciclo</th>
                  <th className="px-6 py-3.5 text-center">Aguardando Monitoria</th>
                  <th className="px-6 py-3.5 text-center">Aguardando Feedback</th>
                  <th className="px-6 py-3.5 text-right no-print">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-sm text-zinc-800 dark:text-zinc-200">
                {supervisorStats.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="text-center py-10 text-zinc-500 dark:text-zinc-400">
                      Nenhum supervisor cadastrado. Insira planilhas ou adicione manualmente.
                    </td>
                  </tr>
                ) : (
                  supervisorStats.map(s => (
                    <tr key={s.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/30 transition-colors">
                      <td className="px-6 py-3.5 font-bold">{s.name}</td>
                      <td className="px-6 py-3.5 text-xs">
                        {s.linkedUser ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-mono font-medium">
                            <KeyRound className="w-3 h-3" />
                            {s.linkedUser.email}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 italic">
                            <AlertCircle className="w-3 h-3" />
                            Sem login
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3.5 text-center font-semibold">
                        <span className="flex items-center justify-center gap-1 text-zinc-700 dark:text-zinc-300">
                          <Users className="w-3.5 h-3.5 text-zinc-400" />
                          {s.operatorCount}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-center font-semibold">{s.realizedCount}</td>
                      <td className="px-6 py-3.5 text-center">
                        {s.avgScore > 0 ? (
                          <span className={`inline-block px-2 py-0.5 rounded font-bold ${
                            s.avgScore >= 90 
                              ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400' 
                              : s.avgScore >= 80
                                ? 'bg-orange-50 text-orange-600 dark:bg-orange-950/20 dark:text-orange-400'
                                : 'bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400'
                          }`}>
                            {s.avgScore}
                          </span>
                        ) : (
                          <span className="text-zinc-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span className="font-bold">{s.coveragePct}%</span>
                          <div className="w-16 bg-zinc-200 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden hidden sm:block">
                            <div 
                              className={`h-full rounded-full ${s.coveragePct === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                              style={{ width: `${s.coveragePct}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3.5 text-center text-rose-500 font-bold">{s.opsSemMonitoria}</td>
                      <td className="px-6 py-3.5 text-center text-amber-500 font-bold">{s.opsAguardandoFeedback}</td>
                      <td className="px-6 py-3.5 text-right no-print space-x-1.5">
                        <button
                          onClick={() => handleOpenEditSupervisor(s)}
                          className="p-1 text-zinc-500 hover:text-blue-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors"
                          title="Editar Nome e Credencial"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDeleteSupervisor(s.id)}
                          className="p-1 text-zinc-400 hover:text-rose-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors"
                          title="Excluir Supervisor"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ================= MODAL: ADICIONAR / EDITAR MONITORA ================= */}
      {showMonitorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#0c0c0f] w-full max-w-md rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-900/10">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Award className="w-4 h-4 text-blue-500" />
                {editingMonitor ? 'Editar Monitora & Credencial' : 'Cadastrar Monitora com Credencial'}
              </h3>
              <button 
                onClick={() => setShowMonitorModal(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitMonitor} className="p-6 space-y-4 text-xs">
              {errorMsg && (
                <div className="p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Nome */}
              <div className="space-y-1.5">
                <label className="font-semibold text-zinc-500 dark:text-zinc-400">Nome da Monitora</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Clarice"
                  value={monitorForm.name}
                  onChange={(e) => setMonitorForm({ ...monitorForm, name: e.target.value })}
                  className="w-full bg-white dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-zinc-950 dark:text-zinc-100"
                />
              </div>

              {/* Meta Diária */}
              <div className="space-y-1.5">
                <label className="font-semibold text-zinc-500 dark:text-zinc-400">Meta Diária de Avaliações</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  required
                  value={monitorForm.daily_target}
                  onChange={(e) => setMonitorForm({ ...monitorForm, daily_target: e.target.value })}
                  className="w-full bg-white dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-zinc-950 dark:text-zinc-100"
                />
              </div>

              {/* Bloco de Credencial de Acesso */}
              <div className="p-3.5 bg-blue-50/50 dark:bg-blue-950/20 rounded-xl border border-blue-200 dark:border-blue-900/30 space-y-3">
                <div className="flex items-center gap-1.5 font-bold text-blue-900 dark:text-blue-300">
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Credencial de Acesso (Login no Sistema)</span>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-zinc-600 dark:text-zinc-400">E-mail para Login</label>
                  <input
                    type="email"
                    placeholder="monitora@qualidade156.com.br"
                    value={monitorForm.email}
                    onChange={(e) => setMonitorForm({ ...monitorForm, email: e.target.value })}
                    className="w-full bg-white dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-zinc-950 dark:text-zinc-100"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-zinc-600 dark:text-zinc-400">
                    {editingMonitor ? 'Alterar Senha (opcional, deixe em branco para manter)' : 'Senha Inicial de Acesso (mínimo 6 dígitos)'}
                  </label>
                  <input
                    type="password"
                    minLength={6}
                    placeholder={editingMonitor ? 'Deixe em branco para não alterar' : '••••••••'}
                    value={monitorForm.password}
                    onChange={(e) => setMonitorForm({ ...monitorForm, password: e.target.value })}
                    className="w-full bg-white dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-zinc-950 dark:text-zinc-100"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowMonitorModal(false)}
                  disabled={loading}
                  className="px-4 py-2 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors shadow-sm flex items-center gap-1.5"
                >
                  {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  {editingMonitor ? 'Salvar Alterações' : 'Cadastrar Monitora'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: ADICIONAR / EDITAR SUPERVISOR ================= */}
      {showSupervisorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#0c0c0f] w-full max-w-md rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-900/10">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-500" />
                {editingSupervisor ? 'Editar Supervisor & Credencial' : 'Cadastrar Supervisor com Credencial'}
              </h3>
              <button 
                onClick={() => setShowSupervisorModal(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitSupervisor} className="p-6 space-y-4 text-xs">
              {errorMsg && (
                <div className="p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Nome */}
              <div className="space-y-1.5">
                <label className="font-semibold text-zinc-500 dark:text-zinc-400">Nome do Supervisor</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Carlos Silva"
                  value={supervisorForm.name}
                  onChange={(e) => setSupervisorForm({ ...supervisorForm, name: e.target.value })}
                  className="w-full bg-white dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-zinc-950 dark:text-zinc-100"
                />
              </div>

              {/* Bloco de Credencial de Acesso */}
              <div className="p-3.5 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl border border-emerald-200 dark:border-emerald-900/30 space-y-3">
                <div className="flex items-center gap-1.5 font-bold text-emerald-900 dark:text-emerald-300">
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Credencial de Acesso (Login no Sistema)</span>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-zinc-600 dark:text-zinc-400">E-mail para Login</label>
                  <input
                    type="email"
                    placeholder="supervisor@qualidade156.com.br"
                    value={supervisorForm.email}
                    onChange={(e) => setSupervisorForm({ ...supervisorForm, email: e.target.value })}
                    className="w-full bg-white dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-zinc-950 dark:text-zinc-100"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-zinc-600 dark:text-zinc-400">
                    {editingSupervisor ? 'Alterar Senha (opcional, deixe em branco para manter)' : 'Senha Inicial de Acesso (mínimo 6 dígitos)'}
                  </label>
                  <input
                    type="password"
                    minLength={6}
                    placeholder={editingSupervisor ? 'Deixe em branco para não alterar' : '••••••••'}
                    value={supervisorForm.password}
                    onChange={(e) => setSupervisorForm({ ...supervisorForm, password: e.target.value })}
                    className="w-full bg-white dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-zinc-950 dark:text-zinc-100"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowSupervisorModal(false)}
                  disabled={loading}
                  className="px-4 py-2 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors shadow-sm flex items-center gap-1.5"
                >
                  {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  {editingSupervisor ? 'Salvar Alterações' : 'Cadastrar Supervisor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
