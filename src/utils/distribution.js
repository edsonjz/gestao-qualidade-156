// Algoritmo de Distribuição Inteligente de Fila

export function getTurnFromSchedule(schedule) {
  if (!schedule) return 'Manhã';
  const match = schedule.match(/^(\d{2}):(\d{2})/);
  if (!match) return 'Manhã';
  const hour = parseInt(match[1], 10);
  if (hour >= 0 && hour < 6) return 'Madrugada';
  if (hour >= 6 && hour < 12) return 'Manhã';
  if (hour >= 12 && hour < 18) return 'Tarde';
  return 'Noite';
}

export function calculateCoverageStats(operators, monitorings, activeCycleId) {
  const activeOperators = operators.filter(o => o.active);
  const cycleMonitorings = monitorings.filter(m => m.cycle_id === activeCycleId);
  
  // Mapear quantos monitoramentos cada operador tem no ciclo ativo
  const opCycleCountMap = {};
  activeOperators.forEach(o => {
    opCycleCountMap[o.id] = cycleMonitorings.filter(m => m.operator_id === o.id).length;
  });

  // Agrupamentos por Turno, Supervisor, Skill e Escala
  const groups = {
    turn: {},
    supervisor: {},
    skill: {},
    escala: {}
  };

  const initGroup = (type, key) => {
    if (!groups[type][key]) {
      groups[type][key] = { total: 0, monitored: 0 };
    }
  };

  activeOperators.forEach(o => {
    const turn = getTurnFromSchedule(o.schedule);
    const superv = o.supervisor_name || 'Sem Supervisor';
    const skill = o.skill || 'Sem Skill';
    const escala = o.escala || 'Outra';

    initGroup('turn', turn);
    initGroup('supervisor', superv);
    initGroup('skill', skill);
    initGroup('escala', escala);

    groups.turn[turn].total++;
    groups.supervisor[superv].total++;
    groups.skill[skill].total++;
    groups.escala[escala].total++;

    if (opCycleCountMap[o.id] > 0) {
      groups.turn[turn].monitored++;
      groups.supervisor[superv].monitored++;
      groups.skill[skill].monitored++;
      groups.escala[escala].monitored++;
    }
  });

  // Calcular cobertura para cada grupo
  const getCoverage = (type, key) => {
    const g = groups[type][key];
    if (!g || g.total === 0) return 1.0;
    return g.monitored / g.total;
  };

  return {
    opCycleCountMap,
    getCoverageScore: (op) => {
      const turn = getTurnFromSchedule(op.schedule);
      const superv = op.supervisor_name || 'Sem Supervisor';
      const skill = op.skill || 'Sem Skill';
      const escala = op.escala || 'Outra';

      const turnCov = getCoverage('turn', turn);
      const supervCov = getCoverage('supervisor', superv);
      const skillCov = getCoverage('skill', skill);
      const escalaCov = getCoverage('escala', escala);

      // Média ponderada da cobertura. Pesos: Turno (40%), Supervisor (30%), Skill (20%), Escala (10%)
      return (turnCov * 0.4) + (supervCov * 0.3) + (skillCov * 0.2) + (escalaCov * 0.1);
    },
    groups
  };
}

export function sortSmartQueue(operators, monitorings, activeCycleId) {
  const eligible = operators.filter(o => o.active && o.status_feedback === 'Liberado');
  const stats = calculateCoverageStats(operators, monitorings, activeCycleId);
  const now = new Date();

  return eligible.map(op => {
    const cycleCount = stats.opCycleCountMap[op.id] || 0;
    const groupScore = stats.getCoverageScore(op);
    
    // Calcular dias sem monitoração
    let daysWithoutMonitoring = 999; // infinito se nunca monitorado
    if (op.last_monitoring_at) {
      const diffTime = Math.abs(now - new Date(op.last_monitoring_at));
      daysWithoutMonitoring = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    return {
      ...op,
      cycleCount,
      groupScore,
      daysWithoutMonitoring
    };
  }).sort((a, b) => {
    // 1ª Prioridade: Nunca monitorados no ciclo atual (cycleCount = 0 vai primeiro)
    const aNever = a.cycleCount === 0 ? 0 : 1;
    const bNever = b.cycleCount === 0 ? 0 : 1;
    if (aNever !== bNever) return aNever - bNever;

    // 2ª Prioridade: Menor quantidade de monitorias no ciclo
    if (a.cycleCount !== b.cycleCount) {
      return a.cycleCount - b.cycleCount;
    }

    // 3ª Prioridade: Balanceamento de Grupos (menor cobertura acumulada vai primeiro)
    if (Math.abs(a.groupScore - b.groupScore) > 0.01) {
      return a.groupScore - b.groupScore;
    }

    // 4ª Prioridade: Há mais tempo sem monitoria (dias sem monitoria desc)
    if (a.daysWithoutMonitoring !== b.daysWithoutMonitoring) {
      return b.daysWithoutMonitoring - a.daysWithoutMonitoring;
    }

    // Desempate por nome
    return a.name.localeCompare(b.name);
  });
}

// Índice de Justiça da Cobertura (IJC) - 0 a 100%
export function calculateFairnessIndex(groups) {
  const coverages = [];
  
  // Agregar todas as taxas de cobertura calculadas para os grupos
  Object.keys(groups).forEach(type => {
    Object.keys(groups[type]).forEach(key => {
      const g = groups[type][key];
      if (g.total > 0) {
        coverages.push(g.monitored / g.total);
      }
    });
  });

  if (coverages.length === 0) return 100;

  // Calcular média das coberturas
  const mean = coverages.reduce((sum, val) => sum + val, 0) / coverages.length;
  if (mean === 0) return 100; // Se tudo for zero, tecnicamente está balanceado no zero

  // Calcular desvio padrão
  const sqDiffs = coverages.map(val => Math.pow(val - mean, 2));
  const variance = sqDiffs.reduce((sum, val) => sum + val, 0) / coverages.length;
  const stdDev = Math.sqrt(variance);

  // Coeficiente de Variação (CV)
  const cv = stdDev / mean;

  // O IJC é inversamente proporcional ao coeficiente de variação.
  // CV = 0 significa perfeito equilíbrio (100% de justiça).
  // Clampar o resultado entre 0 e 100
  const index = Math.max(0, Math.min(100, 100 * (1 - cv)));
  return Math.round(index);
}
