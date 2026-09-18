/**
 * Motor de Diagnóstico Cruzado (Monitorias + Auditorias) e Gerador de PDI
 * Analisa indicadores quantitativos (notas, checklist, NCGs) e qualitativos (auditorias formativas)
 */

export const TRAINING_CATALOG = [
  {
    id: 'trn-postura',
    title: 'Excelência no Atendimento ao Cidadão e Empatia Ativa',
    category: 'Postura & Empatia',
    duration: '4 horas',
    description: 'Técnicas de escuta ativa, cordialidade natural, controle emocional e acolhimento das demandas do munícipe no 156.'
  },
  {
    id: 'trn-procedimentos',
    title: 'Reciclagem de Procedimentos e Catálogo de Serviços 156',
    category: 'Procedimentos 156',
    duration: '6 horas',
    description: 'Imersão nos serviços mais demandados (DMLU, Conservação de Vias, Iluminação Pública, SMED e Saúde) e regras de encaminhamento.'
  },
  {
    id: 'trn-comunicacao',
    title: 'Comunicação Assertiva, Clareza e Linguagem Cidadã',
    category: 'Comunicação & Clareza',
    duration: '4 horas',
    description: 'Eliminação de jargões internos, técnicas de dicção, clareza na informação e confirmação do entendimento pelo munícipe.'
  },
  {
    id: 'trn-sistemas',
    title: 'Agilidade Operacional e Navegação Avançada nos Sistemas 156',
    category: 'Agilidade & Sistemas',
    duration: '3 horas',
    description: 'Atalhos, preenchimento ágil de protocolos, busca otimizada no SIGA/CRM e precisão no georreferenciamento de chamados.'
  },
  {
    id: 'trn-conflito',
    title: 'Gerenciamento de Munícipes Exaltados e Situações Críticas',
    category: 'Postura & Empatia',
    duration: '4 horas',
    description: 'Desescalada de conflitos, postura neutra e empática, condução segura da ligação sem confronto e preservação da qualidade.'
  },
  {
    id: 'trn-qualidade-ncg',
    title: 'Prevenção de Não Conformidades Graves (NCG) e Atenção aos Detalhes',
    category: 'Conformidade Operacional',
    duration: '3 horas',
    description: 'Identificação de pontos eliminatórios, integridade de dados obrigatórios, confirmação de protocolo e compromisso com o cidadão.'
  }
];

/**
 * Realiza a análise diagnóstica cruzada de um operador
 */
export function analyzeOperatorData(operator, monitorings = [], audits = []) {
  const opMonitorings = monitorings
    .filter(m => m.operator_id === operator.id)
    .sort((a, b) => new Date(a.monitoring_date) - new Date(b.monitoring_date));

  const opAudits = audits
    .filter(a => a.operator_id === operator.id)
    .sort((a, b) => new Date(a.audit_date) - new Date(b.audit_date));

  const totalMonitorings = opMonitorings.length;
  const totalAudits = opAudits.length;

  const scores = opMonitorings.map(m => Number(m.score) || 0);
  const avgScore = totalMonitorings > 0
    ? Math.round((scores.reduce((sum, v) => sum + v, 0) / totalMonitorings) * 10) / 10
    : 0;

  const ncgCount = opMonitorings.filter(m => m.is_ncg).length;

  // Tendência recente (compara últimas monitorias com o histórico)
  let trend = 'Estável';
  if (totalMonitorings >= 3) {
    const recent = scores.slice(-2);
    const older = scores.slice(0, -2);
    const recentAvg = recent.reduce((s, v) => s + v, 0) / recent.length;
    const olderAvg = older.reduce((s, v) => s + v, 0) / older.length;
    if (recentAvg - olderAvg >= 5) trend = 'Evoluindo';
    else if (olderAvg - recentAvg >= 5) trend = 'Queda';
  }

  // Análise de perda por itens de checklist nas monitorias
  const checklistDeficits = {};
  opMonitorings.forEach(m => {
    if (Array.isArray(m.checklist)) {
      m.checklist.forEach(item => {
        const label = item.label || 'Critério';
        if (!checklistDeficits[label]) {
          checklistDeficits[label] = { label, totalEvaluated: 0, failedCount: 0, naCount: 0 };
        }
        checklistDeficits[label].totalEvaluated++;
        if (item.value === false || item.value === 'NAO' || item.value === 0) {
          checklistDeficits[label].failedCount++;
        }
      });
    }
  });

  // Análise qualitativa de auditorias (temas, pontos fortes e melhorias)
  const auditTopicsCount = {};
  const strengthsCollected = [];
  const improvementsCollected = [];

  opAudits.forEach(a => {
    if (a.topic) {
      auditTopicsCount[a.topic] = (auditTopicsCount[a.topic] || 0) + 1;
    }
    if (a.strengths && a.strengths.trim()) {
      strengthsCollected.push({
        text: a.strengths.trim(),
        auditor: a.auditor_name,
        date: a.audit_date,
        topic: a.topic
      });
    }
    if (a.improvements && a.improvements.trim()) {
      improvementsCollected.push({
        text: a.improvements.trim(),
        auditor: a.auditor_name,
        date: a.audit_date,
        topic: a.topic
      });
    }
  });

  // Cálculo das 5 Competências Operacionais (Base 100)
  // Iniciam em 85 (se não houver dados) ou ponderadas pela média
  const baseScore = totalMonitorings > 0 ? avgScore : 85;

  let compPostura = baseScore;
  let compProcedimentos = baseScore;
  let compComunicacao = baseScore;
  let compSistemas = baseScore;
  let compConformidade = baseScore;

  // Ajustes baseados em itens de checklist com falha
  Object.values(checklistDeficits).forEach(item => {
    if (item.totalEvaluated > 0) {
      const failRate = item.failedCount / item.totalEvaluated;
      const lower = item.label.toLowerCase();
      const penalty = failRate * 25;

      if (lower.includes('cordial') || lower.includes('postura') || lower.includes('empatia')) {
        compPostura -= penalty;
      }
      if (lower.includes('procedimento') || lower.includes('regra') || lower.includes('serviço')) {
        compProcedimentos -= penalty;
      }
      if (lower.includes('comunicação') || lower.includes('clareza') || lower.includes('dicção')) {
        compComunicacao -= penalty;
      }
      if (lower.includes('sistema') || lower.includes('navega') || lower.includes('tempo') || lower.includes('agil')) {
        compSistemas -= penalty;
      }
      if (lower.includes('protocolo') || lower.includes('confirma') || lower.includes('registro') || lower.includes('dado')) {
        compConformidade -= penalty;
      }
    }
  });

  // Penalidade de NCG na Conformidade
  if (ncgCount > 0) {
    compConformidade -= (ncgCount * 20);
  }

  // Ajustes qualitativos das auditorias
  opAudits.forEach(a => {
    const t = (a.topic || '').toLowerCase();
    const hasImp = a.improvements && a.improvements.trim().length > 0;
    const hasStr = a.strengths && a.strengths.trim().length > 0;
    const delta = (hasStr ? 3 : 0) - (hasImp ? 5 : 0);

    if (t.includes('postura') || t.includes('atendimento')) compPostura += delta;
    if (t.includes('procedimento') || t.includes('156')) compProcedimentos += delta;
    if (t.includes('comunicação') || t.includes('clareza')) compComunicacao += delta;
    if (t.includes('sistema') || t.includes('navega')) compSistemas += delta;
  });

  // Normalização entre 30 e 100
  const clamp = (val) => Math.max(30, Math.min(100, Math.round(val)));
  const competencies = {
    postura: clamp(compPostura),
    procedimentos: clamp(compProcedimentos),
    comunicacao: clamp(compComunicacao),
    sistemas: clamp(compSistemas),
    conformidade: clamp(compConformidade)
  };

  // Nível de Maturidade
  let maturityLevel = 'Consistente';
  let maturityColor = 'blue';

  if (totalMonitorings === 0 && totalAudits === 0) {
    maturityLevel = 'Sem Avaliações';
    maturityColor = 'zinc';
  } else if (ncgCount > 0 || avgScore < 80 || competencies.procedimentos < 60 || competencies.conformidade < 60) {
    maturityLevel = 'Crítico (Prioridade Alta)';
    maturityColor = 'rose';
  } else if (avgScore < 88 || trend === 'Queda' || Object.values(competencies).some(c => c < 75)) {
    maturityLevel = 'Atenção (Em Desenvolvimento)';
    maturityColor = 'amber';
  } else if (avgScore >= 95 && ncgCount === 0 && Object.values(competencies).every(c => c >= 88)) {
    maturityLevel = 'Alta Performance (Destaque)';
    maturityColor = 'emerald';
  }

  // Identificação do Arquétipo / Perfil
  let archetype = 'Perfil Operacional Equilibrado';
  let diagnosticSummary = '';

  if (competencies.postura >= 88 && competencies.procedimentos <= 70) {
    archetype = 'Perfil Relacional Forte, com Gaps em Regras 156';
    diagnosticSummary = 'O operador demonstra excelente cordialidade, acolhimento e empatia com o munícipe, porém apresenta insegurança ou falhas no enquadramento dos procedimentos e regras dos serviços municipais.';
  } else if (competencies.procedimentos >= 90 && competencies.postura <= 75) {
    archetype = 'Perfil Técnico Preciso, Precisa de Empatia e Escuta Ativa';
    diagnosticSummary = 'O operador possui ótimo domínio das regras e dos sistemas 156, mas tende a ser excessivamente direto ou burocrático, necessitando humanizar o atendimento e aprimorar a escuta ativa.';
  } else if (competencies.sistemas <= 65) {
    archetype = 'Dificuldade de Navegação e Agilidade em Sistemas';
    diagnosticSummary = 'Registra maior lentidão na abertura e encaminhamento de protocolos, perdendo fluidez durante o diálogo com o munícipe devido à busca em tela.';
  } else if (ncgCount > 0) {
    archetype = 'Risco de Não Conformidade Operacional';
    diagnosticSummary = 'Registrou Não Conformidade Grave (NCG) ou omissão de dados essenciais no protocolo. Exige alinhamento imediato sobre conformidade e confirmação obrigatória de dados.';
  } else if (maturityLevel.includes('Alta Performance')) {
    archetype = 'Multiplicador em Potencial / Referência Técnica';
    diagnosticSummary = 'Desempenho de excelência sustentado tanto nas monitorias quantitativas quanto nas auditorias de postura. Pode atuar como referência para novos operadores e apoio a reciclagens.';
  } else {
    diagnosticSummary = `Operador em acompanhamento regular com média de ${avgScore} pontos. Recomenda-se foco contínuo na sustentação dos padrões de qualidade e lapidação de pontos de melhoria apontados pela monitoria.`;
  }

  return {
    totalMonitorings,
    totalAudits,
    avgScore,
    ncgCount,
    trend,
    checklistDeficits: Object.values(checklistDeficits),
    auditTopicsCount,
    strengthsCollected,
    improvementsCollected,
    competencies,
    maturityLevel,
    maturityColor,
    archetype,
    diagnosticSummary
  };
}

/**
 * Gera a proposta completa de PDI (Diagnóstico, Treinamentos Recomendados e Metas SMART)
 */
export function generatePdiProposal(operator, monitorings = [], audits = []) {
  const analysis = analyzeOperatorData(operator, monitorings, audits);
  const { competencies, ncgCount, strengthsCollected, improvementsCollected } = analysis;

  // 1. Recomendar Treinamentos do catálogo com base nas menores competências
  const recommendedTrainings = [];

  if (competencies.postura < 80 || analysis.archetype.includes('Empatia')) {
    const t = TRAINING_CATALOG.find(c => c.id === 'trn-postura');
    if (t) recommendedTrainings.push({ ...t, status: 'Pendente', priority: 'Alta', targetDate: getFutureDate(15) });
  }

  if (competencies.procedimentos < 80 || analysis.archetype.includes('Regras 156')) {
    const t = TRAINING_CATALOG.find(c => c.id === 'trn-procedimentos');
    if (t) recommendedTrainings.push({ ...t, status: 'Pendente', priority: 'Alta', targetDate: getFutureDate(15) });
  }

  if (competencies.comunicacao < 80) {
    const t = TRAINING_CATALOG.find(c => c.id === 'trn-comunicacao');
    if (t) recommendedTrainings.push({ ...t, status: 'Pendente', priority: 'Média', targetDate: getFutureDate(30) });
  }

  if (competencies.sistemas < 80 || analysis.archetype.includes('Sistemas')) {
    const t = TRAINING_CATALOG.find(c => c.id === 'trn-sistemas');
    if (t) recommendedTrainings.push({ ...t, status: 'Pendente', priority: 'Média', targetDate: getFutureDate(20) });
  }

  if (ncgCount > 0 || competencies.conformidade < 75) {
    const t = TRAINING_CATALOG.find(c => c.id === 'trn-qualidade-ncg');
    if (t) recommendedTrainings.push({ ...t, status: 'Pendente', priority: 'Urgente', targetDate: getFutureDate(7) });
  }

  // Se o operador for Alta Performance ou sem gaps críticos, sugerir treinamento de excelência
  if (recommendedTrainings.length === 0) {
    const t = TRAINING_CATALOG.find(c => c.id === 'trn-conflito');
    if (t) recommendedTrainings.push({ ...t, status: 'Pendente', priority: 'Baixa', targetDate: getFutureDate(45) });
  }

  // 2. Propor Metas e Ações Práticas (Estrutura 5W2H / SMART)
  const actionPlan = [];

  if (competencies.procedimentos < 85) {
    actionPlan.push({
      id: `act-${Date.now()}-1`,
      action: 'Revisar o catálogo de serviços do 156 e consultar base de conhecimento antes de despachar chamados complexos',
      objective: 'Eliminar falhas de enquadramento de serviços em DMLU e Vias Públicas',
      metric: 'Atingir nota ≥ 95 no critério Procedimentos nas próximas 3 monitorias',
      responsible: `${operator.name} (Operador) / Monitor`,
      deadline: getFutureDate(20),
      status: 'Em Andamento'
    });
  }

  if (competencies.postura < 85) {
    actionPlan.push({
      id: `act-${Date.now()}-2`,
      action: 'Praticar saudação padrão personalizada e confirmação ativa da necessidade do munícipe no fechamento',
      objective: 'Elevar percepção de cordialidade e empatia da ligação',
      metric: 'Zero apontamentos de rispidez ou pressa nas auditorias formativas',
      responsible: `${operator.name} (Operador) / Supervisor`,
      deadline: getFutureDate(15),
      status: 'Em Andamento'
    });
  }

  if (competencies.sistemas < 85) {
    actionPlan.push({
      id: `act-${Date.now()}-3`,
      action: 'Praticar atalhos do teclado e busca fonética de logradouros no sistema de mapas durante a triagem',
      objective: 'Reduzir pausas silenciosas e tempo médio de preenchimento do chamado',
      metric: 'Reduzir tempo de tela em 20% mantendo 100% de precisão cadastral',
      responsible: `${operator.name} (Operador)`,
      deadline: getFutureDate(30),
      status: 'Pendente'
    });
  }

  if (ncgCount > 0 || competencies.conformidade < 80) {
    actionPlan.push({
      id: `act-${Date.now()}-4`,
      action: 'Realizar checklist de conferência prévia: telefone de contato, número predial e ponto de referência antes de salvar',
      objective: 'Garantir conformidade absoluta e evitar retrabalho das secretarias municipais',
      metric: 'Zero NCGs registradas no ciclo atual',
      responsible: `${operator.name} (Operador) / Monitor`,
      deadline: getFutureDate(10),
      status: 'Em Andamento'
    });
  }

  if (actionPlan.length === 0) {
    actionPlan.push({
      id: `act-${Date.now()}-5`,
      action: 'Manter padrão de excelência atual e participar como multiplicador de boas práticas em reuniões de alinhamento',
      objective: 'Reconhecimento de desempenho e desenvolvimento de liderança técnica',
      metric: 'Manter média geral ≥ 95 e apoiar colegas de equipe',
      responsible: `${operator.name} (Operador) / Supervisor`,
      deadline: getFutureDate(45),
      status: 'Em Andamento'
    });
  }

  // 3. Consolidar pontos fortes e oportunidades de melhoria
  const strengths = strengthsCollected.slice(0, 4).map(s => s.text);
  if (strengths.length === 0) {
    if (analysis.avgScore >= 90) strengths.push('Bom índice geral de pontuação nas monitorias de qualidade.');
    strengths.push('Assiduidade e cumprimento das escalas de atendimento.');
  }

  const improvements = improvementsCollected.slice(0, 4).map(i => i.text);
  if (improvements.length === 0) {
    if (analysis.avgScore < 90) improvements.push('Aprimorar notas nos critérios pontuados abaixo da meta de 90 pontos.');
    improvements.push('Acompanhar periodicamente os feedbacks com a supervisão.');
  }

  return {
    title: `PDI - ${operator.name} (${new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })})`,
    operatorId: operator.id,
    supervisorId: operator.supervisor_id,
    status: 'Em Andamento',
    maturityLevel: analysis.maturityLevel,
    maturityColor: analysis.maturityColor,
    archetype: analysis.archetype,
    diagnosticSummary: analysis.diagnosticSummary,
    competencies: analysis.competencies,
    strengths,
    improvements,
    trainings: recommendedTrainings,
    actionPlan,
    followUps: [
      {
        id: `fol-${Date.now()}`,
        date: new Date().toISOString(),
        author: 'Sistema de Qualidade 156',
        role: 'Diagnóstico Inicial',
        notes: `PDI instaurado com base na análise de ${analysis.totalMonitorings} monitorias (média: ${analysis.avgScore}) e ${analysis.totalAudits} auditorias formativas.`
      }
    ],
    startDate: new Date().toISOString(),
    targetDate: getFutureDate(45)
  };
}

function getFutureDate(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}
