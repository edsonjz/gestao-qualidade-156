import React, { useState, useMemo } from 'react';
import { 
  Sparkles, 
  Search, 
  Filter, 
  UserCheck, 
  Plus, 
  Lock, 
  Calendar, 
  Clock, 
  HeartHandshake, 
  Lightbulb, 
  FileText, 
  ShieldCheck, 
  ChevronRight,
  Eye,
  RefreshCw
} from 'lucide-react';

export default function Audits({ 
  audits = [], 
  operators = [], 
  supervisors = [], 
  currentUser, 
  onStartAudit, 
  onViewAudit,
  onRefresh,
  isLoading = false 
}) {
  const [search, setSearch] = useState('');
  const [selectedSupervisor, setSelectedSupervisor] = useState('todos');
  const [selectedTopic, setSelectedTopic] = useState('todos');
  const [selectedAuditorRole, setSelectedAuditorRole] = useState('todos');
  const [showOpSelector, setShowOpSelector] = useState(false);

  // Filtragem de auditorias
  const filteredAudits = useMemo(() => {
    return audits.filter(a => {
      const opName = a.q_operators?.name || a.operator_name || '';
      const opMatricula = a.q_operators?.matricula || a.operator_matricula || '';
      const auditorName = a.auditor_name || '';
      const searchLower = search.toLowerCase();

      const matchesSearch = 
        opName.toLowerCase().includes(searchLower) ||
        opMatricula.toLowerCase().includes(searchLower) ||
        auditorName.toLowerCase().includes(searchLower) ||
        (a.call_protocol && a.call_protocol.toLowerCase().includes(searchLower));

      const matchesSupervisor = 
        selectedSupervisor === 'todos' || 
        a.q_operators?.supervisor_id === selectedSupervisor || 
        a.q_operators?.supervisor_name === selectedSupervisor;

      const matchesTopic = selectedTopic === 'todos' || a.topic === selectedTopic;
      const matchesRole = selectedAuditorRole === 'todos' || a.auditor_role === selectedAuditorRole;

      return matchesSearch && matchesSupervisor && matchesTopic && matchesRole;
    });
  }, [audits, search, selectedSupervisor, selectedTopic, selectedAuditorRole]);

  // Lista de operadores disponíveis para auditoria (com pesquisa)
  const [opSearch, setOpSearch] = useState('');
  const availableOperators = useMemo(() => {
    return operators
      .filter(o => o.active)
      .filter(o => {
        const s = opSearch.toLowerCase();
        return (
          o.name.toLowerCase().includes(s) || 
          (o.matricula && o.matricula.toLowerCase().includes(s)) ||
          (o.supervisor_name && o.supervisor_name.toLowerCase().includes(s))
        );
      });
  }, [operators, opSearch]);

  const getTopicBadge = (topic) => {
    switch (topic) {
      case 'Atendimento e Postura':
        return <span className="bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 text-[10px] font-bold px-2 py-0.5 rounded-full">Postura & Empatia</span>;
      case 'Procedimentos 156':
        return <span className="bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300 text-[10px] font-bold px-2 py-0.5 rounded-full">Regras 156</span>;
      case 'Comunicação e Clareza':
        return <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full">Comunicação</span>;
      case 'Navegação em Sistemas':
        return <span className="bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full">Sistemas</span>;
      default:
        return <span className="bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300 text-[10px] font-bold px-2 py-0.5 rounded-full">{topic || 'Geral'}</span>;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header Card */}
      <div className="bg-white dark:bg-[#0c0c0f] p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 dark:bg-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold">
              <Sparkles className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Auditoria Formativa & Desenvolvimento
            </h3>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
              Sem Nota Numérica
            </span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-2xl leading-relaxed">
            Espaço colaborativo para Monitores e Supervisores acompanharem o atendimento do operador de forma construtiva. Focado em orientações práticas, pontos fortes e plano de ação sem notas ou caráter punitivo.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onRefresh}
            className="p-2 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-lg transition-colors text-xs font-semibold flex items-center gap-1.5 shadow-sm cursor-pointer"
            title="Atualizar Auditorias"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
          <button
            onClick={() => setShowOpSelector(true)}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2.5 px-4 rounded-lg transition-colors shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Nova Auditoria
          </button>
        </div>
      </div>

      {/* Métricas Rápidas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-[#0c0c0f] p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Total de Auditorias</span>
            <h4 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{audits.length}</h4>
          </div>
        </div>

        <div className="bg-white dark:bg-[#0c0c0f] p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            <HeartHandshake className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Pontos Fortes Registrados</span>
            <h4 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
              {audits.filter(a => a.strengths && a.strengths.trim().length > 0).length}
            </h4>
          </div>
        </div>

        <div className="bg-white dark:bg-[#0c0c0f] p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Avaliadores Ativos</span>
            <h4 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
              {new Set(audits.map(a => a.auditor_name)).size}
            </h4>
          </div>
        </div>
      </div>

      {/* Filtros e Barra de Busca */}
      <div className="bg-white dark:bg-[#0c0c0f] p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="sm:col-span-2 relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Buscar por operador, matrícula, avaliador ou protocolo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-zinc-950 dark:text-zinc-100"
          />
        </div>

        <select
          value={selectedSupervisor}
          onChange={(e) => setSelectedSupervisor(e.target.value)}
          className="bg-white dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs shadow-sm text-zinc-800 dark:text-zinc-200 outline-none"
        >
          <option value="todos">Todos os Supervisores</option>
          {supervisors.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>

        <select
          value={selectedTopic}
          onChange={(e) => setSelectedTopic(e.target.value)}
          className="bg-white dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs shadow-sm text-zinc-800 dark:text-zinc-200 outline-none"
        >
          <option value="todos">Todos os Temas</option>
          <option value="Atendimento e Postura">Atendimento e Postura</option>
          <option value="Procedimentos 156">Procedimentos 156</option>
          <option value="Comunicação e Clareza">Comunicação e Clareza</option>
          <option value="Navegação em Sistemas">Navegação em Sistemas</option>
          <option value="Acompanhamento e Reciclagem">Acompanhamento e Reciclagem</option>
          <option value="Geral">Geral</option>
        </select>
      </div>

      {/* Lista de Auditorias Realizadas */}
      <div className="bg-white dark:bg-[#0c0c0f] rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        {filteredAudits.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center text-blue-500 mx-auto mb-3">
              <Sparkles className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
              Nenhuma auditoria registrada ou encontrada
            </h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto">
              Clique em "Nova Auditoria" para selecionar um operador e registrar apontamentos formativos.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {filteredAudits.map((a) => {
              const op = a.q_operators || {};
              const auditDateFormatted = a.audit_date 
                ? new Date(a.audit_date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                : 'Data não informada';

              return (
                <div 
                  key={a.id} 
                  className="p-5 hover:bg-zinc-50 dark:hover:bg-zinc-900/30 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                        {op.name || a.operator_name || 'Operador'}
                      </h4>
                      {op.matricula && (
                        <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
                          ({op.matricula})
                        </span>
                      )}
                      {getTopicBadge(a.topic)}
                      <span className="text-[10px] text-zinc-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {auditDateFormatted}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400">
                      <span>Supervisor: <strong className="text-zinc-700 dark:text-zinc-300">{op.supervisor_name || 'Geral'}</strong></span>
                      <span>•</span>
                      <span>Avaliador: <strong className="text-blue-600 dark:text-blue-400">{a.auditor_name}</strong> ({a.auditor_role === 'supervisor' ? 'Supervisor' : a.auditor_role === 'monitor' ? 'Monitor' : 'Admin'})</span>
                      {a.call_protocol && (
                        <>
                          <span>•</span>
                          <span>Protocolo: <strong className="font-mono text-zinc-700 dark:text-zinc-300">{a.call_protocol}</strong></span>
                        </>
                      )}
                    </div>

                    {/* Resumos de Destaques e Orientações */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                      {a.strengths && (
                        <div className="text-[11px] bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/30 p-2 rounded-lg text-emerald-900 dark:text-emerald-300 flex items-start gap-1.5">
                          <HeartHandshake className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                          <span className="line-clamp-2"><strong>Destaque:</strong> {a.strengths}</span>
                        </div>
                      )}
                      {a.improvements && (
                        <div className="text-[11px] bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/30 p-2 rounded-lg text-amber-900 dark:text-amber-300 flex items-start gap-1.5">
                          <Lightbulb className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                          <span className="line-clamp-2"><strong>Ajuste sugerido:</strong> {a.improvements}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                    <button
                      onClick={() => onViewAudit(a)}
                      className="px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Visualizar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal / Seletor de Operador para Iniciar Auditoria */}
      {showOpSelector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#0c0c0f] w-full max-w-lg rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-900/10">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-500" />
                Selecione o Operador para Auditar
              </h3>
              <button 
                onClick={() => setShowOpSelector(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Buscar colaborador por nome, matrícula ou supervisor..."
                  value={opSearch}
                  onChange={(e) => setOpSearch(e.target.value)}
                  className="w-full bg-white dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-zinc-950 dark:text-zinc-100"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-zinc-200 dark:divide-zinc-800 p-2">
              {availableOperators.length === 0 ? (
                <div className="text-center py-8 text-zinc-500 text-xs">
                  Nenhum operador encontrado.
                </div>
              ) : (
                availableOperators.map(op => {
                  // Verificação de Lock de Concorrência
                  const isLocked = Boolean(
                    op.locked_at && 
                    (new Date() - new Date(op.locked_at)) < 30 * 60 * 1000
                  );
                  const isLockedByOther = isLocked && op.locked_by_monitor_id && op.locked_by_monitor_id !== currentUser?.id;

                  return (
                    <div 
                      key={op.id}
                      className="p-3 hover:bg-zinc-50 dark:hover:bg-zinc-900/40 rounded-xl flex items-center justify-between transition-colors"
                    >
                      <div>
                        <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                          {op.name}
                          {op.matricula && (
                            <span className="text-[10px] font-mono text-zinc-500">
                              ({op.matricula})
                            </span>
                          )}
                        </h4>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                          Sup: {op.supervisor_name || 'Geral'} • {op.schedule || 'Padrão'}
                        </p>
                      </div>

                      {isLockedByOther ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                          <Lock className="w-3 h-3" />
                          Em uso por {op.locked_by_monitor_name || 'outro'}
                        </span>
                      ) : (
                        <button
                          onClick={() => {
                            setShowOpSelector(false);
                            onStartAudit(op);
                          }}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          Auditar
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
