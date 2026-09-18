import React, { useState, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { 
  X, 
  Sparkles, 
  Printer, 
  GraduationCap, 
  Target, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Plus, 
  Trash2, 
  Calendar, 
  User, 
  BookOpen
} from 'lucide-react';
import { generatePdiProposal } from '../utils/pdiEngine';

export default function PdiModal({ 
  operator, 
  pdi: initialPdi = null, 
  monitorings = [], 
  audits = [], 
  currentUser,
  onClose, 
  onSavePdi, 
  onDeletePdi,
  darkMode 
}) {
  // Inicializa o PDI existente ou gera uma proposta automática inicial
  const [pdiData, setPdiData] = useState(() => {
    if (initialPdi) return { ...initialPdi };
    return generatePdiProposal(operator, monitorings, audits);
  });

  const [activeTab, setActiveTab] = useState('diagnostico'); // 'diagnostico' | 'treinamentos' | 'metas' | 'acompanhamento'
  const [isSaving, setIsSaving] = useState(false);
  
  // Modais / Campos locais para inclusão de novos itens
  const [newTrainingTitle, setNewTrainingTitle] = useState('');
  const [newTrainingDuration, setNewTrainingDuration] = useState('4 horas');
  const [newTrainingPriority, setNewTrainingPriority] = useState('Média');
  const [showAddTraining, setShowAddTraining] = useState(false);

  const [newActionText, setNewActionText] = useState('');
  const [newActionMetric, setNewActionMetric] = useState('');
  const [newActionDeadline, setNewActionDeadline] = useState('');
  const [showAddAction, setShowAddAction] = useState(false);

  const [newFollowUpNote, setNewFollowUpNote] = useState('');

  // Recalcular diagnóstico com base nos dados mais recentes
  const handleRegenerateDiagnosis = () => {
    if (window.confirm('Deseja recalcular o diagnóstico com base em todas as monitorias e auditorias? Suas anotações personalizadas serão preservadas quando possível.')) {
      const fresh = generatePdiProposal(operator, monitorings, audits);
      setPdiData(prev => ({
        ...prev,
        maturityLevel: fresh.maturityLevel,
        maturityColor: fresh.maturityColor,
        archetype: fresh.archetype,
        diagnosticSummary: fresh.diagnosticSummary,
        competencies: fresh.competencies,
        trainings: prev.trainings?.length > 0 ? prev.trainings : fresh.trainings,
        actionPlan: prev.actionPlan?.length > 0 ? prev.actionPlan : fresh.actionPlan
      }));
    }
  };

  // 1. Gráfico Radar de Competências (ECharts)
  const radarOption = useMemo(() => {
    const comp = pdiData.competencies || {
      postura: 80,
      procedimentos: 80,
      comunicacao: 80,
      sistemas: 80,
      conformidade: 80
    };

    const textColor = darkMode ? '#e4e4e7' : '#27272a';
    const splitColor = darkMode ? '#27272a' : '#e4e4e7';

    return {
      tooltip: {
        trigger: 'item',
        backgroundColor: darkMode ? '#18181b' : '#ffffff',
        borderColor: darkMode ? '#27272a' : '#e4e4e7',
        textStyle: { color: textColor }
      },
      radar: {
        indicator: [
          { name: 'Postura & Empatia', max: 100 },
          { name: 'Procedimentos 156', max: 100 },
          { name: 'Comunicação & Clareza', max: 100 },
          { name: 'Agilidade em Sistemas', max: 100 },
          { name: 'Conformidade Operacional', max: 100 }
        ],
        shape: 'polygon',
        splitNumber: 4,
        axisName: {
          color: textColor,
          fontWeight: 'bold',
          fontSize: 10
        },
        splitLine: { lineStyle: { color: splitColor } },
        splitArea: { show: false },
        axisLine: { lineStyle: { color: splitColor } }
      },
      series: [
        {
          type: 'radar',
          data: [
            {
              value: [
                comp.postura,
                comp.procedimentos,
                comp.comunicacao,
                comp.sistemas,
                comp.conformidade
              ],
              name: 'Nível de Competência (0-100)',
              symbol: 'circle',
              symbolSize: 6,
              itemStyle: { color: '#2563eb' },
              areaStyle: { color: 'rgba(37, 99, 235, 0.25)' },
              lineStyle: { width: 2, color: '#2563eb' }
            }
          ]
        }
      ]
    };
  }, [pdiData.competencies, darkMode]);

  // Manipulação de Treinamentos
  const handleToggleTrainingStatus = (idx) => {
    const updated = [...(pdiData.trainings || [])];
    const current = updated[idx].status;
    updated[idx].status = current === 'Concluído' ? 'Pendente' : current === 'Pendente' ? 'Em Andamento' : 'Concluído';
    setPdiData({ ...pdiData, trainings: updated });
  };

  const handleAddTraining = (e) => {
    e.preventDefault();
    if (!newTrainingTitle.trim()) return;

    const newItem = {
      id: `trn-custom-${Date.now()}`,
      title: newTrainingTitle.trim(),
      category: 'Capacitação Complementar',
      duration: newTrainingDuration,
      priority: newTrainingPriority,
      status: 'Pendente',
      targetDate: new Date(Date.now() + 20 * 86400000).toISOString().split('T')[0]
    };

    setPdiData({
      ...pdiData,
      trainings: [...(pdiData.trainings || []), newItem]
    });
    setNewTrainingTitle('');
    setShowAddTraining(false);
  };

  const handleRemoveTraining = (idx) => {
    const updated = (pdiData.trainings || []).filter((_, i) => i !== idx);
    setPdiData({ ...pdiData, trainings: updated });
  };

  // Manipulação de Metas / Plano de Ação
  const handleToggleActionStatus = (idx) => {
    const updated = [...(pdiData.actionPlan || [])];
    const current = updated[idx].status;
    updated[idx].status = current === 'Atingida' ? 'Em Andamento' : current === 'Em Andamento' ? 'Atingida' : 'Em Andamento';
    setPdiData({ ...pdiData, actionPlan: updated });
  };

  const handleAddAction = (e) => {
    e.preventDefault();
    if (!newActionText.trim()) return;

    const newItem = {
      id: `act-custom-${Date.now()}`,
      action: newActionText.trim(),
      objective: 'Aprimoramento contínuo das rotinas operacionais',
      metric: newActionMetric.trim() || 'Cumprimento integral da ação acordada',
      responsible: `${operator.name} (Operador) / Supervisão`,
      deadline: newActionDeadline || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      status: 'Em Andamento'
    };

    setPdiData({
      ...pdiData,
      actionPlan: [...(pdiData.actionPlan || []), newItem]
    });
    setNewActionText('');
    setNewActionMetric('');
    setNewActionDeadline('');
    setShowAddAction(false);
  };

  const handleRemoveAction = (idx) => {
    const updated = (pdiData.actionPlan || []).filter((_, i) => i !== idx);
    setPdiData({ ...pdiData, actionPlan: updated });
  };

  // Adicionar Reunião de Acompanhamento 1-on-1
  const handleAddFollowUp = (e) => {
    e.preventDefault();
    if (!newFollowUpNote.trim()) return;

    const newEntry = {
      id: `fol-${Date.now()}`,
      date: new Date().toISOString(),
      author: currentUser?.name || 'Supervisor / Monitor',
      role: currentUser?.role || 'Liderança',
      notes: newFollowUpNote.trim()
    };

    setPdiData({
      ...pdiData,
      followUps: [newEntry, ...(pdiData.followUps || [])]
    });
    setNewFollowUpNote('');
  };

  // Salvar PDI
  const handleSubmit = async () => {
    setIsSaving(true);
    try {
      const payload = {
        ...pdiData,
        operator_id: operator.id,
        supervisor_id: operator.supervisor_id || null,
        updated_at: new Date().toISOString()
      };
      if (initialPdi?.id) {
        payload.id = initialPdi.id;
      }
      await onSavePdi(payload);
      onClose();
    } catch (err) {
      alert('Erro ao salvar PDI: ' + (err.message || ''));
    } finally {
      setIsSaving(false);
    }
  };

  const getMaturityBadge = (level) => {
    if (level?.includes('Crítico')) return 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border-rose-300';
    if (level?.includes('Atenção')) return 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-300';
    if (level?.includes('Alta Performance')) return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-300';
    return 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 border-blue-300';
  };

  return (
    <div 
      className="fixed inset-0 z-[65] flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm no-print"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="bg-white dark:bg-[#0c0c0f] w-full max-w-5xl rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-50/50 dark:bg-zinc-900/20">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  {pdiData.title || `PDI - ${operator.name}`}
                </h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getMaturityBadge(pdiData.maturityLevel)}`}>
                  {pdiData.maturityLevel || 'Consistente'}
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 flex items-center gap-2">
                <span>Operador: <strong>{operator.name}</strong> ({operator.matricula || 'Sem mat.'})</span>
                <span>•</span>
                <span>Supervisão: <strong>{operator.supervisor_name || 'Geral'}</strong></span>
                <span>•</span>
                <span>Turno: <strong>{operator.schedule || 'Padrão'}</strong></span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRegenerateDiagnosis}
              className="px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg transition-colors text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer"
              title="Recalcular diagnóstico automático com base nas monitorias e auditorias"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-500" />
              Recalcular com IA
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="p-2 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-lg transition-colors text-xs font-semibold shadow-xs cursor-pointer"
              title="Imprimir PDI do Operador"
            >
              <Printer className="w-4 h-4" />
            </button>

            <button 
              onClick={onClose} 
              className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Sub-Abas do PDI */}
        <div className="px-6 border-b border-zinc-200 dark:border-zinc-800 flex gap-6 bg-white dark:bg-[#0c0c0f]">
          <button
            onClick={() => setActiveTab('diagnostico')}
            className={`py-3 text-xs font-bold transition-colors flex items-center gap-2 border-b-2 cursor-pointer ${
              activeTab === 'diagnostico'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Diagnóstico & Competências
          </button>

          <button
            onClick={() => setActiveTab('treinamentos')}
            className={`py-3 text-xs font-bold transition-colors flex items-center gap-2 border-b-2 cursor-pointer ${
              activeTab === 'treinamentos'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            Trilhas de Treinamento ({pdiData.trainings?.length || 0})
          </button>

          <button
            onClick={() => setActiveTab('metas')}
            className={`py-3 text-xs font-bold transition-colors flex items-center gap-2 border-b-2 cursor-pointer ${
              activeTab === 'metas'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            Metas & Plano de Ação ({pdiData.actionPlan?.length || 0})
          </button>

          <button
            onClick={() => setActiveTab('acompanhamento')}
            className={`py-3 text-xs font-bold transition-colors flex items-center gap-2 border-b-2 cursor-pointer ${
              activeTab === 'acompanhamento'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Acompanhamento 1-on-1 ({pdiData.followUps?.length || 0})
          </button>
        </div>

        {/* Corpo do Modal (Rolável) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
          
          {/* ABA 1: DIAGNÓSTICO & COMPETÊNCIAS */}
          {activeTab === 'diagnostico' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              
              {/* Card de Arquétipo e Diagnóstico Resumido */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Lado Esquerdo: Diagnóstico e Arquétipo (7 colunas) */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="bg-blue-50/50 dark:bg-blue-950/20 p-4 rounded-xl border border-blue-200/80 dark:border-blue-900/40 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        Arquétipo Comportamental Identificado
                      </span>
                      <span className="text-[10px] text-zinc-400">Cruzamento Monitorias + Auditorias</span>
                    </div>
                    <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                      {pdiData.archetype || 'Perfil Operacional Padrão'}
                    </h4>
                    <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                      {pdiData.diagnosticSummary}
                    </p>
                  </div>

                  {/* Pontos Fortes e Oportunidades Lado a Lado */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-emerald-50/40 dark:bg-emerald-950/10 p-4 rounded-xl border border-emerald-200/80 dark:border-emerald-900/30 space-y-2">
                      <h5 className="font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5 text-xs">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Pontos Fortes a Sustentar
                      </h5>
                      <ul className="space-y-1.5 text-[11px] text-zinc-700 dark:text-zinc-300">
                        {pdiData.strengths?.map((str, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="text-emerald-500 font-bold">•</span>
                            <span>{str}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="bg-amber-50/40 dark:bg-amber-950/10 p-4 rounded-xl border border-amber-200/80 dark:border-amber-900/30 space-y-2">
                      <h5 className="font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5 text-xs">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        Gaps & Oportunidades Críticas
                      </h5>
                      <ul className="space-y-1.5 text-[11px] text-zinc-700 dark:text-zinc-300">
                        {pdiData.improvements?.map((imp, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="text-amber-500 font-bold">•</span>
                            <span>{imp}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Lado Direito: Radar de Competências (5 colunas) */}
                <div className="lg:col-span-5 bg-white dark:bg-[#0c0c0f] p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 flex flex-col justify-between">
                  <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2">
                    <h5 className="font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5 text-blue-500" />
                      Radar de 5 Competências Chave
                    </h5>
                  </div>
                  <div className="w-full h-56">
                    <ReactECharts option={radarOption} style={{ height: '100%', width: '100%' }} />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[10px] pt-2 border-t border-zinc-100 dark:border-zinc-800/60">
                    <div>Postura: <strong>{pdiData.competencies?.postura || 80} pts</strong></div>
                    <div>Procedimentos: <strong>{pdiData.competencies?.procedimentos || 80} pts</strong></div>
                    <div>Comunicação: <strong>{pdiData.competencies?.comunicacao || 80} pts</strong></div>
                    <div>Sistemas: <strong>{pdiData.competencies?.sistemas || 80} pts</strong></div>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* ABA 2: TRILHAS DE TREINAMENTO RECOMENDADAS */}
          {activeTab === 'treinamentos' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    Trilhas de Capacitação e Reciclagem
                  </h4>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Módulos sugeridos especificamente para sanar os gaps identificados no diagnóstico
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddTraining(!showAddTraining)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {showAddTraining ? 'Fechar' : 'Novo Treinamento'}
                </button>
              </div>

              {/* Formulário Rápido para Novo Treinamento Customizado */}
              {showAddTraining && (
                <form onSubmit={handleAddTraining} className="bg-zinc-50 dark:bg-zinc-900/40 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-3">
                  <h5 className="font-bold text-zinc-800 dark:text-zinc-200 text-xs">Adicionar Módulo de Treinamento</h5>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2 space-y-1">
                      <label className="font-semibold text-zinc-600 dark:text-zinc-400">Nome do Treinamento</label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Treinamento Especial em Iluminação Pública 156"
                        value={newTrainingTitle}
                        onChange={(e) => setNewTrainingTitle(e.target.value)}
                        className="w-full bg-white dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-semibold text-zinc-600 dark:text-zinc-400">Carga Horária</label>
                      <input
                        type="text"
                        placeholder="Ex: 4 horas"
                        value={newTrainingDuration}
                        onChange={(e) => setNewTrainingDuration(e.target.value)}
                        className="w-full bg-white dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 outline-none"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors text-xs cursor-pointer"
                    >
                      Incluir no PDI
                    </button>
                  </div>
                </form>
              )}

              {/* Lista de Treinamentos */}
              <div className="space-y-3">
                {(!pdiData.trainings || pdiData.trainings.length === 0) ? (
                  <div className="text-center py-8 bg-zinc-50 dark:bg-zinc-900/20 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 text-zinc-500">
                    Nenhum treinamento vinculado a este PDI. Clique em "+ Novo Treinamento" para adicionar.
                  </div>
                ) : (
                  pdiData.trainings.map((trn, idx) => {
                    const isDone = trn.status === 'Concluído';
                    const isInProgress = trn.status === 'Em Andamento';

                    return (
                      <div
                        key={trn.id || idx}
                        className={`p-4 rounded-xl border transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                          isDone 
                            ? 'bg-emerald-50/40 dark:bg-emerald-950/10 border-emerald-200 dark:border-emerald-900/30' 
                            : isInProgress
                            ? 'bg-blue-50/40 dark:bg-blue-950/10 border-blue-200 dark:border-blue-900/30'
                            : 'bg-white dark:bg-[#0c0c0f] border-zinc-200 dark:border-zinc-800'
                        }`}
                      >
                        <div className="space-y-1.5 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">
                              {trn.title}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                              {trn.category || 'Treinamento'}
                            </span>
                            <span className="text-[10px] text-zinc-500 font-medium">
                              {trn.duration}
                            </span>
                          </div>
                          {trn.description && (
                            <p className="text-xs text-zinc-600 dark:text-zinc-400">
                              {trn.description}
                            </p>
                          )}
                          <div className="flex items-center gap-3 text-[11px] text-zinc-400">
                            <span>Prioridade: <strong className={trn.priority === 'Urgente' ? 'text-rose-500' : 'text-zinc-700 dark:text-zinc-300'}>{trn.priority || 'Média'}</strong></span>
                            <span>•</span>
                            <span>Previsão: {trn.targetDate || 'A definir'}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleToggleTrainingStatus(idx)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
                              isDone
                                ? 'bg-emerald-600 text-white'
                                : isInProgress
                                ? 'bg-blue-600 text-white'
                                : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-700'
                            }`}
                          >
                            {isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                            {trn.status || 'Pendente'}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRemoveTraining(idx)}
                            className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                            title="Remover treinamento do plano"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* ABA 3: METAS E PLANO DE AÇÃO 5W2H */}
          {activeTab === 'metas' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    Plano de Ação e Metas SMART (5W2H)
                  </h4>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Ações práticas com métricas claras de sucesso pactuadas com o operador
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddAction(!showAddAction)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {showAddAction ? 'Fechar' : 'Nova Ação'}
                </button>
              </div>

              {/* Formulário de Nova Ação */}
              {showAddAction && (
                <form onSubmit={handleAddAction} className="bg-zinc-50 dark:bg-zinc-900/40 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-3">
                  <h5 className="font-bold text-zinc-800 dark:text-zinc-200 text-xs">Pactuar Nova Meta Operacional</h5>
                  <div className="space-y-1">
                    <label className="font-semibold text-zinc-600 dark:text-zinc-400">Ação a ser praticada</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Praticar confirmação do endereço com o munícipe antes de registrar o protocolo"
                      value={newActionText}
                      onChange={(e) => setNewActionText(e.target.value)}
                      className="w-full bg-white dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-semibold text-zinc-600 dark:text-zinc-400">Meta / Como medir</label>
                      <input
                        type="text"
                        placeholder="Ex: Atingir nota ≥ 90 nas próximas 2 monitorias"
                        value={newActionMetric}
                        onChange={(e) => setNewActionMetric(e.target.value)}
                        className="w-full bg-white dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-semibold text-zinc-600 dark:text-zinc-400">Prazo de Conclusão</label>
                      <input
                        type="date"
                        value={newActionDeadline}
                        onChange={(e) => setNewActionDeadline(e.target.value)}
                        className="w-full bg-white dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 outline-none"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors text-xs cursor-pointer"
                    >
                      Pactuar Ação
                    </button>
                  </div>
                </form>
              )}

              {/* Tabela de Ações */}
              <div className="space-y-3">
                {(!pdiData.actionPlan || pdiData.actionPlan.length === 0) ? (
                  <div className="text-center py-8 bg-zinc-50 dark:bg-zinc-900/20 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 text-zinc-500">
                    Nenhuma ação pactuada. Clique em "+ Nova Ação" para adicionar.
                  </div>
                ) : (
                  pdiData.actionPlan.map((act, idx) => {
                    const isDone = act.status === 'Atingida';

                    return (
                      <div
                        key={act.id || idx}
                        className={`p-4 rounded-xl border transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                          isDone 
                            ? 'bg-emerald-50/40 dark:bg-emerald-950/10 border-emerald-200 dark:border-emerald-900/30' 
                            : 'bg-white dark:bg-[#0c0c0f] border-zinc-200 dark:border-zinc-800'
                        }`}
                      >
                        <div className="space-y-1.5 flex-1">
                          <h5 className="font-bold text-zinc-900 dark:text-zinc-100 text-xs">
                            {act.action}
                          </h5>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-zinc-600 dark:text-zinc-400">
                            <div>Meta: <strong>{act.metric}</strong></div>
                            <div>Responsável: <strong>{act.responsible}</strong></div>
                          </div>
                          <div className="text-[10px] text-zinc-400">
                            Prazo estabelecido: <strong>{act.deadline || 'Em acompanhamento'}</strong>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleToggleActionStatus(idx)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
                              isDone
                                ? 'bg-emerald-600 text-white'
                                : 'bg-amber-500 hover:bg-amber-600 text-white'
                            }`}
                          >
                            {isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                            {act.status || 'Em Andamento'}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRemoveAction(idx)}
                            className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                            title="Remover meta do PDI"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* ABA 4: ACOMPANHAMENTO 1-ON-1 */}
          {activeTab === 'acompanhamento' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div>
                <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  Registro de Reuniões de Alinhamento 1-on-1
                </h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Histórico de encontros periódicos entre a supervisão/monitoria e o operador para checar a evolução
                </p>
              </div>

              {/* Adicionar Novo Registro de Feedback */}
              <form onSubmit={handleAddFollowUp} className="bg-zinc-50 dark:bg-zinc-900/40 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-3">
                <label className="font-bold text-zinc-700 dark:text-zinc-300 text-xs">
                  Novo Alinhamento com o Operador
                </label>
                <textarea
                  rows="2"
                  required
                  placeholder="Descreva os combinados da reunião, evolução observada nos atendimentos e eventuais ajustes de rota..."
                  value={newFollowUpNote}
                  onChange={(e) => setNewFollowUpNote(e.target.value)}
                  className="w-full bg-white dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-lg p-2.5 text-xs text-zinc-900 dark:text-zinc-100 outline-none"
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Registrar Encontro
                  </button>
                </div>
              </form>

              {/* Timeline de Registros */}
              <div className="divide-y divide-zinc-200 dark:divide-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-[#0c0c0f]">
                {(!pdiData.followUps || pdiData.followUps.length === 0) ? (
                  <div className="p-6 text-center text-zinc-500">
                    Nenhum acompanhamento registrado ainda.
                  </div>
                ) : (
                  pdiData.followUps.map((fol, i) => (
                    <div key={fol.id || i} className="p-4 space-y-1.5 hover:bg-zinc-50 dark:hover:bg-zinc-900/30 transition-colors">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-zinc-800 dark:text-zinc-200 text-xs flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-blue-500" />
                          {fol.author} ({fol.role})
                        </span>
                        <span className="text-[10px] text-zinc-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(fol.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed pl-5">
                        {fol.notes}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

        </div>

        {/* Footer com Status do PDI e Botão Salvar */}
        <div className="px-6 py-3.5 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/20 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-zinc-500">Status Geral do PDI:</span>
            <select
              value={pdiData.status || 'Em Andamento'}
              onChange={(e) => setPdiData({ ...pdiData, status: e.target.value })}
              className="bg-white dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1 text-xs font-bold text-zinc-800 dark:text-zinc-200 outline-none cursor-pointer"
            >
              <option value="Em Andamento">Em Andamento</option>
              <option value="Concluído com Sucesso">Concluído com Sucesso</option>
              <option value="Prorrogado">Prorrogado</option>
              <option value="Cancelado">Cancelado</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            {initialPdi?.id && onDeletePdi && (
              <button
                type="button"
                onClick={async () => {
                  if (confirm('Deseja realmente excluir este PDI?')) {
                    await onDeletePdi(initialPdi.id);
                    onClose();
                  }
                }}
                className="px-3 py-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg font-semibold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                title="Excluir PDI"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Excluir
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold rounded-lg transition-colors text-xs cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSaving}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors shadow-sm text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSaving ? 'Salvando PDI...' : 'Salvar PDI'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
