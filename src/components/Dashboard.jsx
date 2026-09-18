import React, { useState, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { 
  Users, 
  CheckSquare, 
  Target, 
  Clock, 
  AlertCircle, 
  TrendingUp, 
  TrendingDown, 
  FileText, 
  Trophy, 
  Award, 
  Medal, 
  Calendar, 
  Filter, 
  Search, 
  UserCheck, 
  CheckCircle, 
  ArrowUpDown,
  Sparkles
} from 'lucide-react';
import { getTurnFromSchedule } from '../utils/distribution';

const formatDuration = (ms) => {
  if (!ms || isNaN(ms)) return '00:00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  const pad = (num) => String(num).padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
};

export default function Dashboard({ 
  operators = [], 
  allOperators = [],
  monitorings = [], 
  allMonitorings = [],
  audits = [],
  monitors = [], 
  supervisors = [],
  activeCycle, 
  darkMode,
  userRole = 'admin'
}) {
  // Base de dados global para comparativos e ranking operacional
  const effectiveOperators = allOperators.length > 0 ? allOperators : operators;
  const effectiveMonitorings = allMonitorings.length > 0 ? allMonitorings : monitorings;

  // Estados de Visualização (Monitorias vs Auditorias)
  const [todayViewType, setTodayViewType] = useState('monitorings'); // 'monitorings' | 'audits'
  const [rankingCategory, setRankingCategory] = useState('monitorings'); // 'monitorings' | 'audits'

  // Estados de Filtro de Produtividade das Monitoras
  const [monitorPeriod, setMonitorPeriod] = useState('day'); // 'day', 'week', 'month'
  const [auditPeriod, setAuditPeriod] = useState('day'); // 'day', 'week', 'month'

  // Estados de Filtro de Média dos Operadores
  const [operatorSortOrder, setOperatorSortOrder] = useState('best'); // 'best' (melhores) ou 'worst' (piores)
  const [selectedTeamFilter, setSelectedTeamFilter] = useState('all');
  const [operatorSearch, setOperatorSearch] = useState('');

  // 1. Cálculos de Indicadores (KPIs)
  const kpis = useMemo(() => {
    const totalOps = operators.length;
    const activeOps = operators.filter(o => o.active).length;
    const inactiveOps = totalOps - activeOps;

    // Monitorias hoje
    const todayStr = new Date().toISOString().split('T')[0];
    const monitoringsTodayList = effectiveMonitorings.filter(m => {
      if (!m.monitoring_date) return false;
      return m.monitoring_date.startsWith(todayStr);
    });
    const monitoringsToday = monitoringsTodayList.length;

    // Meta diária total da operação (soma das metas das monitoras ou 17 por monitora)
    const activeMonitorsCount = monitors.length > 0 ? monitors.length : 2;
    const metaDia = monitors.reduce((sum, m) => sum + (Number(m.daily_target) || 17), 0) || (activeMonitorsCount * 17);
    const pctMeta = metaDia > 0 ? Math.round((monitoringsToday / metaDia) * 100) : 0;

    // Auditorias hoje e meta
    const auditsTodayList = audits.filter(a => {
      if (!a.audit_date) return false;
      return a.audit_date.startsWith(todayStr);
    });
    const auditsToday = auditsTodayList.length;
    const metaAuditDia = monitors.reduce((sum, m) => sum + (Number(m.daily_audit_target) || 5), 0) || (activeMonitorsCount * 5);
    const pctAuditMeta = metaAuditDia > 0 ? Math.round((auditsToday / metaAuditDia) * 100) : 0;

    // Feedbacks pendentes: busca tanto das monitorias quanto dos operadores no status 'Aguardando Feedback'
    const pendingFromMonitorings = effectiveMonitorings.filter(m => m.status === 'Aguardando Feedback').length;
    const pendingFromOperators = effectiveOperators.filter(o => o.active && o.status_feedback === 'Aguardando Feedback').length;
    const pendingFeedbacks = Math.max(pendingFromMonitorings, pendingFromOperators);
    const completedFeedbacks = effectiveMonitorings.filter(m => m.status === 'Feedback Concluído').length;

    // Operadores aguardando monitoria no ciclo ativo
    const opsMonitoredInActiveCycle = new Set(
      monitorings
        .filter(m => m.cycle_id === activeCycle?.id)
        .map(m => m.operator_id)
    );
    const opsAguardandoMonitoria = operators.filter(o => o.active && !opsMonitoredInActiveCycle.has(o.id)).length;
    const opsAguardandoFeedback = pendingFeedbacks;

    // Tempo médio de feedback
    const completedMonitoringsWithDates = monitorings.filter(m => 
      m.status === 'Feedback Concluído' && m.monitoring_date && m.feedback_date
    );
    let avgFeedbackTimeMs = 0;
    if (completedMonitoringsWithDates.length > 0) {
      const totalTimeMs = completedMonitoringsWithDates.reduce((sum, m) => {
        const mDate = new Date(m.monitoring_date);
        const fDate = new Date(m.feedback_date);
        return sum + Math.abs(fDate - mDate);
      }, 0);
      avgFeedbackTimeMs = totalTimeMs / completedMonitoringsWithDates.length;
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
      auditsToday,
      metaAuditDia,
      pctAuditMeta,
      pendingFeedbacks,
      completedFeedbacks,
      opsAguardandoMonitoria,
      opsAguardandoFeedback,
      avgFeedbackTimeMs,
      coberturaCiclo
    };
  }, [operators, monitorings, effectiveMonitorings, audits, monitors, activeCycle]);

  // 2. Monitorias Realizadas Hoje Detalhadas por Monitora
  const todayBreakdownByMonitor = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const todayMons = effectiveMonitorings.filter(m => m.monitoring_date && m.monitoring_date.startsWith(todayStr));
    
    // Mapear monitores cadastrados
    const monitorMap = {};
    monitors.forEach(m => {
      monitorMap[m.id] = {
        id: m.id,
        name: m.name,
        target: Number(m.daily_target) || 17,
        count: 0,
        scoresSum: 0
      };
    });

    todayMons.forEach(m => {
      const monId = m.monitor_id;
      const monName = m.q_monitors?.name || 'Monitor(a)';
      if (monId && monitorMap[monId]) {
        monitorMap[monId].count++;
        monitorMap[monId].scoresSum += Number(m.score) || 0;
      } else {
        // Encontrar por nome
        const existingKey = Object.keys(monitorMap).find(k => monitorMap[k].name.toLowerCase() === monName.toLowerCase());
        if (existingKey) {
          monitorMap[existingKey].count++;
          monitorMap[existingKey].scoresSum += Number(m.score) || 0;
        } else {
          monitorMap[monId || monName] = {
            id: monId || monName,
            name: monName,
            target: 17,
            count: 1,
            scoresSum: Number(m.score) || 0
          };
        }
      }
    });

    return Object.values(monitorMap).sort((a, b) => b.count - a.count);
  }, [effectiveMonitorings, monitors]);

  // 2.1 Auditorias Realizadas Hoje Detalhadas por Monitora
  const todayAuditsBreakdownByMonitor = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const todayAudits = audits.filter(a => a.audit_date && a.audit_date.startsWith(todayStr));

    const monitorMap = {};
    monitors.forEach(m => {
      monitorMap[m.id] = {
        id: m.id,
        name: m.name,
        target: Number(m.daily_audit_target) || 5,
        count: 0
      };
    });

    todayAudits.forEach(a => {
      const auditorId = a.auditor_id;
      const auditorName = a.auditor_name || 'Monitor(a)';
      let targetObj = null;

      if (auditorId && monitorMap[auditorId]) {
        targetObj = monitorMap[auditorId];
      } else {
        const existingKey = Object.keys(monitorMap).find(
          k => monitorMap[k].name.toLowerCase() === auditorName.toLowerCase()
        );
        if (existingKey) {
          targetObj = monitorMap[existingKey];
        } else {
          monitorMap[auditorId || auditorName] = {
            id: auditorId || auditorName,
            name: auditorName,
            target: 5,
            count: 0
          };
          targetObj = monitorMap[auditorId || auditorName];
        }
      }
      targetObj.count++;
    });

    return Object.values(monitorMap).sort((a, b) => b.count - a.count);
  }, [audits, monitors]);

  // 3. Ranking de Produtividade por Monitora com Filtro (Hoje, Semana, Mês)
  const monitorRanking = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const currentMonthStr = now.toISOString().slice(0, 7);

    // Multiplicador de meta conforme período
    const targetMultiplier = monitorPeriod === 'day' ? 1 : monitorPeriod === 'week' ? 5 : 20;

    const filteredMons = effectiveMonitorings.filter(m => {
      if (!m.monitoring_date) return false;
      if (monitorPeriod === 'day') {
        return m.monitoring_date.startsWith(todayStr);
      }
      if (monitorPeriod === 'week') {
        const mDate = new Date(m.monitoring_date);
        const diffTime = now - mDate;
        const diffDays = diffTime / (1000 * 60 * 60 * 24);
        return diffDays >= 0 && diffDays <= 7;
      }
      if (monitorPeriod === 'month') {
        return m.monitoring_date.startsWith(currentMonthStr);
      }
      return true;
    });

    const rankMap = {};
    monitors.forEach(m => {
      const baseTarget = Number(m.daily_target) || 17;
      rankMap[m.id] = {
        id: m.id,
        name: m.name,
        target: baseTarget * targetMultiplier,
        count: 0,
        scoresSum: 0,
        ncgCount: 0
      };
    });

    filteredMons.forEach(m => {
      const monId = m.monitor_id;
      const monName = m.q_monitors?.name || 'Monitor(a)';
      let targetObj = monitorMapTarget(rankMap, monId, monName);
      if (!targetObj) {
        rankMap[monId || monName] = {
          id: monId || monName,
          name: monName,
          target: 17 * targetMultiplier,
          count: 0,
          scoresSum: 0,
          ncgCount: 0
        };
        targetObj = rankMap[monId || monName];
      }
      targetObj.count++;
      targetObj.scoresSum += Number(m.score) || 0;
      if (m.is_ncg) targetObj.ncgCount++;
    });

    function monitorMapTarget(map, id, name) {
      if (id && map[id]) return map[id];
      const byName = Object.keys(map).find(k => map[k].name.toLowerCase() === name.toLowerCase());
      return byName ? map[byName] : null;
    }

    return Object.values(rankMap)
      .map(item => ({
        ...item,
        avgScore: item.count > 0 ? (item.scoresSum / item.count).toFixed(1) : '0.0',
        pctAccomplished: item.target > 0 ? Math.round((item.count / item.target) * 100) : 0
      }))
      .sort((a, b) => b.count - a.count || Number(b.avgScore) - Number(a.avgScore));
  }, [effectiveMonitorings, monitors, monitorPeriod]);

  // 3.1 Ranking de Produtividade em Auditorias por Monitora
  const auditRanking = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const currentMonthStr = now.toISOString().slice(0, 7);

    const targetMultiplier = auditPeriod === 'day' ? 1 : auditPeriod === 'week' ? 5 : 20;

    const filteredAudits = audits.filter(a => {
      if (!a.audit_date) return false;
      if (auditPeriod === 'day') {
        return a.audit_date.startsWith(todayStr);
      }
      if (auditPeriod === 'week') {
        const aDate = new Date(a.audit_date);
        const diffTime = now - aDate;
        const diffDays = diffTime / (1000 * 60 * 60 * 24);
        return diffDays >= 0 && diffDays <= 7;
      }
      if (auditPeriod === 'month') {
        return a.audit_date.startsWith(currentMonthStr);
      }
      return true;
    });

    const rankMap = {};
    monitors.forEach(m => {
      const baseTarget = Number(m.daily_audit_target) || 5;
      rankMap[m.id] = {
        id: m.id,
        name: m.name,
        target: baseTarget * targetMultiplier,
        count: 0,
        topics: {}
      };
    });

    filteredAudits.forEach(a => {
      const auditorId = a.auditor_id;
      const auditorName = a.auditor_name || 'Monitor(a)';
      let targetObj = null;

      if (auditorId && rankMap[auditorId]) {
        targetObj = rankMap[auditorId];
      } else {
        const existingKey = Object.keys(rankMap).find(
          k => rankMap[k].name.toLowerCase() === auditorName.toLowerCase()
        );
        if (existingKey) {
          targetObj = rankMap[existingKey];
        } else {
          rankMap[auditorId || auditorName] = {
            id: auditorId || auditorName,
            name: auditorName,
            target: 5 * targetMultiplier,
            count: 0,
            topics: {}
          };
          targetObj = rankMap[auditorId || auditorName];
        }
      }
      targetObj.count++;
      if (a.topic) {
        targetObj.topics[a.topic] = (targetObj.topics[a.topic] || 0) + 1;
      }
    });

    return Object.values(rankMap)
      .map(item => ({
        ...item,
        pctAccomplished: item.target > 0 ? Math.round((item.count / item.target) * 100) : 0,
        topTopic: Object.keys(item.topics).length > 0 
          ? Object.entries(item.topics).sort((a, b) => b[1] - a[1])[0][0] 
          : 'Geral'
      }))
      .sort((a, b) => b.count - a.count);
  }, [audits, monitors, auditPeriod]);

  // 4. Média da Nota de Monitoria de Cada Equipe / Supervisor
  const teamAverages = useMemo(() => {
    const teamsMap = {};

    // Inicializar com supervisores cadastrados
    supervisors.forEach(s => {
      teamsMap[s.name] = {
        supervisorName: s.name,
        supervisorId: s.id,
        totalScore: 0,
        count: 0,
        ncgCount: 0,
        activeOperators: 0
      };
    });

    // Contar operadores ativos por equipe
    effectiveOperators.filter(o => o.active).forEach(o => {
      const sName = o.supervisor_name || 'Sem Supervisor';
      if (!teamsMap[sName]) {
        teamsMap[sName] = {
          supervisorName: sName,
          supervisorId: o.supervisor_id,
          totalScore: 0,
          count: 0,
          ncgCount: 0,
          activeOperators: 0
        };
      }
      teamsMap[sName].activeOperators++;
    });

    // Consolidar monitorias por equipe
    effectiveMonitorings.forEach(m => {
      const sName = m.q_operators?.supervisor_name || 'Sem Supervisor';
      if (!teamsMap[sName]) {
        teamsMap[sName] = {
          supervisorName: sName,
          supervisorId: null,
          totalScore: 0,
          count: 0,
          ncgCount: 0,
          activeOperators: 0
        };
      }
      teamsMap[sName].totalScore += Number(m.score) || 0;
      teamsMap[sName].count++;
      if (m.is_ncg) teamsMap[sName].ncgCount++;
    });

    return Object.values(teamsMap)
      .map(t => ({
        ...t,
        avgScore: t.count > 0 ? (t.totalScore / t.count).toFixed(1) : null
      }))
      .sort((a, b) => {
        if (a.avgScore === null) return 1;
        if (b.avgScore === null) return -1;
        return Number(b.avgScore) - Number(a.avgScore);
      });
  }, [effectiveMonitorings, effectiveOperators, supervisors]);

  // 5. Médias dos Operadores com Filtro de Melhores / Piores
  const operatorRankings = useMemo(() => {
    const opsMap = {};

    // Inicializar operadores da base
    effectiveOperators.forEach(o => {
      opsMap[o.id] = {
        id: o.id,
        name: o.name,
        matricula: o.matricula || 'S/M',
        supervisor_name: o.supervisor_name || 'Geral',
        supervisor_id: o.supervisor_id,
        status_feedback: o.status_feedback || 'Liberado',
        active: o.active,
        scores: [],
        lastDate: null
      };
    });

    effectiveMonitorings.forEach(m => {
      const opId = m.operator_id;
      if (opsMap[opId]) {
        opsMap[opId].scores.push(Number(m.score) || 0);
        if (!opsMap[opId].lastDate || new Date(m.monitoring_date) > new Date(opsMap[opId].lastDate)) {
          opsMap[opId].lastDate = m.monitoring_date;
        }
      }
    });

    // Filtrar operadores com pelo menos 1 monitoria para cálculo de média
    let list = Object.values(opsMap).filter(o => o.scores.length > 0);

    // Filtrar por equipe/supervisor se selecionado
    if (selectedTeamFilter !== 'all') {
      list = list.filter(o => o.supervisor_name === selectedTeamFilter || o.supervisor_id === selectedTeamFilter);
    }

    // Filtrar por busca (nome ou matrícula)
    if (operatorSearch.trim() !== '') {
      const q = operatorSearch.toLowerCase().trim();
      list = list.filter(o => 
        o.name.toLowerCase().includes(q) || 
        String(o.matricula).toLowerCase().includes(q)
      );
    }

    // Calcular média e ordenar
    const calculated = list.map(o => {
      const sum = o.scores.reduce((a, b) => a + b, 0);
      const avg = sum / o.scores.length;
      return {
        ...o,
        count: o.scores.length,
        average: avg,
        averageFormatted: avg.toFixed(1)
      };
    });

    if (operatorSortOrder === 'best') {
      calculated.sort((a, b) => b.average - a.average || b.count - a.count);
    } else {
      calculated.sort((a, b) => a.average - b.average || b.count - a.count);
    }

    return calculated;
  }, [effectiveOperators, effectiveMonitorings, selectedTeamFilter, operatorSearch, operatorSortOrder]);

  // Estilos de Score
  const getScoreBadgeClass = (score) => {
    const val = Number(score);
    if (val >= 90) return 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/40';
    if (val >= 80) return 'text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-900/40';
    return 'text-rose-700 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-400 border-rose-200 dark:border-rose-900/40';
  };

  // Cores de Gráficos ECharts
  const textColor = darkMode ? '#e4e4e7' : '#09090b';
  const labelColor = darkMode ? '#a1a1aa' : '#71717a';
  const borderColor = darkMode ? '#1e1e24' : '#e4e4e7';
  const bgTooltip = darkMode ? '#0c0c0f' : '#ffffff';
  const chartColors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1"];

  // Gráficos Básicos ECharts
  const chartMonitoringsByDay = useMemo(() => {
    const datesMap = {};
    monitorings.forEach(m => {
      if (!m.monitoring_date) return;
      const date = m.monitoring_date.split('T')[0];
      datesMap[date] = (datesMap[date] || 0) + 1;
    });

    const sortedDates = Object.keys(datesMap).sort().slice(-10);
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

  return (
    <div className="space-y-6">
      
      {/* 1. CARDS DE KPI PRINCIPAIS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-[#0c0c0f] p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center justify-between">
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Operadores Ativos</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-zinc-950 dark:text-zinc-50 tracking-tight">{kpis.activeOps}</span>
              <span className="text-xs text-zinc-400">de {kpis.totalOps} totais</span>
            </div>
          </div>
          <div className="p-3 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-[#0c0c0f] p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center justify-between">
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Monitorias Hoje</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-zinc-950 dark:text-zinc-50 tracking-tight">{kpis.monitoringsToday}</span>
              <span className="text-xs text-zinc-400">meta: {kpis.metaDia}</span>
            </div>
            <div className="mt-1">
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                kpis.pctMeta >= 100 
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' 
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
              }`}>
                {kpis.pctMeta}% da meta
              </span>
            </div>
          </div>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-xl">
            <CheckSquare className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-[#0c0c0f] p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center justify-between">
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Auditorias Hoje</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-zinc-950 dark:text-zinc-50 tracking-tight">{kpis.auditsToday}</span>
              <span className="text-xs text-zinc-400">meta: {kpis.metaAuditDia}</span>
            </div>
            <div className="mt-1">
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                kpis.pctAuditMeta >= 100 
                  ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' 
                  : 'bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300'
              }`}>
                {kpis.pctAuditMeta}% da meta
              </span>
            </div>
          </div>
          <div className="p-3 bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400 rounded-xl">
            <Sparkles className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-[#0c0c0f] p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center justify-between">
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Feedbacks Pendentes</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-zinc-950 dark:text-zinc-50 tracking-tight">{kpis.pendingFeedbacks}</span>
              <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">bloqueando</span>
            </div>
          </div>
          <div className="p-3 bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 rounded-xl">
            <AlertCircle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-[#0c0c0f] p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center justify-between">
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Cobertura do Ciclo</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-zinc-950 dark:text-zinc-50 tracking-tight">{kpis.coberturaCiclo}%</span>
              <span className="text-xs text-zinc-400">Ciclo {activeCycle?.cycle_number || 1}</span>
            </div>
          </div>
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <Target className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 2. DESTAQUE: REALIZADAS HOJE POR MONITORA */}
      <div className="bg-white dark:bg-[#0c0c0f] rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800/80 pb-4">
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              {todayViewType === 'monitorings' ? 'Monitorias Realizadas Hoje' : 'Auditorias Realizadas Hoje'} (
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })})
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              {todayViewType === 'monitorings' 
                ? 'Acompanhamento em tempo real da produtividade diária de monitorias por monitor(a)'
                : 'Acompanhamento em tempo real da realização de auditorias diárias de desenvolvimento'}
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {/* Seletor de Tipo */}
            <div className="flex items-center bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-bold">
              <button
                onClick={() => setTodayViewType('monitorings')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  todayViewType === 'monitorings'
                    ? 'bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-sm font-extrabold'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                }`}
              >
                <CheckSquare className="w-3.5 h-3.5" />
                Monitorias ({kpis.monitoringsToday})
              </button>
              <button
                onClick={() => setTodayViewType('audits')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  todayViewType === 'audits'
                    ? 'bg-white dark:bg-zinc-800 text-purple-600 dark:text-purple-400 shadow-sm font-extrabold'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                Auditorias ({kpis.auditsToday})
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {todayViewType === 'monitorings' ? (
            todayBreakdownByMonitor.length === 0 ? (
              <div className="col-span-full py-8 text-center text-zinc-400 text-xs italic">
                Nenhuma monitoria registrada até o momento no dia de hoje.
              </div>
            ) : (
              todayBreakdownByMonitor.map((mon, idx) => {
                const pct = mon.target > 0 ? Math.min(100, Math.round((mon.count / mon.target) * 100)) : 0;
                const isGoalDone = mon.count >= mon.target;
                return (
                  <div 
                    key={idx}
                    className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/20 hover:border-blue-300 dark:hover:border-blue-800 transition-all space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-sm">
                          {mon.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 line-clamp-1">{mon.name}</h4>
                          <span className="text-[10px] text-zinc-400">Meta: {mon.target}/dia</span>
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isGoalDone 
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400'
                          : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                      }`}>
                        {isGoalDone ? 'Meta OK' : `${pct}%`}
                      </span>
                    </div>

                    <div>
                      <div className="flex justify-between items-baseline mb-1">
                        <span className="text-2xl font-black text-zinc-900 dark:text-zinc-50">{mon.count}</span>
                        <span className="text-[11px] text-zinc-500 font-medium">de {mon.target} avaliações</span>
                      </div>
                      <div className="w-full bg-zinc-200 dark:bg-zinc-800 rounded-full h-2 overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            isGoalDone ? 'bg-emerald-500' : pct >= 50 ? 'bg-blue-500' : 'bg-amber-500'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            )
          ) : (
            todayAuditsBreakdownByMonitor.length === 0 ? (
              <div className="col-span-full py-8 text-center text-zinc-400 text-xs italic">
                Nenhuma auditoria registrada até o momento no dia de hoje.
              </div>
            ) : (
              todayAuditsBreakdownByMonitor.map((mon, idx) => {
                const pct = mon.target > 0 ? Math.min(100, Math.round((mon.count / mon.target) * 100)) : 0;
                const isGoalDone = mon.count >= mon.target;
                return (
                  <div 
                    key={idx}
                    className="p-4 rounded-xl border border-purple-200 dark:border-purple-900/40 bg-purple-50/20 dark:bg-purple-950/10 hover:border-purple-400 dark:hover:border-purple-700 transition-all space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-purple-600 text-white font-bold text-xs flex items-center justify-center shadow-sm">
                          {mon.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 line-clamp-1">{mon.name}</h4>
                          <span className="text-[10px] text-purple-600 dark:text-purple-400 font-medium">Meta: {mon.target}/dia</span>
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isGoalDone 
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400'
                          : 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300'
                      }`}>
                        {isGoalDone ? 'Meta OK' : `${pct}%`}
                      </span>
                    </div>

                    <div>
                      <div className="flex justify-between items-baseline mb-1">
                        <span className="text-2xl font-black text-zinc-900 dark:text-zinc-50">{mon.count}</span>
                        <span className="text-[11px] text-zinc-500 font-medium">de {mon.target} auditorias</span>
                      </div>
                      <div className="w-full bg-zinc-200 dark:bg-zinc-800 rounded-full h-2 overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            isGoalDone ? 'bg-emerald-500' : pct >= 50 ? 'bg-purple-500' : 'bg-amber-500'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            )
          )}
        </div>
      </div>

      {/* 3. RANKING DE MONITORIAS / AUDITORIAS POR MONITORA */}
      <div className="bg-white dark:bg-[#0c0c0f] rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800/80 pb-4">
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              {rankingCategory === 'monitorings' 
                ? 'Ranking de Monitorias por Monitor(a) & Metas Estipuladas'
                : 'Ranking de Auditorias por Monitor(a) & Metas Estipuladas'}
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              {rankingCategory === 'monitorings'
                ? 'Classificação por volumetria, atingimento de metas operacionais e média de notas'
                : 'Classificação por quantidade de auditorias realizadas, atingimento de metas e tópicos'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Seletor Categoria de Ranking */}
            <div className="flex items-center bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-bold">
              <button
                onClick={() => setRankingCategory('monitorings')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  rankingCategory === 'monitorings'
                    ? 'bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-sm font-extrabold'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                }`}
              >
                <CheckSquare className="w-3.5 h-3.5" />
                Monitorias
              </button>
              <button
                onClick={() => setRankingCategory('audits')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  rankingCategory === 'audits'
                    ? 'bg-white dark:bg-zinc-800 text-purple-600 dark:text-purple-400 shadow-sm font-extrabold'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                Auditorias
              </button>
            </div>

            {/* Abas de Filtro de Período */}
            <div className="flex items-center bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-bold">
              <button
                onClick={() => rankingCategory === 'monitorings' ? setMonitorPeriod('day') : setAuditPeriod('day')}
                className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                  (rankingCategory === 'monitorings' ? monitorPeriod : auditPeriod) === 'day'
                    ? 'bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-sm font-extrabold'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                }`}
              >
                Hoje (Dia)
              </button>
              <button
                onClick={() => rankingCategory === 'monitorings' ? setMonitorPeriod('week') : setAuditPeriod('week')}
                className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                  (rankingCategory === 'monitorings' ? monitorPeriod : auditPeriod) === 'week'
                    ? 'bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-sm font-extrabold'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                }`}
              >
                Esta Semana (7d)
              </button>
              <button
                onClick={() => rankingCategory === 'monitorings' ? setMonitorPeriod('month') : setAuditPeriod('month')}
                className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                  (rankingCategory === 'monitorings' ? monitorPeriod : auditPeriod) === 'month'
                    ? 'bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-sm font-extrabold'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                }`}
              >
                Este Mês
              </button>
            </div>
          </div>
        </div>

        {/* Tabela do Ranking */}
        <div className="overflow-x-auto">
          {rankingCategory === 'monitorings' ? (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-400 uppercase font-semibold tracking-wider">
                  <th className="py-3 px-4 text-center w-14">Rank</th>
                  <th className="py-3 px-4">Monitor(a)</th>
                  <th className="py-3 px-4 text-center">Realizadas</th>
                  <th className="py-3 px-4 text-center">Meta do Período</th>
                  <th className="py-3 px-4">Progresso da Meta</th>
                  <th className="py-3 px-4 text-center">Média Aplicada</th>
                  <th className="py-3 px-4 text-center">NCGs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                {monitorRanking.map((mon, idx) => {
                  const isFirst = idx === 0 && mon.count > 0;
                  const isSecond = idx === 1 && mon.count > 0;
                  const isThird = idx === 2 && mon.count > 0;

                  return (
                    <tr 
                      key={mon.id}
                      className={`hover:bg-zinc-50/70 dark:hover:bg-zinc-900/30 transition-colors ${
                        isFirst ? 'bg-amber-50/30 dark:bg-amber-950/10' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {isFirst ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-400 text-amber-950 font-black shadow-sm">
                            1º
                          </span>
                        ) : isSecond ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-zinc-300 text-zinc-900 font-black">
                            2º
                          </span>
                        ) : isThird ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-700/60 text-amber-100 font-black">
                            3º
                          </span>
                        ) : (
                          <span className="text-zinc-500 font-bold">{idx + 1}º</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-bold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {isFirst && <Trophy className="w-4 h-4 text-amber-500" />}
                          <span>{mon.name}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center font-black text-sm text-zinc-950 dark:text-zinc-50">
                        {mon.count}
                      </td>

                      <td className="py-3.5 px-4 text-center text-zinc-500 font-semibold">
                        {mon.target}
                      </td>

                      <td className="py-3.5 px-4 min-w-[180px]">
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px] font-bold">
                            <span className={mon.pctAccomplished >= 100 ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-600 dark:text-zinc-400'}>
                              {mon.pctAccomplished}% atingido
                            </span>
                            <span className="text-zinc-400 text-[10px]">{mon.count}/{mon.target}</span>
                          </div>
                          <div className="w-full bg-zinc-200 dark:bg-zinc-800 rounded-full h-2 overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${
                                mon.pctAccomplished >= 100 ? 'bg-emerald-500' : mon.pctAccomplished >= 75 ? 'bg-blue-500' : 'bg-amber-500'
                              }`}
                              style={{ width: `${Math.min(100, mon.pctAccomplished)}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className={`px-2.5 py-1 rounded-lg font-extrabold text-xs border ${getScoreBadgeClass(mon.avgScore)}`}>
                          {mon.avgScore}%
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {mon.ncgCount > 0 ? (
                          <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400">
                            {mon.ncgCount} NCG
                          </span>
                        ) : (
                          <span className="text-zinc-400">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-400 uppercase font-semibold tracking-wider">
                  <th className="py-3 px-4 text-center w-14">Rank</th>
                  <th className="py-3 px-4">Monitor(a) / Auditor(a)</th>
                  <th className="py-3 px-4 text-center">Auditorias Realizadas</th>
                  <th className="py-3 px-4 text-center">Meta do Período</th>
                  <th className="py-3 px-4">Progresso da Meta</th>
                  <th className="py-3 px-4 text-center">Foco Principal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                {auditRanking.map((mon, idx) => {
                  const isFirst = idx === 0 && mon.count > 0;
                  const isSecond = idx === 1 && mon.count > 0;
                  const isThird = idx === 2 && mon.count > 0;

                  return (
                    <tr 
                      key={mon.id}
                      className={`hover:bg-zinc-50/70 dark:hover:bg-zinc-900/30 transition-colors ${
                        isFirst ? 'bg-purple-50/30 dark:bg-purple-950/10' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {isFirst ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-purple-500 text-white font-black shadow-sm">
                            1º
                          </span>
                        ) : isSecond ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-zinc-300 text-zinc-900 font-black">
                            2º
                          </span>
                        ) : isThird ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-700/60 text-amber-100 font-black">
                            3º
                          </span>
                        ) : (
                          <span className="text-zinc-500 font-bold">{idx + 1}º</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-bold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {isFirst && <Sparkles className="w-4 h-4 text-purple-500" />}
                          <span>{mon.name}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center font-black text-sm text-zinc-950 dark:text-zinc-50">
                        {mon.count}
                      </td>

                      <td className="py-3.5 px-4 text-center text-zinc-500 font-semibold">
                        {mon.target}
                      </td>

                      <td className="py-3.5 px-4 min-w-[180px]">
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px] font-bold">
                            <span className={mon.pctAccomplished >= 100 ? 'text-emerald-600 dark:text-emerald-400' : 'text-purple-600 dark:text-purple-400'}>
                              {mon.pctAccomplished}% atingido
                            </span>
                            <span className="text-zinc-400 text-[10px]">{mon.count}/{mon.target}</span>
                          </div>
                          <div className="w-full bg-zinc-200 dark:bg-zinc-800 rounded-full h-2 overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${
                                mon.pctAccomplished >= 100 ? 'bg-emerald-500' : mon.pctAccomplished >= 75 ? 'bg-purple-500' : 'bg-amber-500'
                              }`}
                              style={{ width: `${Math.min(100, mon.pctAccomplished)}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2.5 py-1 rounded-full font-bold text-[10px] bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                          {mon.topTopic}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* 4. MÉDIA DA NOTA DE MONITORIA DE CADA EQUIPE (SUPERVISOR) */}
      <div className="bg-white dark:bg-[#0c0c0f] rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm space-y-4">
        <div className="border-b border-zinc-100 dark:border-zinc-800/80 pb-4">
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider flex items-center gap-2">
            <Award className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            Média da Nota de Monitoria por Equipe (Supervisor)
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Desempenho qualitativo médio consolidado de cada supervisão na operação
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {teamAverages.map((team, idx) => {
            const hasData = team.avgScore !== null;
            return (
              <div 
                key={idx}
                className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/40 dark:bg-zinc-900/10 hover:border-purple-300 dark:hover:border-purple-800/60 transition-all space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 line-clamp-1">{team.supervisorName}</h4>
                    <span className="text-[10px] text-zinc-400">{team.activeOperators} operadores ativos</span>
                  </div>
                  {hasData && (
                    <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] border ${getScoreBadgeClass(team.avgScore)}`}>
                      {Number(team.avgScore) >= 90 ? 'Excelente' : Number(team.avgScore) >= 80 ? 'Regular' : 'Atenção'}
                    </span>
                  )}
                </div>

                <div className="pt-1 flex items-baseline justify-between">
                  <div>
                    <span className="text-2xl font-black text-zinc-950 dark:text-zinc-50">
                      {hasData ? `${team.avgScore}%` : 'Sem notas'}
                    </span>
                    <span className="block text-[10px] text-zinc-400 uppercase font-semibold">Média Geral da Equipe</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{team.count}</span>
                    <span className="block text-[10px] text-zinc-400">avaliações</span>
                  </div>
                </div>

                {team.ncgCount > 0 && (
                  <div className="pt-1 border-t border-zinc-100 dark:border-zinc-800/60">
                    <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400">
                      {team.ncgCount} Não Conformidade(s) Grave(s)
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. RANKING DE OPERADORES: MELHORES E PIORES MÉDIAS (INTERATIVO COM FILTROS) */}
      <div className="bg-white dark:bg-[#0c0c0f] rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800/80 pb-4">
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider flex items-center gap-2">
              <ArrowUpDown className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Classificação de Operadores por Média de Nota
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Analise os operadores de maior destaque ou identifique quem necessita de reciclagem e reforço de feedback
            </p>
          </div>

          {/* Alternador Melhores vs Piores Médias */}
          <div className="flex items-center gap-2 self-start md:self-auto">
            <div className="flex bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-bold">
              <button
                onClick={() => setOperatorSortOrder('best')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  operatorSortOrder === 'best'
                    ? 'bg-emerald-600 text-white shadow-sm font-extrabold'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                Melhores Médias (Top Desempenho)
              </button>
              <button
                onClick={() => setOperatorSortOrder('worst')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  operatorSortOrder === 'worst'
                    ? 'bg-rose-600 text-white shadow-sm font-extrabold'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                }`}
              >
                <TrendingDown className="w-3.5 h-3.5" />
                Piores Médias (Atenção / Reciclagem)
              </button>
            </div>
          </div>
        </div>

        {/* Filtros de Equipe e Busca por Operador */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Buscar colaborador por nome ou matrícula..."
              value={operatorSearch}
              onChange={(e) => setOperatorSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="w-full sm:w-64">
            <select
              value={selectedTeamFilter}
              onChange={(e) => setSelectedTeamFilter(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="all">Todas as Equipes (Supervisões)</option>
              {supervisors.map(s => (
                <option key={s.id} value={s.name}>Equipe: {s.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Tabela de Operadores */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-400 uppercase font-semibold tracking-wider">
                <th className="py-3 px-4 text-center w-14">Posição</th>
                <th className="py-3 px-4">Operador(a)</th>
                <th className="py-3 px-4">Matrícula</th>
                <th className="py-3 px-4">Supervisor(a)</th>
                <th className="py-3 px-4 text-center">Média Geral</th>
                <th className="py-3 px-4 text-center">Monitorias</th>
                <th className="py-3 px-4 text-center">Status Feedback</th>
                <th className="py-3 px-4 text-right">Última Avaliação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {operatorRankings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-zinc-400 text-xs italic">
                    Nenhum operador encontrado com avaliações para os critérios selecionados.
                  </td>
                </tr>
              ) : (
                operatorRankings.slice(0, 30).map((op, idx) => {
                  return (
                    <tr 
                      key={op.id}
                      className="hover:bg-zinc-50/70 dark:hover:bg-zinc-900/30 transition-colors"
                    >
                      <td className="py-3 px-4 text-center font-bold text-zinc-500">
                        {idx + 1}º
                      </td>
                      <td className="py-3 px-4 font-bold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                        {op.name}
                      </td>
                      <td className="py-3 px-4 text-zinc-500 font-mono text-[11px]">
                        {op.matricula}
                      </td>
                      <td className="py-3 px-4 text-zinc-600 dark:text-zinc-300">
                        {op.supervisor_name}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-3 py-1 rounded-lg font-black text-xs border ${getScoreBadgeClass(op.averageFormatted)}`}>
                          {op.averageFormatted}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-semibold text-zinc-700 dark:text-zinc-300">
                        {op.count}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          op.status_feedback === 'Liberado'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400'
                        }`}>
                          {op.status_feedback}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-zinc-500 font-medium">
                        {op.lastDate ? new Date(op.lastDate).toLocaleDateString('pt-BR') : '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          {operatorRankings.length > 30 && (
            <div className="pt-3 text-center text-zinc-400 text-xs">
              Mostrando os 30 primeiros registros de {operatorRankings.length} operadores avaliados.
            </div>
          )}
        </div>
      </div>

      {/* 6. GRÁFICOS ANALÍTICOS GERAIS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-[#0c0c0f] p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 mb-4 uppercase tracking-wider">
            Evolução de Monitorias por Dia
          </h3>
          <ReactECharts option={chartMonitoringsByDay} style={{ height: '300px' }} theme={darkMode ? 'dark' : ''} />
        </div>

        <div className="bg-white dark:bg-[#0c0c0f] p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 mb-4 uppercase tracking-wider">
            Volume de Monitorias por Equipe / Supervisor
          </h3>
          <ReactECharts option={chartMonitoringsBySupervisor} style={{ height: '300px' }} />
        </div>
      </div>

    </div>
  );
}
