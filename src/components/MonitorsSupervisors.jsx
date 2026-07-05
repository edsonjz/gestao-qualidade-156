import React, { useMemo } from 'react';
import { 
  Award, 
  Target, 
  Clock, 
  CheckCircle, 
  Percent, 
  Users,
  Plus,
  Trash2,
  AlertCircle
} from 'lucide-react';

export default function MonitorsSupervisors({ 
  operators, 
  monitorings, 
  monitors, 
  supervisors,
  activeCycle,
  onAddMonitor,
  onDeleteMonitor,
  onAddSupervisor,
  onDeleteSupervisor
}) {
  
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

      return {
        ...m,
        realizedToday,
        pendingFeedbacks,
        completedFeedbacks,
        monthlyProductivity,
        dailyProductivityPct
      };
    });
  }, [monitors, monitorings]);

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

      // Operadores sem monitoramento no ciclo
      const opsSemMonitoria = activeOpsForSuper.filter(o => !opsMonitoredInActiveCycle.has(o.id)).length;
      
      // Operadores aguardando feedback
      const opsAguardandoFeedback = activeOpsForSuper.filter(o => o.status_feedback === 'Aguardando Feedback').length;

      return {
        ...s,
        operatorCount: activeOpsForSuper.length,
        realizedCount: superMonitorings.length,
        pendingFeedbacks,
        completedFeedbacks,
        coveragePct,
        avgScore,
        opsSemMonitoria,
        opsAguardandoFeedback
      };
    });
  }, [supervisors, operators, monitorings, activeCycle]);

  const handleAddMonitorClick = () => {
    const name = prompt('Digite o nome da Monitora:');
    if (!name) return;
    const target = prompt('Digite a meta diária (padrão 17):', '17');
    if (!target) return;
    onAddMonitor(name, parseInt(target, 10));
  };

  const handleAddSupervisorClick = () => {
    const name = prompt('Digite o nome do Supervisor:');
    if (!name) return;
    onAddSupervisor(name);
  };

  return (
    <div className="space-y-8">
      
      {/* SEÇÃO 1: MONITORAS DE QUALIDADE */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
            Controle de Produtividade das Monitoras
          </h3>
          <button 
            onClick={handleAddMonitorClick}
            className="flex items-center gap-1.5 bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold py-2 px-3 rounded-lg transition-colors shadow-sm no-print"
          >
            <Plus className="w-3.5 h-3.5" />
            Adicionar Monitora
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {monitorStats.map(m => (
            <div 
              key={m.id} 
              className="bg-white dark:bg-[#0c0c0f] rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-6 space-y-4"
            >
              {/* Header Monitora */}
              <div className="flex justify-between items-center border-b border-zinc-200 dark:border-zinc-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-md">
                    {m.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-bold text-zinc-900 dark:text-zinc-100">{m.name}</h4>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">Qualidade 156</p>
                  </div>
                </div>
                {monitors.length > 2 && (
                  <button 
                    onClick={() => onDeleteMonitor(m.id)}
                    className="text-zinc-400 hover:text-rose-500 p-1 rounded transition-colors no-print"
                    title="Excluir Monitora"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
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
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase font-semibold block mb-0.5">Produtividade Diária</span>
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
          <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
            Painel de Controle por Supervisor (Ciclo Atual)
          </h3>
          <button 
            onClick={handleAddSupervisorClick}
            className="flex items-center gap-1.5 bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold py-2 px-3 rounded-lg transition-colors shadow-sm no-print"
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
                    <td colSpan="8" className="text-center py-10 text-zinc-500 dark:text-zinc-400">
                      Nenhum supervisor cadastrado. Insira planilhas ou adicione manualmente.
                    </td>
                  </tr>
                ) : (
                  supervisorStats.map(s => (
                    <tr key={s.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/30 transition-colors">
                      <td className="px-6 py-3.5 font-bold">{s.name}</td>
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
                      <td className="px-6 py-3.5 text-right no-print">
                        <button
                          onClick={() => onDeleteSupervisor(s.id)}
                          disabled={s.operatorCount > 0}
                          className={`p-1 rounded transition-colors ${
                            s.operatorCount > 0 
                              ? 'text-zinc-300 dark:text-zinc-700 cursor-not-allowed' 
                              : 'text-zinc-400 hover:text-rose-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                          }`}
                          title={s.operatorCount > 0 ? "Não é possível excluir um supervisor com operadores ativos vinculados" : "Excluir Supervisor"}
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

    </div>
  );
}
