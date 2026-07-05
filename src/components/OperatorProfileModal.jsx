import React, { useState, useEffect, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { X, Calendar, User, TrendingUp, AlertTriangle, FileText, CheckCircle, Info } from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function OperatorProfileModal({ operator, onClose, darkMode }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('q_monitorings')
          .select('*, q_monitors(name)')
          .eq('operator_id', operator.id)
          .order('monitoring_date', { ascending: true }); // do mais antigo ao mais recente para gráfico

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

  // 1. Estatísticas individuais do operador
  const stats = useMemo(() => {
    const totalCount = history.length;
    const scores = history.map(h => h.score);
    const avgScore = totalCount > 0 
      ? Math.round(scores.reduce((sum, val) => sum + val, 0) / totalCount * 10) / 10 
      : 0;

    // Calcular dias sem monitoração
    let daysWithoutMonitoring = '-';
    if (operator.last_monitoring_at) {
      const diffTime = Math.abs(new Date() - new Date(operator.last_monitoring_at));
      daysWithoutMonitoring = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    // Gerar insights de qualidade com IA Local baseados em dados reais
    let aiInsight = {
      level: 'excellent',
      title: 'Desempenho Excelente',
      message: 'O operador mantém uma média excelente e atinge a meta ideal de qualidade (≥ 90). Recomenda-se reconhecimento e incentivo contínuo.'
    };

    if (avgScore === 0) {
      aiInsight = {
        level: 'neutral',
        title: 'Sem Histórico',
        message: 'Ainda não há monitorias finalizadas neste ciclo para gerar insights analíticos de desenvolvimento.'
      };
    } else if (avgScore < 90) {
      // Analisar o pior item do checklist
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

      // Achar pior item
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

      let alertMsg = `A média geral está em ${avgScore} (abaixo de 90). `;
      if (ncgCount > 0) {
        alertMsg += `Detectamos ${ncgCount} Não Conformidade Grave (Nota Zero) no ciclo. Recomenda-se feedback técnico de processos imediato. `;
      }
      if (worstItem && worstPct < 85) {
        alertMsg += `O principal gargalo é o item "${worstItem}" com apenas ${worstPct}% de conformidade. Focar em treinamento sobre este tópico específico.`;
      } else {
        alertMsg += `Reforçar o treinamento de procedimentos operacionais e escutas simuladas.`;
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

  // 2. Opções do Gráfico de Evolução (ECharts Line Chart)
  const chartEvolutionOption = useMemo(() => {
    const dates = history.map(h => {
      if (!h.monitoring_date) return '';
      return h.monitoring_date.split('T')[0].slice(5); // MM-DD
    });
    const scores = history.map(h => h.score);

    const textColor = darkMode ? '#e4e4e7' : '#09090b';
    const labelColor = darkMode ? '#a1a1aa' : '#71717a';
    const borderColor = darkMode ? '#1e1e24' : '#e4e4e7';
    const bgTooltip = darkMode ? '#0c0c0f' : '#ffffff';

    return {
      color: "#3b82f6",
      tooltip: { 
        trigger: 'axis', 
        backgroundColor: bgTooltip, 
        borderColor: borderColor, 
        textStyle: { color: textColor } 
      },
      xAxis: { 
        type: 'category', 
        data: dates, 
        axisLabel: { color: labelColor },
        boundaryGap: false
      },
      yAxis: { 
        type: 'value', 
        min: 0,
        max: 100,
        axisLabel: { color: labelColor }, 
        splitLine: { lineStyle: { color: borderColor } } 
      },
      series: [{ 
        data: scores, 
        type: 'line', 
        smooth: true,
        symbolSize: 8,
        lineStyle: { width: 3 },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(59, 130, 246, 0.3)' },
              { offset: 1, color: 'rgba(59, 130, 246, 0.01)' }
            ]
          }
        }
      }],
      grid: { left: '8%', right: '5%', bottom: '15%', top: '10%' }
    };
  }, [history, darkMode]);

  // Cores de notas
  const getScoreStyleClass = (val) => {
    if (val === 0) return 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/30';
    if (val >= 90) return 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30';
    if (val >= 80) return 'text-orange-500 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/30';
    return 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#0c0c0f] w-full max-w-4xl rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        
        {/* Header Modal */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-900/10 no-print">
          <div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Ficha Individual do Operador</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Histórico de qualidade completo</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => window.print()} 
              className="px-3 py-1.5 bg-[#ffffff] dark:bg-[#262626] hover:bg-[#f8fafc] dark:hover:bg-zinc-800 text-[#334155] dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-bold transition-colors"
            >
              Imprimir Ficha
            </button>
            <button 
              onClick={onClose} 
              className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex-1 p-10 text-center text-zinc-500 dark:text-zinc-400">
            Buscando dados da ficha...
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* Informações Básicas + KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Box de Informações */}
              <div className="md:col-span-1 bg-zinc-50 dark:bg-zinc-900/30 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800/40 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-lg border border-blue-200 dark:border-blue-900/30">
                    {operator.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-extrabold text-zinc-900 dark:text-zinc-100 leading-tight">{operator.name}</h4>
                    <span className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded-full mt-1 ${
                      operator.status_feedback === 'Aguardando Feedback' 
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' 
                        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                    }`}>
                      {operator.status_feedback}
                    </span>
                  </div>
                </div>

                <div className="space-y-2.5 text-xs border-t border-zinc-200 dark:border-zinc-800/60 pt-3">
                  <div className="flex justify-between">
                    <span className="text-zinc-500 dark:text-zinc-400">Supervisor:</span>
                    <span className="font-semibold">{operator.supervisor_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500 dark:text-zinc-400">Horário:</span>
                    <span className="font-semibold">{operator.schedule}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500 dark:text-zinc-400">Skill:</span>
                    <span className="font-semibold">{operator.skill}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500 dark:text-zinc-400">Alocação:</span>
                    <span className="font-semibold">{operator.allocation}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500 dark:text-zinc-400">Escala:</span>
                    <span className="font-semibold">{operator.escala}</span>
                  </div>
                </div>
              </div>

              {/* Box de KPIs Rápidos */}
              <div className="md:col-span-2 grid grid-cols-2 md:grid-cols-3 gap-4 h-fit">
                
                <div className="bg-white dark:bg-[#0c0c0f] p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm text-center flex flex-col justify-center">
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Dias Sem Monitoria</span>
                  <p className="text-3xl font-extrabold mt-1 text-zinc-900 dark:text-zinc-100">{stats.daysWithoutMonitoring}</p>
                </div>

                <div className="bg-white dark:bg-[#0c0c0f] p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm text-center flex flex-col justify-center">
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Monitorias Realizadas</span>
                  <p className="text-3xl font-extrabold mt-1 text-zinc-900 dark:text-zinc-100">{stats.totalCount}</p>
                </div>

                <div className="bg-white dark:bg-[#0c0c0f] p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm text-center flex flex-col justify-center col-span-2 md:col-span-1">
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Média Geral das Notas</span>
                  <p className="text-3xl font-extrabold mt-1 text-zinc-900 dark:text-zinc-100">
                    {stats.avgScore > 0 ? stats.avgScore : '-'}
                  </p>
                </div>

                {/* Insight da IA Integrado */}
                <div className={`col-span-2 md:col-span-3 p-4 rounded-xl border flex gap-3 text-xs leading-relaxed ${
                  stats.aiInsight.level === 'warning'
                    ? 'bg-rose-50/50 dark:bg-rose-950/10 border-rose-200 dark:border-rose-900/30 text-rose-800 dark:text-rose-400'
                    : stats.aiInsight.level === 'neutral'
                      ? 'bg-zinc-50 dark:bg-zinc-900/20 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300'
                      : 'bg-emerald-50/50 dark:bg-emerald-950/10 border-emerald-200 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-400'
                }`}>
                  <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                    stats.aiInsight.level === 'warning' ? 'text-rose-500' : stats.aiInsight.level === 'neutral' ? 'text-zinc-400' : 'text-emerald-500'
                  }`} />
                  <div>
                    <h5 className="font-bold uppercase tracking-wider mb-0.5 text-[11px]">
                      IA Insight: {stats.aiInsight.title}
                    </h5>
                    <p>{stats.aiInsight.message}</p>
                  </div>
                </div>

              </div>

            </div>

            {/* Evolução de Notas (Gráfico) */}
            {history.length > 0 && (
              <div className="bg-white dark:bg-[#0c0c0f] p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                <h4 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3">Evolução do Desempenho</h4>
                <ReactECharts option={chartEvolutionOption} style={{ height: '220px' }} />
              </div>
            )}

            {/* Histórico Completo de Monitorias */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Histórico de Monitorias</h4>
              <div className="bg-white dark:bg-[#0c0c0f] rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-50 dark:bg-zinc-900/40 text-zinc-500 dark:text-zinc-400 font-semibold uppercase border-b border-zinc-200 dark:border-zinc-800">
                      <th className="px-4 py-2.5">Data</th>
                      <th className="px-4 py-2.5">Monitora</th>
                      <th className="px-4 py-2.5 text-center">Nota</th>
                      <th className="px-4 py-2.5 text-center">Status</th>
                      <th className="px-4 py-2.5">Observações / Feedback</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-zinc-800 dark:text-zinc-200">
                    {history.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="text-center py-6 text-zinc-400">Nenhum monitoramento realizado.</td>
                      </tr>
                    ) : (
                      history.slice().reverse().map(h => (
                        <tr key={h.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/30 transition-colors">
                          <td className="px-4 py-2.5 whitespace-nowrap">
                            {new Date(h.monitoring_date).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-2.5 whitespace-nowrap">{h.q_monitors?.name || 'Clarice'}</td>
                          <td className="px-4 py-2.5 text-center font-bold">
                            <span className={`inline-block px-1.5 py-0.5 rounded font-extrabold ${getScoreStyleClass(h.score)}`}>
                              {h.score}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-center whitespace-nowrap">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                              h.status === 'Aguardando Feedback' 
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30' 
                                : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30'
                            }`}>
                              {h.status}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 leading-relaxed max-w-sm truncate" title={h.feedback_notes}>
                            {h.feedback_notes || <span className="text-zinc-400">Sem observações</span>}
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
    </div>
  );
}
