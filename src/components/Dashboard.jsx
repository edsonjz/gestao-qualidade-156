import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { 
  Users, 
  CheckSquare, 
  Target, 
  Clock, 
  AlertCircle,
  TrendingUp,
  FileText
} from 'lucide-react';
import { getTurnFromSchedule } from '../utils/distribution';

export default function Dashboard({ operators, monitorings, activeCycle, darkMode }) {
  // 1. Cálculos de Indicadores (KPIs)
  const kpis = useMemo(() => {
    const totalOps = operators.length;
    const activeOps = operators.filter(o => o.active).length;
    const inactiveOps = totalOps - activeOps;

    // Monitorias hoje
    const todayStr = new Date().toISOString().split('T')[0];
    const monitoringsToday = monitorings.filter(m => {
      if (!m.monitoring_date) return false;
      return m.monitoring_date.startsWith(todayStr);
    }).length;

    const metaDia = 34; // 17 por monitora (2 monitoras)
    const pctMeta = metaDia > 0 ? Math.round((monitoringsToday / metaDia) * 100) : 0;

    const pendingFeedbacks = monitorings.filter(m => m.status === 'Aguardando Feedback').length;
    const completedFeedbacks = monitorings.filter(m => m.status === 'Feedback Concluído').length;

    // Operadores aguardando monitoria no ciclo ativo
    const opsMonitoredInActiveCycle = new Set(
      monitorings
        .filter(m => m.cycle_id === activeCycle?.id)
        .map(m => m.operator_id)
    );
    const opsAguardandoMonitoria = operators.filter(o => o.active && !opsMonitoredInActiveCycle.has(o.id)).length;
    const opsAguardandoFeedback = operators.filter(o => o.active && o.status_feedback === 'Aguardando Feedback').length;

    // Tempo médio de feedback em horas
    const completedMonitoringsWithDates = monitorings.filter(m => 
      m.status === 'Feedback Concluído' && m.monitoring_date && m.feedback_date
    );
    let avgFeedbackTimeHours = 0;
    if (completedMonitoringsWithDates.length > 0) {
      const totalTimeMs = completedMonitoringsWithDates.reduce((sum, m) => {
        const mDate = new Date(m.monitoring_date);
        const fDate = new Date(m.feedback_date);
        return sum + Math.abs(fDate - mDate);
      }, 0);
      avgFeedbackTimeHours = Math.round(totalTimeMs / (1000 * 60 * 60) / completedMonitoringsWithDates.length * 10) / 10;
    }

    // Cobertura do ciclo atual
    const activeMonitoredCount = operators.filter(o => o.active && opsMonitoredInActiveCycle.has(o.id)).length;
    const coberturaCiclo = activeOps > 0 ? Math.round((activeMonitoredCount / activeOps) * 100) : 0;

    return {
      totalOps,
      activeOps,
      inactiveOps,
      monitoringsToday,
      metaDia,
      pctMeta,
      pendingFeedbacks,
      completedFeedbacks,
      opsAguardandoMonitoria,
      opsAguardandoFeedback,
      avgFeedbackTimeHours,
      coberturaCiclo
    };
  }, [operators, monitorings, activeCycle]);

  // 2. Cores e Estilo dos Gráficos ECharts
  const textColor = darkMode ? '#e4e4e7' : '#09090b';
  const labelColor = darkMode ? '#a1a1aa' : '#71717a';
  const borderColor = darkMode ? '#1e1e24' : '#e4e4e7';
  const bgTooltip = darkMode ? '#0c0c0f' : '#ffffff';
  
  const chartColors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1"];

  // 3. Preparar Dados dos Gráficos
  // Gráfico: Monitorias por Dia
  const chartMonitoringsByDay = useMemo(() => {
    const datesMap = {};
    monitorings.forEach(m => {
      if (!m.monitoring_date) return;
      const date = m.monitoring_date.split('T')[0];
      datesMap[date] = (datesMap[date] || 0) + 1;
    });

    const sortedDates = Object.keys(datesMap).sort().slice(-10); // últimos 10 dias
    const values = sortedDates.map(d => datesMap[d]);

    return {
      color: chartColors[0],
      tooltip: { trigger: 'axis', backgroundColor: bgTooltip, borderColor: borderColor, textStyle: { color: textColor } },
      xAxis: { type: 'category', data: sortedDates.map(d => d.slice(5)), axisLabel: { color: labelColor } },
      yAxis: { type: 'value', axisLabel: { color: labelColor }, splitLine: { lineStyle: { color: borderColor } } },
      series: [{ data: values, type: 'bar', barWidth: '40%', itemStyle: { borderRadius: [4, 4, 0, 0] } }],
      grid: { left: '8%', right: '5%', bottom: '15%', top: '10%' }
    };
  }, [monitorings, darkMode]);

  // Gráfico: Monitorias por Monitora
  const chartMonitoringsByMonitor = useMemo(() => {
    const monitorsMap = {};
    monitorings.forEach(m => {
      const name = m.q_monitors?.name || m.monitor_id || 'Desconhecido';
      monitorsMap[name] = (monitorsMap[name] || 0) + 1;
    });

    const data = Object.keys(monitorsMap).map(k => ({ name: k, value: monitorsMap[k] }));

    return {
      color: chartColors,
      tooltip: { trigger: 'item', backgroundColor: bgTooltip, borderColor: borderColor, textStyle: { color: textColor } },
      legend: { bottom: 0, textStyle: { color: labelColor } },
      series: [{
        type: 'pie',
        radius: ['45%', '70%'],
        avoidLabelOverlap: false,
        label: { show: false },
        emphasis: { label: { show: true, fontSize: '14', fontWeight: 'bold', color: textColor } },
        data: data
      }],
      grid: { bottom: '15%' }
    };
  }, [monitorings, darkMode]);

  // Gráfico: Monitorias por Supervisor
  const chartMonitoringsBySupervisor = useMemo(() => {
    const supervisorMap = {};
    monitorings.forEach(m => {
      const superv = m.q_operators?.supervisor_name || 'Sem Supervisor';
      supervisorMap[superv] = (supervisorMap[superv] || 0) + 1;
    });

    const categories = Object.keys(supervisorMap);
    const data = categories.map(k => supervisorMap[k]);

    return {
      color: chartColors[1],
      tooltip: { trigger: 'axis', backgroundColor: bgTooltip, borderColor: borderColor, textStyle: { color: textColor } },
      xAxis: { type: 'category', data: categories, axisLabel: { color: labelColor, rotate: 20 } },
      yAxis: { type: 'value', axisLabel: { color: labelColor }, splitLine: { lineStyle: { color: borderColor } } },
      series: [{ data: data, type: 'bar', barWidth: '40%', itemStyle: { borderRadius: [4, 4, 0, 0] } }],
      grid: { left: '8%', right: '5%', bottom: '25%', top: '10%' }
    };
  }, [monitorings, darkMode]);

  // Gráfico: Coberturas por Turno no Ciclo Ativo
  const chartCoverageByTurn = useMemo(() => {
    const turns = { 'Madrugada': { total: 0, monitored: 0 }, 'Manhã': { total: 0, monitored: 0 }, 'Tarde': { total: 0, monitored: 0 }, 'Noite': { total: 0, monitored: 0 } };
    const opsMonitoredInActiveCycle = new Set(
      monitorings.filter(m => m.cycle_id === activeCycle?.id).map(m => m.operator_id)
    );

    operators.filter(o => o.active).forEach(o => {
      const turn = getTurnFromSchedule(o.schedule);
      if (turns[turn]) {
        turns[turn].total++;
        if (opsMonitoredInActiveCycle.has(o.id)) {
          turns[turn].monitored++;
        }
      }
    });

    const categories = Object.keys(turns);
    const pctData = categories.map(cat => {
      const group = turns[cat];
      return group.total > 0 ? Math.round((group.monitored / group.total) * 100) : 0;
    });

    return {
      color: chartColors[4],
      tooltip: { 
        trigger: 'axis', 
        formatter: '{b}: {c}% de Cobertura',
        backgroundColor: bgTooltip, 
        borderColor: borderColor, 
        textStyle: { color: textColor } 
      },
      xAxis: { type: 'category', data: categories, axisLabel: { color: labelColor } },
      yAxis: { 
        type: 'value', 
        max: 100, 
        axisLabel: { color: labelColor, formatter: '{value}%' },
        splitLine: { lineStyle: { color: borderColor } } 
      },
      series: [{ data: pctData, type: 'bar', barWidth: '40%', itemStyle: { borderRadius: [4, 4, 0, 0] } }],
      grid: { left: '8%', right: '5%', bottom: '15%', top: '10%' }
    };
  }, [operators, monitorings, activeCycle, darkMode]);

  // Gráfico: Distribuição HO vs Presencial
  const chartHOvsPresencial = useMemo(() => {
    let ho = 0, presencial = 0;
    operators.filter(o => o.active).forEach(o => {
      if (o.allocation === 'Home Office') ho++;
      else presencial++;
    });

    return {
      color: [chartColors[2], chartColors[3]],
      tooltip: { trigger: 'item', backgroundColor: bgTooltip, borderColor: borderColor, textStyle: { color: textColor } },
      legend: { bottom: 0, textStyle: { color: labelColor } },
      series: [{
        type: 'pie',
        radius: '65%',
        data: [
          { name: 'Home Office', value: ho },
          { name: 'Presencial', value: presencial }
        ],
        label: {
          show: true,
          formatter: '{b}: {c} ({d}%)',
          color: textColor
        }
      }]
    };
  }, [operators, darkMode]);

  // Gráfico: Cobertura por Skill
  const chartCoverageBySkill = useMemo(() => {
    const skills = {};
    const opsMonitoredInActiveCycle = new Set(
      monitorings.filter(m => m.cycle_id === activeCycle?.id).map(m => m.operator_id)
    );

    operators.filter(o => o.active).forEach(o => {
      const skill = o.skill || 'Outra';
      if (!skills[skill]) {
        skills[skill] = { total: 0, monitored: 0 };
      }
      skills[skill].total++;
      if (opsMonitoredInActiveCycle.has(o.id)) {
        skills[skill].monitored++;
      }
    });

    const categories = Object.keys(skills);
    const pctData = categories.map(cat => {
      const group = skills[cat];
      return group.total > 0 ? Math.round((group.monitored / group.total) * 100) : 0;
    });

    return {
      color: chartColors[6],
      tooltip: { 
        trigger: 'axis', 
        formatter: '{b}: {c}% de Cobertura',
        backgroundColor: bgTooltip, 
        borderColor: borderColor, 
        textStyle: { color: textColor } 
      },
      xAxis: { type: 'category', data: categories, axisLabel: { color: labelColor } },
      yAxis: { 
        type: 'value', 
        max: 100, 
        axisLabel: { color: labelColor, formatter: '{value}%' },
        splitLine: { lineStyle: { color: borderColor } } 
      },
      series: [{ data: pctData, type: 'bar', barWidth: '40%', itemStyle: { borderRadius: [4, 4, 0, 0] } }],
      grid: { left: '8%', right: '5%', bottom: '15%', top: '10%' }
    };
  }, [operators, monitorings, activeCycle, darkMode]);

  return (
    <div className="space-y-6">
      {/* 1. Cards de KPI */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#0c0c0f] p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center justify-between">
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Operadores Ativos</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-zinc-950 dark:text-zinc-50 tracking-tight">{kpis.activeOps}</span>
              <span className="text-xs text-zinc-400">de {kpis.totalOps} totais</span>
            </div>
          </div>
          <div className="p-3 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 rounded-lg">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-[#0c0c0f] p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center justify-between">
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Realizado Hoje</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-zinc-950 dark:text-zinc-50 tracking-tight">{kpis.monitoringsToday}</span>
              <span className="text-xs text-zinc-400">meta: {kpis.metaDia}</span>
            </div>
            {/* Meta Pill */}
            <div className="mt-1">
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                kpis.pctMeta >= 100 
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' 
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
              }`}>
                {kpis.pctMeta}% da meta
              </span>
            </div>
          </div>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-lg">
            <CheckSquare className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-[#0c0c0f] p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center justify-between">
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Feedbacks Pendentes</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-zinc-950 dark:text-zinc-50 tracking-tight">{kpis.pendingFeedbacks}</span>
              <span className="text-xs text-zinc-400">bloqueando operador</span>
            </div>
          </div>
          <div className="p-3 bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 rounded-lg">
            <AlertCircle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-[#0c0c0f] p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center justify-between">
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Cobertura do Ciclo</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-zinc-950 dark:text-zinc-50 tracking-tight">{kpis.coberturaCiclo}%</span>
              <span className="text-xs text-zinc-400">Ciclo {activeCycle?.cycle_number || 1}</span>
            </div>
          </div>
          <div className="p-3 bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400 rounded-lg">
            <Target className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 2. Grid de Cards Secundários */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#0c0c0f] p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm text-center">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Aguardando Monitoria</p>
          <p className="text-2xl font-bold mt-1 text-zinc-900 dark:text-zinc-100">{kpis.opsAguardandoMonitoria}</p>
        </div>
        <div className="bg-white dark:bg-[#0c0c0f] p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm text-center">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Aguardando Feedback</p>
          <p className="text-2xl font-bold mt-1 text-zinc-900 dark:text-zinc-100">{kpis.opsAguardandoFeedback}</p>
        </div>
        <div className="bg-white dark:bg-[#0c0c0f] p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm text-center">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Tempo Médio Feedback</p>
          <p className="text-2xl font-bold mt-1 text-zinc-900 dark:text-zinc-100">{kpis.avgFeedbackTimeHours}h</p>
        </div>
        <div className="bg-white dark:bg-[#0c0c0f] p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm text-center">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Feedbacks Concluídos</p>
          <p className="text-2xl font-bold mt-1 text-zinc-900 dark:text-zinc-100">{kpis.completedFeedbacks}</p>
        </div>
      </div>

      {/* 3. Gráficos - Layout Unificado (1 Gráfico por Linha/Card conforme shared_design_system) */}
      <div className="grid grid-cols-1 gap-6">
        <div className="bg-white dark:bg-[#0c0c0f] p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 mb-4 uppercase tracking-wider">Monitorias Realizadas por Dia</h3>
          <ReactECharts option={chartMonitoringsByDay} style={{ height: '300px' }} theme={darkMode ? 'dark' : ''} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-[#0c0c0f] p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 mb-4 uppercase tracking-wider">Monitorias por Monitora</h3>
            <ReactECharts option={chartMonitoringsByMonitor} style={{ height: '300px' }} />
          </div>

          <div className="bg-white dark:bg-[#0c0c0f] p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 mb-4 uppercase tracking-wider">Distribuição Home Office vs Presencial</h3>
            <ReactECharts option={chartHOvsPresencial} style={{ height: '300px' }} />
          </div>
        </div>

        <div className="bg-white dark:bg-[#0c0c0f] p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 mb-4 uppercase tracking-wider">Monitorias por Supervisor</h3>
          <ReactECharts option={chartMonitoringsBySupervisor} style={{ height: '350px' }} />
        </div>

        <div className="bg-white dark:bg-[#0c0c0f] p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 mb-4 uppercase tracking-wider">Cobertura de Monitoria por Turno (Ciclo Atual)</h3>
          <ReactECharts option={chartCoverageByTurn} style={{ height: '300px' }} />
        </div>

        <div className="bg-white dark:bg-[#0c0c0f] p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 mb-4 uppercase tracking-wider">Cobertura por Skill (Ciclo Atual)</h3>
          <ReactECharts option={chartCoverageBySkill} style={{ height: '300px' }} />
        </div>
      </div>
    </div>
  );
}
