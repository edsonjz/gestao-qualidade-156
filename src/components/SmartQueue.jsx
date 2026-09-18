import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Play, 
  Clock, 
  AlertCircle, 
  RefreshCw, 
  CheckCircle, 
  HelpCircle,
  Lock,
  Sparkles
} from 'lucide-react';
import { sortSmartQueue } from '../utils/distribution';

export default function SmartQueue({ 
  operators, 
  monitorings, 
  activeCycle, 
  onStartMonitoring, 
  onStartAudit,
  onOpenFeedback,
  onForceUnlock,
  currentMonitor,
  currentUser,
  isLoading 
}) {
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Calcular a fila inteligente
  const queue = useMemo(() => {
    if (operators.length === 0) return [];
    return sortSmartQueue(operators, monitorings, activeCycle?.id);
  }, [operators, monitorings, activeCycle]);

  // 2. Operadores aguardando feedback (Bloqueados)
  const blockedOperators = useMemo(() => {
    return operators.filter(o => o.active && o.status_feedback === 'Aguardando Feedback');
  }, [operators]);

  // 3. Resultados da busca (permite selecionar qualquer operador, mesmo os que não estão no topo)
  const searchResults = useMemo(() => {
    if (!searchQuery) return [];
    const query = searchQuery.toLowerCase();
    return operators.filter(o => 
      o.active && (
        o.name.toLowerCase().includes(query) ||
        (o.matricula && String(o.matricula).toLowerCase().includes(query)) ||
        (o.supervisor_name && o.supervisor_name.toLowerCase().includes(query)) ||
        o.skill.toLowerCase().includes(query)
      )
    );
  }, [searchQuery, operators]);

  // 4. Métricas do Ciclo
  const cycleStats = useMemo(() => {
    if (!activeCycle) return { total: 0, monitored: 0, remaining: 0, pct: 0 };
    const totalActive = operators.filter(o => o.active).length;
    
    const monitoredIds = new Set(
      monitorings.filter(m => m.cycle_id === activeCycle.id).map(m => m.operator_id)
    );
    const monitoredActive = operators.filter(o => o.active && monitoredIds.has(o.id)).length;
    const remaining = totalActive - monitoredActive;
    const pct = totalActive > 0 ? Math.round((monitoredActive / totalActive) * 100) : 0;

    return {
      total: totalActive,
      monitored: monitoredActive,
      remaining,
      pct
    };
  }, [operators, monitorings, activeCycle]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Coluna da Esquerda: Fila e Busca (w-2/3 equivalente no grid) */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* Barra de Busca Inteligente */}
        <div className="bg-white dark:bg-[#0c0c0f] p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-3">
          <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            Busca Inteligente de Operador (Override Manual)
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400 dark:text-zinc-500" />
            <input
              type="text"
              placeholder="Digite o nome, matrícula ou supervisor do operador..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#ffffff] dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-zinc-950 dark:text-zinc-100 transition-all"
            />
          </div>
        </div>

        {/* Lista da Fila ou Resultados da Busca */}
        <div className="bg-white dark:bg-[#0c0c0f] rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-900/10">
            <div>
              <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
                {searchQuery ? `Resultados da Busca (${searchResults.length})` : 'Fila de Distribuição Priorizada'}
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                {searchQuery 
                  ? 'Selecione qualquer colaborador retornado na pesquisa.' 
                  : 'Ordem calculada por equidade de supervisão, tempo sem avaliação e meta.'}
              </p>
            </div>
          </div>

          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {searchQuery ? (
              searchResults.length === 0 ? (
                <div className="p-8 text-center text-zinc-500 dark:text-zinc-400 text-sm">
                  Nenhum operador encontrado para "{searchQuery}".
                </div>
              ) : (
                searchResults.map((op, idx) => (
                  <OperatorRow 
                    key={op.id} 
                    op={op} 
                    idx={idx + 1} 
                    onStartMonitoring={onStartMonitoring}
                    onStartAudit={onStartAudit}
                    onForceUnlock={onForceUnlock}
                    currentMonitorId={currentMonitor?.id}
                    currentUser={currentUser}
                  />
                ))
              )
            ) : (
              queue.length === 0 ? (
                <div className="p-8 text-center text-zinc-500 dark:text-zinc-400 text-sm">
                  Não há operadores qualificados para monitoramento no momento (todos aguardam feedback ou estão inativos).
                </div>
              ) : (
                queue.slice(0, 15).map((op, idx) => (
                  <OperatorRow 
                    key={op.id} 
                    op={op} 
                    idx={idx + 1} 
                    onStartMonitoring={onStartMonitoring} 
                    onStartAudit={onStartAudit}
                    onForceUnlock={onForceUnlock}
                    currentMonitorId={currentMonitor?.id}
                    currentUser={currentUser}
                  />
                ))
              )
            )}
          </div>
        </div>
      </div>

      {/* Coluna da Direita: Status do Ciclo e Pendências (w-1/3) */}
      <div className="space-y-6">
        
        {/* Status do Ciclo Atual */}
        <div className="bg-white dark:bg-[#0c0c0f] p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
          <div className="border-b border-zinc-200 dark:border-zinc-800 pb-2 flex justify-between items-center">
            <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">Ciclo Atual</h4>
            <span className="text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-0.5 rounded-full">
              Ciclo {activeCycle?.cycle_number || 1}
            </span>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500 dark:text-zinc-400">Progresso do Ciclo</span>
              <span className="font-bold text-zinc-800 dark:text-zinc-200">{cycleStats.pct}%</span>
            </div>
            
            {/* Barra de Progresso */}
            <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-2.5 rounded-full overflow-hidden">
              <div 
                className="bg-blue-600 h-full rounded-full transition-all duration-500" 
                style={{ width: `${cycleStats.pct}%` }}
              ></div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs pt-2">
              <div className="bg-zinc-50 dark:bg-zinc-900/30 p-2.5 rounded border border-zinc-200 dark:border-zinc-800/40">
                <span className="text-zinc-500 dark:text-zinc-400 block mb-1">Monitorados</span>
                <span className="text-lg font-bold text-zinc-800 dark:text-zinc-200">{cycleStats.monitored}</span>
              </div>
              <div className="bg-zinc-50 dark:bg-zinc-900/30 p-2.5 rounded border border-zinc-200 dark:border-zinc-800/40">
                <span className="text-zinc-500 dark:text-zinc-400 block mb-1">Restantes</span>
                <span className="text-lg font-bold text-zinc-800 dark:text-zinc-200">{cycleStats.remaining}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Operadores Bloqueados (Aguardando Feedback) */}
        <div className="bg-white dark:bg-[#0c0c0f] p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
          <div className="border-b border-zinc-200 dark:border-zinc-800 pb-2 flex justify-between items-center">
            <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">Aguardando Feedback</h4>
            <span className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 text-xs px-2 py-0.5 rounded-full font-bold">
              {blockedOperators.length}
            </span>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {blockedOperators.length === 0 ? (
              <div className="text-center py-6 text-xs text-zinc-500 dark:text-zinc-400">
                Nenhum operador bloqueado aguardando feedback.
              </div>
            ) : (
              blockedOperators.map(op => (
                <div 
                  key={op.id} 
                  className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:border-amber-300 dark:hover:border-amber-900/60 transition-colors"
                >
                  <div className="space-y-0.5">
                    <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">{op.name}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">Sup: {op.supervisor_name}</p>
                  </div>
                  <button 
                    onClick={() => {
                      const pendingMon = monitorings.find(m => m.operator_id === op.id && m.status === 'Aguardando Feedback');
                      onOpenFeedback(op, pendingMon);
                    }}
                    className="flex items-center gap-1 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold py-1 px-2.5 rounded-md transition-colors shadow-sm cursor-pointer"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    Feedback
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

// Sub-componente de Linha da Fila com verificação de concorrência (Lock Mútuo)
function OperatorRow({ op, idx, onStartMonitoring, onStartAudit, onForceUnlock, currentMonitorId, currentUser }) {
  const isBlocked = op.status_feedback === 'Aguardando Feedback';

  // Verificação de Lock de Concorrência (< 30 minutos)
  const isLocked = Boolean(
    op.locked_at && 
    (new Date() - new Date(op.locked_at)) < 30 * 60 * 1000
  );

  const myEmail = currentUser?.email?.toLowerCase();
  const myName = (currentUser?.name || '').toLowerCase();
  const lockNameLower = (op.locked_by_monitor_name || '').toLowerCase();

  const isLockedByMe = isLocked && Boolean(
    (myEmail && lockNameLower.includes(myEmail)) ||
    (myName && myName.length > 2 && lockNameLower.includes(myName)) ||
    (currentMonitorId && op.locked_by_monitor_id === currentMonitorId)
  );

  const isLockedByOther = isLocked && !isLockedByMe;

  const displayLockName = op.locked_by_monitor_name 
    ? op.locked_by_monitor_name.replace(/\s*\[.*?\]/, '') 
    : 'outro usuário';

  return (
    <div className={`flex items-center justify-between p-4 hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors ${
      isBlocked ? 'opacity-60' : ''
    }`}>
      <div className="flex items-center gap-4">
        {/* Número da Fila */}
        <span className="text-sm font-bold text-zinc-400 dark:text-zinc-500 w-6 text-center">
          {idx}
        </span>
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{op.name}</h4>
            {op.matricula && (
              <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
                ({op.matricula})
              </span>
            )}
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
              op.allocation === 'Home Office' 
                ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' 
                : 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300'
            }`}>
              {op.allocation}
            </span>

            {/* Badge de Bloqueio Concorrente Mútuo */}
            {isLockedByOther && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-300 dark:border-amber-800 animate-pulse">
                <Lock className="w-3 h-3" />
                Em uso por {displayLockName}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            <span>Sup: <strong>{op.supervisor_name}</strong></span>
            <span>•</span>
            <span>Skill: <strong>{op.skill}</strong></span>
            <span>•</span>
            <span>Horário: <strong>{op.schedule}</strong></span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Status indicator */}
        <div className="text-right text-xs">
          {op.last_monitoring_at ? (
            <span className="text-zinc-400 dark:text-zinc-500">Última: {op.last_monitoring_at.split('T')[0]}</span>
          ) : (
            <span className="text-blue-500 font-medium">Nunca monitorado</span>
          )}
        </div>

        {isBlocked ? (
          <button 
            disabled 
            className="flex items-center gap-1 bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 text-xs font-bold py-1.5 px-3 rounded-lg cursor-not-allowed border border-transparent"
          >
            Bloqueado
          </button>
        ) : isLockedByOther ? (
          <div className="flex items-center gap-1.5">
            <button 
              disabled 
              title={`Operador em procedimento com: ${op.locked_by_monitor_name || 'outro usuário'}`}
              className="flex items-center gap-1 bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 text-xs font-bold py-1.5 px-3 rounded-lg cursor-not-allowed border border-amber-200 dark:border-amber-900"
            >
              <Lock className="w-3 h-3" />
              Em Uso
            </button>
            {onForceUnlock && (
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Deseja forçar a liberação da trava do colaborador ${op.name}?`)) {
                    onForceUnlock(op.id);
                  }
                }}
                title="Desbloquear se o usuário anterior abandonou a tela"
                className="text-[10px] text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 underline font-semibold cursor-pointer p-1"
              >
                Liberar
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <button 
              onClick={() => onStartMonitoring(op)}
              title="Realizar Nova Monitoria de Qualidade (com Nota)"
              className={`flex items-center gap-1.5 text-white text-xs font-bold py-1.5 px-3 rounded-lg transition-colors shadow-sm cursor-pointer ${
                isLockedByMe 
                  ? 'bg-amber-600 hover:bg-amber-700' 
                  : 'bg-[#059669] hover:bg-[#047857]'
              }`}
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              {isLockedByMe ? 'Continuar' : 'Avaliar'}
            </button>
            {onStartAudit && (
              <button 
                onClick={() => onStartAudit(op)}
                title="Realizar Auditoria Formativa (Sem Nota)"
                className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 text-xs font-bold py-1.5 px-2.5 rounded-lg transition-colors shadow-sm cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                Auditar
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
