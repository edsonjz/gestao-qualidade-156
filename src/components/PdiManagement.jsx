import React, { useState, useMemo } from 'react';
import { 
  GraduationCap, 
  Search, 
  Target, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  BookOpen, 
  RefreshCw,
  Award
} from 'lucide-react';
import { analyzeOperatorData } from '../utils/pdiEngine';

export default function PdiManagement({ 
  operators = [], 
  monitorings = [], 
  audits = [], 
  pdis = [], 
  supervisors = [], 
  currentUser,
  onOpenPdi,
  onRefresh,
  isLoading = false 
}) {
  const [search, setSearch] = useState('');
  const [selectedSupervisor, setSelectedSupervisor] = useState('todos');
  const [selectedMaturity, setSelectedMaturity] = useState('todos');
  const [selectedPdiStatus, setSelectedPdiStatus] = useState('todos');

  // Mapeamento enriquecido de todos os operadores com seus diagnósticos pré-calculados
  const enrichedOperators = useMemo(() => {
    return operators
      .filter(o => o.active)
      .map(op => {
        const analysis = analyzeOperatorData(op, monitorings, audits);
        const existingPdi = pdis.find(p => 
          p.operator_id === op.id || 
          p.operatorId === op.id || 
          String(p.operator_id) === String(op.id)
        );

        return {
          ...op,
          analysis,
          pdi: existingPdi || null,
          hasActivePdi: existingPdi && (existingPdi.status === 'Em Andamento' || !existingPdi.status),
          isPdiCompleted: existingPdi && existingPdi.status === 'Concluído com Sucesso'
        };
      });
  }, [operators, monitorings, audits, pdis]);

  // Filtros aplicados
  const filteredOperators = useMemo(() => {
    return enrichedOperators.filter(op => {
      const s = search.toLowerCase();
      const matchesSearch = 
        op.name.toLowerCase().includes(s) ||
        (op.matricula && op.matricula.toLowerCase().includes(s)) ||
        (op.supervisor_name && op.supervisor_name.toLowerCase().includes(s));

      const matchesSupervisor = 
        selectedSupervisor === 'todos' || 
        op.supervisor_id === selectedSupervisor || 
        op.supervisor_name === selectedSupervisor;

      const matchesMaturity = 
        selectedMaturity === 'todos' || 
        op.analysis.maturityLevel.toLowerCase().includes(selectedMaturity.toLowerCase());

      const matchesPdiStatus = 
        selectedPdiStatus === 'todos' ||
        (selectedPdiStatus === 'com_pdi' && op.hasActivePdi) ||
        (selectedPdiStatus === 'sem_pdi' && !op.pdi) ||
        (selectedPdiStatus === 'concluido' && op.isPdiCompleted);

      return matchesSearch && matchesSupervisor && matchesMaturity && matchesPdiStatus;
    });
  }, [enrichedOperators, search, selectedSupervisor, selectedMaturity, selectedPdiStatus]);

  // Estatísticas Gerais dos PDIs
  const stats = useMemo(() => {
    const totalActiveOperators = enrichedOperators.length;
    const activePdisCount = enrichedOperators.filter(o => o.hasActivePdi).length;
    const criticalCount = enrichedOperators.filter(o => o.analysis.maturityLevel.includes('Crítico')).length;
    const completedPdisCount = enrichedOperators.filter(o => o.isPdiCompleted).length;
    
    // Contagem de treinamentos em andamento
    let totalTrainings = 0;
    let completedTrainings = 0;
    pdis.forEach(p => {
      if (Array.isArray(p.trainings)) {
        totalTrainings += p.trainings.length;
        completedTrainings += p.trainings.filter(t => t.status === 'Concluído').length;
      }
    });

    const trainingCompletionRate = totalTrainings > 0 
      ? Math.round((completedTrainings / totalTrainings) * 100) 
      : 0;

    return {
      totalActiveOperators,
      activePdisCount,
      criticalCount,
      completedPdisCount,
      totalTrainings,
      completedTrainings,
      trainingCompletionRate
    };
  }, [enrichedOperators, pdis]);

  const getMaturityBadge = (level) => {
    if (level?.includes('Crítico')) {
      return (
        <span className="bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          Crítico (Alta Prioridade)
        </span>
      );
    }
    if (level?.includes('Atenção')) {
      return (
        <span className="bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
          <Clock className="w-3 h-3" />
          Atenção (Em Desenvolvimento)
        </span>
      );
    }
    if (level?.includes('Alta Performance')) {
      return (
        <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
          <Award className="w-3 h-3" />
          Alta Performance (Destaque)
        </span>
      );
    }
    return (
      <span className="bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-900/50 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
        <CheckCircle2 className="w-3 h-3" />
        Consistente (Regular)
      </span>
    );
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header Card */}
      <div className="bg-white dark:bg-[#0c0c0f] p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 dark:bg-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold">
              <GraduationCap className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Diagnóstico & PDI (Programa de Desenvolvimento Individual)
            </h3>
            <span className="text-[10px] bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
              Monitorias + Auditorias
            </span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-2xl leading-relaxed">
            Cruzamento inteligente de dados quantitativos e qualitativos para mapeamento de competências, prescrição de treinamentos e planos de ação focados na evolução do operador.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onRefresh}
            className="p-2 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-lg transition-colors text-xs font-semibold flex items-center gap-1.5 shadow-sm cursor-pointer"
            title="Recarregar Dados"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>
      </div>

      {/* Cards de Métricas e Indicadores de PDI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: PDIs Ativos */}
        <div className="bg-white dark:bg-[#0c0c0f] p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">PDIs em Andamento</span>
            <div className="flex items-baseline gap-2">
              <h4 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{stats.activePdisCount}</h4>
              <span className="text-[11px] text-zinc-400 font-medium">de {stats.totalActiveOperators} operadores</span>
            </div>
          </div>
        </div>

        {/* Card 2: Operadores Críticos */}
        <div className="bg-white dark:bg-[#0c0c0f] p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Casos Críticos (Atenção Alta)</span>
            <div className="flex items-baseline gap-2">
              <h4 className="text-xl font-bold text-rose-600 dark:text-rose-400">{stats.criticalCount}</h4>
              <span className="text-[11px] text-zinc-400">exigem plano de ação</span>
            </div>
          </div>
        </div>

        {/* Card 3: Treinamentos */}
        <div className="bg-white dark:bg-[#0c0c0f] p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Capacitações Vinculadas</span>
            <div className="flex items-baseline gap-2">
              <h4 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{stats.completedTrainings}/{stats.totalTrainings}</h4>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">{stats.trainingCompletionRate}% concluídos</span>
            </div>
          </div>
        </div>

        {/* Card 4: PDIs Concluídos com Sucesso */}
        <div className="bg-white dark:bg-[#0c0c0f] p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">PDIs Superados / Concluídos</span>
            <div className="flex items-baseline gap-2">
              <h4 className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{stats.completedPdisCount}</h4>
              <span className="text-[11px] text-zinc-400 font-medium">evolução atestada</span>
            </div>
          </div>
        </div>

      </div>

      {/* Barra de Filtros e Pesquisa */}
      <div className="bg-white dark:bg-[#0c0c0f] p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Buscar por operador, matrícula ou supervisão..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-zinc-950 dark:text-zinc-100"
          />
        </div>

        <select
          value={selectedSupervisor}
          onChange={(e) => setSelectedSupervisor(e.target.value)}
          className="bg-white dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs shadow-sm text-zinc-800 dark:text-zinc-200 outline-none cursor-pointer"
        >
          <option value="todos">Todos os Supervisores</option>
          {supervisors.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>

        <select
          value={selectedMaturity}
          onChange={(e) => setSelectedMaturity(e.target.value)}
          className="bg-white dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs shadow-sm text-zinc-800 dark:text-zinc-200 outline-none cursor-pointer"
        >
          <option value="todos">Todos os Níveis de Maturidade</option>
          <option value="Crítico">Crítico (Prioridade Alta)</option>
          <option value="Atenção">Atenção (Em Desenvolvimento)</option>
          <option value="Consistente">Consistente (Regular)</option>
          <option value="Alta Performance">Alta Performance (Destaque)</option>
        </select>

        <select
          value={selectedPdiStatus}
          onChange={(e) => setSelectedPdiStatus(e.target.value)}
          className="bg-white dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs shadow-sm text-zinc-800 dark:text-zinc-200 outline-none cursor-pointer"
        >
          <option value="todos">Todos os Status de PDI</option>
          <option value="com_pdi">Com PDI em Andamento</option>
          <option value="sem_pdi">Sem PDI Cadastrado</option>
          <option value="concluido">PDI Concluído com Sucesso</option>
        </select>
      </div>

      {/* Tabela de Operadores com Diagnóstico */}
      <div className="bg-white dark:bg-[#0c0c0f] rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        {filteredOperators.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center text-blue-500 mx-auto mb-3">
              <GraduationCap className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
              Nenhum operador encontrado com os filtros selecionados
            </h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Tente redefinir a busca ou alterar os critérios de filtro.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {filteredOperators.map((op) => {
              const { analysis, pdi } = op;
              const hasPdi = Boolean(pdi);

              return (
                <div
                  key={op.id}
                  className="p-5 hover:bg-zinc-50 dark:hover:bg-zinc-900/30 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  {/* Informações do Operador & Diagnóstico */}
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold flex items-center justify-center text-xs shrink-0">
                        {op.name.charAt(0).toUpperCase()}
                      </div>
                      <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                        {op.name}
                      </h4>
                      {op.matricula && (
                        <span className="text-[11px] font-mono text-zinc-400">
                          ({op.matricula})
                        </span>
                      )}
                      {getMaturityBadge(analysis.maturityLevel)}
                      <span className="text-[11px] text-zinc-500">
                        • Sup: <strong>{op.supervisor_name || 'Não informado'}</strong>
                      </span>
                    </div>

                    {/* Resumo do Diagnóstico & Arquétipo */}
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-md text-[11px]">
                        {analysis.archetype}
                      </span>
                      <span className="text-zinc-500 dark:text-zinc-400 line-clamp-1">
                        {analysis.diagnosticSummary}
                      </span>
                    </div>

                    {/* Métricas Rápidas */}
                    <div className="flex items-center gap-4 text-[11px] text-zinc-400 pt-1">
                      <span>Média Monitorias: <strong className="text-zinc-700 dark:text-zinc-300">{analysis.avgScore > 0 ? `${analysis.avgScore} pts` : 'Sem notas'}</strong></span>
                      <span>•</span>
                      <span>Total Monitorias: <strong className="text-zinc-700 dark:text-zinc-300">{analysis.totalMonitorings}</strong></span>
                      <span>•</span>
                      <span>Auditorias Formativas: <strong className="text-zinc-700 dark:text-zinc-300">{analysis.totalAudits}</strong></span>
                      {analysis.ncgCount > 0 && (
                        <>
                          <span>•</span>
                          <span className="text-rose-500 font-bold">⚠️ {analysis.ncgCount} NCG(s)</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Status do PDI e Botão de Ação */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <span className="text-[10px] text-zinc-400 block mb-0.5">Status do PDI</span>
                      {hasPdi ? (
                        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                          pdi.status === 'Concluído com Sucesso'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300'
                        }`}>
                          {pdi.status}
                        </span>
                      ) : (
                        <span className="text-[11px] text-zinc-400 font-semibold bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
                          Sem PDI Aberto
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => onOpenPdi(op, pdi)}
                      className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2 px-3.5 rounded-lg transition-colors shadow-sm cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      {hasPdi ? 'Ver / Editar PDI' : 'Gerar PDI com IA'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
