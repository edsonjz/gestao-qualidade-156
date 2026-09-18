import React, { useState, useEffect, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { 
  X, 
  Calendar, 
  User, 
  TrendingUp, 
  AlertTriangle, 
  FileText, 
  CheckCircle, 
  Info, 
  Edit, 
  Trash2, 
  Award, 
  Eye,
  Clock,
  Briefcase,
  Layers,
  Sparkles,
  Printer
} from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function OperatorProfileModal({ 
  operator, 
  onClose, 
  darkMode,
  onEditMonitoring,
  onDeleteMonitoring
}) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonitoringForDetails, setSelectedMonitoringForDetails] = useState(null);

  useEffect(() => {
    async function fetchHistory() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('q_monitorings')
          .select('id, operator_id, score, monitoring_date, status, feedback_notes, is_ncg, checklist, monitor_id, cycle_id, q_monitors(name)')
          .eq('operator_id', operator.id)
          .order('monitoring_date', { ascending: true });

        if (error) throw error;
        setHistory(data || []);
      } catch (err) {
        console.error('Erro ao buscar histórico do operador:', err);
      } finally {
        setLoading(false);
      }
    }

    if (operator) {
      fetchHistory();
    }
  }, [operator]);

  const handleDeleteClick = async (monitoringId) => {
    if (!confirm('Deseja realmente excluir esta monitoria? Esta ação é irreversível.')) return;
    try {
      await onDeleteMonitoring(monitoringId);
      setHistory(prev => prev.filter(h => h.id !== monitoringId));
    } catch (err) {
      console.error(err);
    }
  };

  // 1. Estatísticas individuais do operador
  const stats = useMemo(() => {
    const totalCount = history.length;
    const scores = history.map(h => h.score);
    const avgScore = totalCount > 0 
      ? Math.round(scores.reduce((sum, val) => sum + val, 0) / totalCount * 10) / 10 
      : 0;

    let daysWithoutMonitoring = '-';
    if (operator.last_monitoring_at) {
      const diffTime = Math.abs(new Date() - new Date(operator.last_monitoring_at));
      daysWithoutMonitoring = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    let aiInsight = {
      level: 'excellent',
      title: 'Desempenho Excelente',
      message: 'O operador mantém uma média de qualidade exemplar (≥ 90%). Recomenda-se reconhecimento e incentivo contínuo.'
    };

    if (avgScore === 0) {
      aiInsight = {
        level: 'neutral',
        title: 'Sem Histórico',
        message: 'Ainda não há monitorias finalizadas neste ciclo para gerar diagnósticos analíticos.'
      };
    } else if (avgScore < 90) {
      const itemScores = {};
      let ncgCount = 0;

      history.forEach(h => {
        if (h.is_ncg) ncgCount++;
        if (h.checklist) {
          h.checklist.forEach(item => {
            if (!itemScores[item.label]) {
              itemScores[item.label] = { total: 0, conforme: 0 };
            }
            itemScores[item.label].total++;
            if (item.value === 'Sim') {
              itemScores[item.label].conforme++;
            }
          });
        }
      });

      let worstItem = '';
      let worstPct = 100;
      Object.keys(itemScores).forEach(key => {
        const item = itemScores[key];
        const pct = Math.round((item.conforme / item.total) * 100);
        if (pct < worstPct) {
          worstPct = pct;
          worstItem = key;
        }
      });

      let alertMsg = `A média geral está em ${avgScore}% (abaixo de 90%). `;
      if (ncgCount > 0) {
        alertMsg += `Detectamos ${ncgCount} Não Conformidade Grave (NCG). Recomenda-se feedback técnico prioritário. `;
      }
      if (worstItem && worstPct < 85) {
        alertMsg += `O principal ponto de atenção é "${worstItem}" com ${worstPct}% de conformidade.`;
      } else {
        alertMsg += `Reforçar escutas orientadas e alinhamento de procedimentos operacionais.`;
      }

      aiInsight = {
        level: 'warning',
        title: 'Atenção ao Desempenho',
        message: alertMsg
      };
    }

    return {
      totalCount,
      avgScore,
      daysWithoutMonitoring,
      aiInsight
    };
  }, [history, operator]);

  // 2. Opções do Gráfico de Evolução (ECharts Line Chart Compacto e Fluido)
  const chartEvolutionOption = useMemo(() => {
    const dates = history.map(h => {
      if (!h.monitoring_date) return '';
      const parts = h.monitoring_date.split('T')[0].split('-');
      return `${parts[2]}/${parts[1]}`; // DD/MM
    });
    const scores = history.map(h => h.score);

    const textColor = darkMode ? '#e4e4e7' : '#09090b';
    const labelColor = darkMode ? '#a1a1aa' : '#71717a';
    const borderColor = darkMode ? '#1e1e24' : '#e4e4e7';
    const bgTooltip = darkMode ? '#0c0c0f' : '#ffffff';

    return {
      color: "#2563eb",
      tooltip: {
        trigger: 'axis',
        formatter: 'Data: {b}<br />Nota: <b>{c}%</b>',
        backgroundColor: bgTooltip,
        borderColor: borderColor,
        textStyle: { color: textColor, fontSize: 12 }
      },
      xAxis: {
        type: 'category',
        data: dates,
        axisLine: { lineStyle: { color: borderColor } },
        axisLabel: { color: labelColor, fontSize: 11 }
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: 100,
        axisLabel: { color: labelColor, formatter: '{value}%', fontSize: 11 },
        splitLine: { lineStyle: { color: borderColor, type: 'dashed' } }
      },
      series: [{
        data: scores,
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 8,
        lineStyle: { width: 3, color: '#2563eb' },
        itemStyle: { color: '#2563eb', borderWidth: 2, borderColor: '#ffffff' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(37, 99, 235, 0.25)' },
              { offset: 1, color: 'rgba(37, 99, 235, 0.01)' }
            ]
          }
        }
      }],
      grid: { left: '48px', right: '24px', bottom: '28px', top: '16px' }
    };
  }, [history, darkMode]);

  // Cores de notas
  const getScoreStyleClass = (val) => {
    if (val === 0) return 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-900/40';
    if (val >= 90) return 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40';
    if (val >= 80) return 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40';
    return 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40';
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-zinc-950/70 backdrop-blur-md overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="bg-white dark:bg-[#0c0c0f] w-full max-w-5xl xl:max-w-6xl rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden max-h-[94vh] flex flex-col my-auto transition-all animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header Modal com Título e Ações */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/70 dark:bg-zinc-900/30 no-print">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Ficha Individual do Operador
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300">
                Histórico Geral
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Histórico de qualidade completo, volumetria e diagnósticos analíticos
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => window.print()} 
              className="px-3 py-1.5 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-zinc-500" />
              Imprimir Ficha
            </button>
            <button 
              onClick={onClose} 
              className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex-1 p-16 text-center text-zinc-500 dark:text-zinc-400">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <span className="text-xs font-semibold">Carregando dados consolidados da ficha...</span>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* SEÇÃO 1: PAINEL SUPERIOR COM SIMETRIA PERFEITA (PERFIL + KPIS + IA) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
              
              {/* Card 1: Perfil do Operador (5 Colunas) */}
              <div className="lg:col-span-5 bg-zinc-50/60 dark:bg-zinc-900/20 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-3.5 pb-4 border-b border-zinc-200 dark:border-zinc-800/80">
                    <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-base shadow-sm shrink-0">
                      {operator.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100 truncate">
                          {operator.name}
                        </h4>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-mono font-bold text-zinc-500 dark:text-zinc-400">
                          Matrícula: {operator.matricula || 'S/M'}
                        </span>
                        <span className="text-zinc-300 dark:text-zinc-700">•</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          operator.status_feedback === 'Aguardando Feedback' 
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50' 
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50'
                        }`}>
                          {operator.status_feedback}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Grid de Atributos do Operador */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3 pt-4 text-xs">
                    <div>
                      <span className="text-[11px] text-zinc-400 uppercase font-semibold block">Supervisor(a)</span>
                      <span className="font-bold text-zinc-800 dark:text-zinc-200 truncate block mt-0.5">
                        {operator.supervisor_name || 'Geral'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[11px] text-zinc-400 uppercase font-semibold block">Horário</span>
                      <span className="font-bold text-zinc-800 dark:text-zinc-200 block mt-0.5">
                        {operator.schedule}
                      </span>
                    </div>

                    <div>
                      <span className="text-[11px] text-zinc-400 uppercase font-semibold block">Skill</span>
                      <span className="font-bold text-zinc-800 dark:text-zinc-200 block mt-0.5">
                        {operator.skill}
                      </span>
                    </div>

                    <div>
                      <span className="text-[11px] text-zinc-400 uppercase font-semibold block">Escala</span>
                      <span className="font-bold text-zinc-800 dark:text-zinc-200 block mt-0.5">
                        {operator.escala}
                      </span>
                    </div>

                    <div>
                      <span className="text-[11px] text-zinc-400 uppercase font-semibold block">Alocação</span>
                      <span className="font-bold text-zinc-800 dark:text-zinc-200 block mt-0.5">
                        {operator.allocation}
                      </span>
                    </div>

                    <div>
                      <span className="text-[11px] text-zinc-400 uppercase font-semibold block">Monitora Vinculada</span>
                      <span className="font-bold text-blue-600 dark:text-blue-400 truncate block mt-0.5">
                        {operator.assigned_monitor_name || 'Qualquer Monitora'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: KPIs + IA Insight (7 Colunas) */}
              <div className="lg:col-span-7 flex flex-col justify-between gap-4">
                
                {/* Linha de 3 Métricas Rápidas Perfeitamente Simétricas */}
                <div className="grid grid-cols-3 gap-3.5">
                  <div className="bg-white dark:bg-[#0c0c0f] p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm text-center flex flex-col justify-center">
                    <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">
                      Dias Sem Monitoria
                    </span>
                    <p className="text-3xl font-black mt-1.5 text-zinc-900 dark:text-zinc-50">
                      {stats.daysWithoutMonitoring}
                    </p>
                  </div>

                  <div className="bg-white dark:bg-[#0c0c0f] p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm text-center flex flex-col justify-center">
                    <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">
                      Monitorias Feitas
                    </span>
                    <p className="text-3xl font-black mt-1.5 text-zinc-900 dark:text-zinc-50">
                      {stats.totalCount}
                    </p>
                  </div>

                  <div className="bg-white dark:bg-[#0c0c0f] p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm text-center flex flex-col justify-center">
                    <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">
                      Média Geral
                    </span>
                    <p className="text-3xl font-black mt-1.5 text-zinc-900 dark:text-zinc-50">
                      {stats.avgScore > 0 ? `${stats.avgScore}%` : '-'}
                    </p>
                  </div>
                </div>

                {/* Box de IA Insight Alinhado */}
                <div className={`p-4 rounded-2xl border flex items-start gap-3.5 text-xs leading-relaxed flex-1 ${
                  stats.aiInsight.level === 'warning'
                    ? 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40 text-rose-900 dark:text-rose-300'
                    : stats.aiInsight.level === 'neutral'
                      ? 'bg-zinc-50 dark:bg-zinc-900/30 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300'
                      : 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40 text-emerald-900 dark:text-emerald-300'
                }`}>
                  <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                    stats.aiInsight.level === 'warning' ? 'bg-rose-100 dark:bg-rose-900/50 text-rose-600' :
                    stats.aiInsight.level === 'neutral' ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500' :
                    'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600'
                  }`}>
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="font-extrabold uppercase tracking-wider text-[11px] mb-1">
                      IA Insight: {stats.aiInsight.title}
                    </h5>
                    <p className="font-medium text-zinc-700 dark:text-zinc-300">{stats.aiInsight.message}</p>
                  </div>
                </div>

              </div>

            </div>

            {/* SEÇÃO 2: GRÁFICO DE EVOLUÇÃO (COMPACTO E INTEGRADO) */}
            {history.length > 0 && (
              <div className="bg-white dark:bg-[#0c0c0f] p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-blue-600" />
                    Evolução do Desempenho
                  </h4>
                  <span className="text-[11px] text-zinc-400 font-medium">Histórico cronológico de notas</span>
                </div>
                <ReactECharts option={chartEvolutionOption} style={{ height: '190px' }} />
              </div>
            )}

            {/* SEÇÃO 3: HISTÓRICO DE MONITORIAS COM LARGURA COMPLETA E SEM BARRA DE ROLAGEM */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-blue-600" />
                  Histórico de Monitorias ({history.length} avaliações)
                </h4>
              </div>

              <div className="bg-white dark:bg-[#0c0c0f] rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-zinc-50/80 dark:bg-zinc-900/40 text-zinc-400 uppercase font-semibold tracking-wider border-b border-zinc-200 dark:border-zinc-800">
                      <th className="py-3 px-4 w-28 whitespace-nowrap">Data</th>
                      <th className="py-3 px-4 w-36 whitespace-nowrap">Monitor(a)</th>
                      <th className="py-3 px-4 w-24 text-center whitespace-nowrap">Nota</th>
                      <th className="py-3 px-4 w-40 text-center whitespace-nowrap">Status</th>
                      <th className="py-3 px-4">Observações / Feedback</th>
                      <th className="py-3 px-4 w-28 text-center whitespace-nowrap no-print">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                    {history.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="text-center py-8 text-zinc-400 italic">
                          Nenhuma avaliação realizada para este operador até o momento.
                        </td>
                      </tr>
                    ) : (
                      history.slice().reverse().map(h => (
                        <tr key={h.id} className="hover:bg-zinc-50/70 dark:hover:bg-zinc-900/30 transition-colors">
                          <td className="py-3 px-4 font-semibold text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
                            {new Date(h.monitoring_date).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="py-3 px-4 font-bold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                            {h.q_monitors?.name || 'Monitoria'}
                          </td>
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <span className={`inline-block px-2.5 py-0.5 rounded-lg font-black text-xs border ${getScoreStyleClass(h.score)}`}>
                              {h.score}%
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                              h.status === 'Aguardando Feedback' 
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400' 
                                : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400'
                            }`}>
                              {h.status || 'Aguardando Feedback'}
                            </span>
                          </td>
                          <td 
                            onClick={() => setSelectedMonitoringForDetails(h)}
                            className="py-3 px-4 text-zinc-600 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer font-medium"
                            title="Clique para visualizar o parecer completo"
                          >
                            <p className="line-clamp-1">
                              {h.feedback_notes || <span className="text-zinc-400 italic">Clique para ver detalhes</span>}
                            </p>
                          </td>
                          <td className="py-3 px-4 text-center whitespace-nowrap no-print">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => setSelectedMonitoringForDetails(h)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-lg font-bold transition-all cursor-pointer text-[10px]"
                                title="Visualizar Folha Completa"
                              >
                                <Eye className="w-3 h-3" />
                                Ver
                              </button>
                              {onEditMonitoring && (
                                <button
                                  onClick={() => onEditMonitoring(h)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded-lg font-bold transition-colors cursor-pointer text-[10px]"
                                  title="Editar Monitoria"
                                >
                                  <Edit className="w-3 h-3" />
                                </button>
                              )}
                              {onDeleteMonitoring && (
                                <button
                                  onClick={() => handleDeleteClick(h.id)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/30 hover:bg-rose-100 dark:hover:bg-rose-900/20 rounded-lg font-bold transition-colors cursor-pointer text-[10px]"
                                  title="Excluir Monitoria"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}
      </div>

      {/* Modal: Detalhes Completos da Monitoria Selecionada */}
      {selectedMonitoringForDetails && (
        <MonitoringDetailsModal 
          monitoring={selectedMonitoringForDetails} 
          operators={[operator]} 
          onClose={() => setSelectedMonitoringForDetails(null)} 
          darkMode={darkMode}
        />
      )}
    </div>
  );
}

// Sub-Componente: Modal de Detalhes da Monitoria com Parecer
function MonitoringDetailsModal({ monitoring, operators = [], onClose, darkMode }) {
  const op = operators.find(o => o.id === monitoring.operator_id) || {};
  const checklist = monitoring.checklist || [];

  const getScoreStyleClass = (val) => {
    if (val === 0) return 'text-purple-600 bg-purple-50 border border-purple-200';
    if (val >= 90) return 'text-emerald-600 bg-emerald-50 border border-emerald-200';
    if (val >= 80) return 'text-amber-600 bg-amber-50 border border-amber-200';
    return 'text-rose-600 bg-rose-50 border border-rose-200';
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-zinc-950/70 backdrop-blur-md no-print">
      <div className="bg-white dark:bg-[#0c0c0f] w-full max-w-2xl rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        
        {/* Header Modal */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-900/10">
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Folha de Avaliação Individual</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Detalhamento completo dos critérios e parecer formativo</p>
          </div>
          <button 
            onClick={onClose} 
            className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-600 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-zinc-800 dark:text-zinc-200">
          
          {/* Bloco de Informações Gerais */}
          <div className="grid grid-cols-2 gap-4 bg-zinc-50 dark:bg-zinc-900/40 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800/60">
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
                <User className="w-3.5 h-3.5 text-zinc-400" />
                <span className="font-medium">Operador:</span>
                <strong className="text-zinc-850 dark:text-zinc-100">{op.name || 'N/A'}</strong>
              </div>
              <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
                <Award className="w-3.5 h-3.5 text-zinc-400" />
                <span className="font-medium">Supervisor:</span>
                <strong className="text-zinc-850 dark:text-zinc-100">{op.supervisor_name || 'N/A'}</strong>
              </div>
              <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
                <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                <span className="font-medium">Data:</span>
                <strong className="text-zinc-850 dark:text-zinc-100">
                  {new Date(monitoring.monitoring_date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </strong>
              </div>
            </div>
            <div className="flex flex-col items-center justify-center border-l border-zinc-200 dark:border-zinc-800">
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase font-bold tracking-wider">Nota Final</span>
              <div className={`mt-1.5 px-4 py-1.5 rounded-lg font-black text-2xl border ${getScoreStyleClass(monitoring.score)}`}>
                {monitoring.score}%
              </div>
              {monitoring.is_ncg && (
                <span className="mt-1.5 text-[9px] bg-rose-100 text-rose-800 px-2 py-0.5 rounded font-bold uppercase tracking-wide">
                  NCG Ativada
                </span>
              )}
            </div>
          </div>

          {/* Observações / Feedback (Leitura Ampla e Dinâmica) */}
          <div className="space-y-2 bg-[#fefcf8] dark:bg-zinc-900/10 p-5 rounded-xl border border-amber-100 dark:border-zinc-800/40">
            <h4 className="text-xs font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-amber-600 dark:text-amber-500" />
              Observações / Justificativas & Parecer
            </h4>
            <div className="text-zinc-850 dark:text-zinc-100 text-sm leading-relaxed whitespace-pre-wrap font-medium">
              {monitoring.feedback_notes || <span className="text-zinc-400 italic">Nenhuma observação ou feedback registrado para esta monitoria.</span>}
            </div>
          </div>

          {/* Critérios do Checklist Avaliados */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Resumo do Checklist</h4>
            <div className="space-y-1.5 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
              {checklist.map((item, idx) => (
                <div 
                  key={idx} 
                  className={`flex justify-between items-center p-3 text-xs border-b border-zinc-100 dark:border-zinc-900 last:border-none ${
                    item.value === 'Não' ? 'bg-rose-50/20 dark:bg-rose-950/5' : 'bg-white dark:bg-zinc-950/20'
                  }`}
                >
                  <div className="font-semibold text-zinc-700 dark:text-zinc-300 max-w-[75%]">
                    {item.label} <span className="text-[10px] text-zinc-400 font-normal">({item.weight} pts)</span>
                  </div>
                  <div>
                    <span className={`inline-block px-2 py-0.5 rounded font-extrabold uppercase text-[10px] ${
                      item.value === 'Sim'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400'
                        : item.value === 'Não'
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/30 dark:text-rose-400'
                          : 'bg-zinc-100 text-zinc-650 dark:bg-zinc-800 dark:text-zinc-400'
                    }`}>
                      {item.value}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
