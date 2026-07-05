import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { 
  Brain, 
  TrendingDown, 
  Scale, 
  Lightbulb, 
  AlertTriangle,
  Award,
  ChevronRight,
  BookOpen
} from 'lucide-react';
import { calculateCoverageStats, calculateFairnessIndex } from '../utils/distribution';

export default function AnalyticalIntelligence({ operators, monitorings, activeCycle, darkMode }) {
  
  // 1. Calcular Coberturas, IJC e Desequilíbrios
  const stats = useMemo(() => {
    if (operators.length === 0) {
      return { 
        ijc: 100, 
        imbalances: [], 
        planningSuggestions: [],
        qualityAlerts: [],
        trendDrops: [] 
      };
    }

    const { groups } = calculateCoverageStats(operators, monitorings, activeCycle?.id);
    const ijc = calculateFairnessIndex(groups);

    // Detecção de Desequilíbrios
    const imbalances = [];
    const planningSuggestions = [];

    // Mapear turnos, supervisores e skills com taxas de cobertura
    const analyzeCategory = (type, label) => {
      const coverages = Object.keys(groups[type]).map(key => ({
        key,
        total: groups[type][key].total,
        monitored: groups[type][key].monitored,
        pct: groups[type][key].total > 0 ? Math.round((groups[type][key].monitored / groups[type][key].total) * 100) : 0
      })).filter(item => item.total > 0);

      if (coverages.length <= 1) return;

      // Ordenar por cobertura para achar desvios
      coverages.sort((a, b) => a.pct - b.pct);
      const min = coverages[0];
      const max = coverages[coverages.length - 1];

      // Se a diferença for significativa (> 25%)
      if (max.pct - min.pct > 25) {
        imbalances.push({
          category: label,
          minGroup: min.key,
          minPct: min.pct,
          maxGroup: max.key,
          maxPct: max.pct,
          diff: max.pct - min.pct
        });

        planningSuggestions.push({
          type: 'cobertura',
          message: `Priorizar o grupo "${min.key}" de ${label} (cobertura atual: ${min.pct}%, contra ${max.pct}% em "${max.key}").`
        });
      }
    };

    analyzeCategory('turn', 'Turno');
    analyzeCategory('supervisor', 'Supervisor');
    analyzeCategory('skill', 'Skill');

    // Se não houver desequilíbrios significativos, sugerir recomendações padrão
    if (planningSuggestions.length === 0) {
      planningSuggestions.push({
        type: 'cobertura',
        message: 'A distribuição de monitorias está equilibrada no ciclo atual. Continue seguindo a Fila Inteligente.'
      });
    }

    // 2. Detecção de Operadores com Queda de Desempenho (Tendência de Queda)
    const trendDrops = [];
    const activeOperators = operators.filter(o => o.active);
    
    activeOperators.forEach(op => {
      const opMonitorings = monitorings
        .filter(m => m.operator_id === op.id)
        .sort((a, b) => new Date(a.monitoring_date) - new Date(b.monitoring_date)); // mais antigo para mais recente

      if (opMonitorings.length >= 2) {
        const lastScore = opMonitorings[opMonitorings.length - 1].score;
        
        // Média móvel anterior (excluindo a última)
        const previousScores = opMonitorings.slice(0, opMonitorings.length - 1).map(m => m.score);
        const previousAvg = previousScores.reduce((sum, val) => sum + val, 0) / previousScores.length;

        // Queda acima de 10 pontos
        if (previousAvg - lastScore >= 10) {
          trendDrops.push({
            id: op.id,
            name: op.name,
            supervisor: op.supervisor_name,
            previousAvg: Math.round(previousAvg * 10) / 10,
            lastScore,
            drop: Math.round((previousAvg - lastScore) * 10) / 10
          });
        }
      }
    });

    // 3. Alertas de qualidade gerais (média de notas do operador < 89)
    const qualityAlerts = [];
    activeOperators.forEach(op => {
      const opMonitorings = monitorings.filter(m => m.operator_id === op.id);
      if (opMonitorings.length > 0) {
        const avg = opMonitorings.reduce((sum, m) => sum + m.score, 0) / opMonitorings.length;
        if (avg < 89) {
          qualityAlerts.push({
            id: op.id,
            name: op.name,
            supervisor: op.supervisor_name,
            avg: Math.round(avg * 10) / 10,
            count: opMonitorings.length
          });
        }
      }
    });

    return {
      ijc,
      imbalances,
      planningSuggestions,
      qualityAlerts: qualityAlerts.sort((a, b) => a.avg - b.avg), // piores primeiro
      trendDrops: trendDrops.sort((a, b) => b.drop - a.drop) // maiores quedas primeiro
    };
  }, [operators, monitorings, activeCycle]);

  // Gráfico Gauge para o Índice de Justiça da Cobertura (IJC)
  const chartIJCOption = useMemo(() => {
    return {
      series: [
        {
          type: 'gauge',
          startAngle: 180,
          endAngle: 0,
          min: 0,
          max: 100,
          radius: '100%',
          center: ['50%', '75%'],
          axisLine: {
            lineStyle: {
              width: 15,
              color: [
                [0.3, '#f43f5e'], // Vermelho
                [0.7, '#f59e0b'], // Laranja
                [1, '#10b981']    // Verde
              ]
            }
          },
          pointer: {
            icon: 'path://M12.8,0.7l12,20.1c0.6,1,0.3,2.3-0.7,2.9c-0.3,0.2-0.6,0.3-1,0.3H1.3c-1.2,0-2.1-0.9-2.1-2.1c0-0.4,0.1-0.7,0.3-1l12-20.1C12,0,12.4,0,12.8,0.7z',
            length: '75%',
            width: 8,
            offsetCenter: [0, -15],
            itemStyle: {
              color: darkMode ? '#fafafa' : '#09090b'
            }
          },
          axisTick: { show: false },
          splitLine: { show: false },
          axisLabel: { show: false },
          title: {
            offsetCenter: [0, -45],
            fontSize: 12,
            color: darkMode ? '#a1a1aa' : '#71717a',
            fontWeight: 'bold'
          },
          detail: {
            valueAnimation: true,
            formatter: '{value}%',
            offsetCenter: [0, 10],
            fontSize: 32,
            fontWeight: 'extrabold',
            color: darkMode ? '#fafafa' : '#09090b'
          },
          data: [
            {
              value: stats.ijc,
              name: 'JUSTIÇA DA COBERTURA'
            }
          ]
        }
      ]
    };
  }, [stats.ijc, darkMode]);

  const textColor = darkMode ? '#fafafa' : '#09090b';

  return (
    <div className="space-y-6">
      
      {/* Top Grid: IJC + Planejamento Diário */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Card do Índice de Justiça da Cobertura (IJC) */}
        <div className="bg-white dark:bg-[#0c0c0f] p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between items-center text-center">
          <div className="w-full text-left border-b border-zinc-200 dark:border-zinc-800 pb-3 mb-2 flex items-center gap-2">
            <Scale className="w-4 h-4 text-blue-500" />
            <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">Índice de Justiça (IJC)</h4>
          </div>

          <div className="w-full h-44 flex items-center justify-center">
            <ReactECharts option={chartIJCOption} style={{ width: '100%', height: '180px' }} />
          </div>

          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 text-justify leading-relaxed">
            Mede o equilíbrio da cobertura entre turnos, supervisores e skills. Um índice de <strong>100%</strong> significa que todos os segmentos foram monitorados na mesma proporção.
          </p>
        </div>

        {/* Card de Planejamento Sugerido (Dicas de Monitoria) */}
        <div className="lg:col-span-2 bg-white dark:bg-[#0c0c0f] p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
          <div className="border-b border-zinc-200 dark:border-zinc-800 pb-3 flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-amber-500 animate-pulse" />
            <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">Recomendações de Planejamento Diário</h4>
          </div>

          <div className="space-y-3">
            {stats.planningSuggestions.map((suggestion, i) => (
              <div 
                key={i} 
                className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 rounded-lg text-sm"
              >
                <ChevronRight className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <span className="text-zinc-800 dark:text-zinc-200 leading-relaxed font-semibold">
                  {suggestion.message}
                </span>
              </div>
            ))}
          </div>

          {/* Resumo de Desequilíbrios */}
          {stats.imbalances.length > 0 && (
            <div className="bg-zinc-50 dark:bg-zinc-900/30 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800/40 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                <span>Desvios Críticos Detectados</span>
              </div>
              <ul className="text-xs text-zinc-600 dark:text-zinc-400 space-y-1.5 list-disc pl-4 leading-relaxed">
                {stats.imbalances.map((imb, idx) => (
                  <li key={idx}>
                    Diferença de <strong>{imb.diff}%</strong> no <strong>{imb.category}</strong>: Grupo "{imb.maxGroup}" tem {imb.maxPct}% contra apenas {imb.minPct}% em "{imb.minGroup}".
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

      </div>

      {/* Grid de Tendências e Baixa Performance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Queda de Desempenho (Trend Alerts) */}
        <div className="bg-white dark:bg-[#0c0c0f] p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
          <div className="border-b border-zinc-200 dark:border-zinc-800 pb-3 flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-rose-500" />
            <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">Tendência de Queda (Alerta)</h4>
          </div>

          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {stats.trendDrops.length === 0 ? (
              <div className="text-center py-10 text-xs text-zinc-500 dark:text-zinc-400">
                Nenhum operador com queda acentuada recente detectada.
              </div>
            ) : (
              stats.trendDrops.map(td => (
                <div 
                  key={td.id}
                  className="p-3 bg-rose-50/50 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-900/30 rounded-lg flex items-center justify-between text-xs"
                >
                  <div>
                    <h5 className="font-bold text-zinc-800 dark:text-zinc-200">{td.name}</h5>
                    <p className="text-zinc-500 dark:text-zinc-400">Sup: {td.supervisor}</p>
                  </div>
                  <div className="text-right space-y-1">
                    <span className="bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400 px-1.5 py-0.5 rounded font-bold">
                      Queda: -{td.drop} pts
                    </span>
                    <p className="text-[10px] text-zinc-400">
                      Média {td.previousAvg} ➔ Última: {td.lastScore}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Alertas de Qualidade (Média < 89) */}
        <div className="bg-white dark:bg-[#0c0c0f] p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
          <div className="border-b border-zinc-200 dark:border-zinc-800 pb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">Operadores Abaixo da Média (Média &lt; 89)</h4>
          </div>

          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {stats.qualityAlerts.length === 0 ? (
              <div className="text-center py-10 text-xs text-zinc-500 dark:text-zinc-400">
                Todos os operadores ativos estão operando na média ideal (≥ 89).
              </div>
            ) : (
              stats.qualityAlerts.map(qa => (
                <div 
                  key={qa.id}
                  className="p-3 bg-amber-50/50 dark:bg-amber-950/10 border border-amber-100 dark:border-amber-900/30 rounded-lg flex items-center justify-between text-xs"
                >
                  <div>
                    <h5 className="font-bold text-zinc-800 dark:text-zinc-200">{qa.name}</h5>
                    <p className="text-zinc-500 dark:text-zinc-400">Sup: {qa.supervisor} • Monitorias: {qa.count}</p>
                  </div>
                  <div className="text-right">
                    <span className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 rounded font-extrabold text-[13px]">
                      {qa.avg}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Estratégias Gerais de Treinamento */}
      <div className="bg-white dark:bg-[#0c0c0f] p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
        <div className="border-b border-zinc-200 dark:border-zinc-800 pb-3 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-purple-500" />
          <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">Planos Estratégicos & Recomendações de Treinamento</h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="bg-zinc-50 dark:bg-zinc-900/30 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800/40 space-y-2">
            <h5 className="font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider text-[11px]">Plano 1: Reciclagem Operacional</h5>
            <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Para operadores listados com média abaixo de 89. Agendar escutas de reciclagem focadas em <strong>Procedimento Correto / Resolução</strong> (item de maior peso na qualidade).
            </p>
          </div>
          <div className="bg-zinc-50 dark:bg-zinc-900/30 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800/40 space-y-2">
            <h5 className="font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider text-[11px]">Plano 2: Coaching de Soft Skills</h5>
            <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Operadores com oscilação recente de nota (Trend Alert) costumam falhar em <strong>Cordialidade e Empatia</strong> devido ao estresse operacional. Aplicar feedback consultivo de 10 min.
            </p>
          </div>
          <div className="bg-zinc-50 dark:bg-zinc-900/30 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800/40 space-y-2">
            <h5 className="font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider text-[11px]">Plano 3: Reforço Sistêmico</h5>
            <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Erros de <strong>Registro Adequado no Sistema</strong> geram impacto na operação. Fazer envio de pílulas de conhecimento (briefings de 2 minutos) sobre registros de chamados no 156.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
