import React, { useState, useMemo } from 'react';
import { Search, Filter, Eye, Edit, Trash2, ChevronLeft, ChevronRight, Calendar, User, Award, CheckCircle, AlertTriangle } from 'lucide-react';

export default function MonitoringsHistory({ 
  operators = [], 
  monitorings = [], 
  monitors = [], 
  supervisors = [], 
  onEditMonitoring, 
  onDeleteMonitoring,
  activeProfile,
  darkMode
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [supervisorFilter, setSupervisorFilter] = useState('Todos');
  const [monitorFilter, setMonitorFilter] = useState('Todos');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Estado para controlar o modal de visualização de detalhes
  const [selectedMonitoringForDetails, setSelectedMonitoringForDetails] = useState(null);

  // Identificar escopo do perfil ativo
  const isSupervisor = activeProfile.role === 'Supervisor';
  const supervisorName = activeProfile.name ? activeProfile.name.replace(' (Supervisor)', '') : '';
  const activeSupervisorId = useMemo(() => {
    const s = supervisors.find(sup => sup.name === supervisorName || sup.id === activeProfile.id);
    return s ? s.id : null;
  }, [supervisors, supervisorName, activeProfile]);

  // Filtragem dos dados
  const filteredData = useMemo(() => {
    return monitorings.filter(m => {
      // 1. Filtragem obrigatória por supervisor logado
      if (isSupervisor) {
        // Encontrar o operador da monitoria
        const op = operators.find(o => o.id === m.operator_id);
        if (!op) return false;
        if (op.supervisor_id !== activeSupervisorId && op.supervisor_name !== supervisorName) {
          return false;
        }
      }

      // 2. Filtro de Supervisor (selecionado manualmente)
      if (!isSupervisor && supervisorFilter !== 'Todos') {
        const op = operators.find(o => o.id === m.operator_id);
        if (!op) return false;
        if (op.supervisor_id !== supervisorFilter) return false;
      }

      // 3. Filtro de Monitora
      if (monitorFilter !== 'Todos' && m.monitor_id !== monitorFilter) {
        return false;
      }

      // 4. Filtro de Status
      if (statusFilter !== 'Todos' && m.status !== statusFilter) {
        return false;
      }

      // 5. Filtro de Busca por Texto (nome do operador ou monitora)
      if (searchTerm.trim() !== '') {
        const op = operators.find(o => o.id === m.operator_id);
        const opName = op ? op.name.toLowerCase() : '';
        const monName = m.q_monitors?.name ? m.q_monitors.name.toLowerCase() : '';
        const search = searchTerm.toLowerCase();
        if (!opName.includes(search) && !monName.includes(search)) {
          return false;
        }
      }

      return true;
    });
  }, [monitorings, operators, isSupervisor, activeSupervisorId, supervisorName, supervisorFilter, monitorFilter, statusFilter, searchTerm]);

  // Paginação
  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, currentPage]);

  const getScoreStyleClass = (val) => {
    if (val === 0) return 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/30';
    if (val >= 90) return 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30';
    if (val >= 80) return 'text-orange-500 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/30';
    return 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30';
  };

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Barra de Filtros */}
      <div className="bg-white dark:bg-[#0c0c0f] p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Histórico de Monitorias</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Pesquise, filtre e analise os registros de qualidade da operação</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
          {/* Busca por Nome */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Buscar operador ou monitora..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-9 w-full bg-[#ffffff] dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-zinc-950 dark:text-zinc-100"
            />
          </div>

          {/* Filtro de Supervisor (Oculto ou desativado se o supervisor estiver logado) */}
          <div>
            <select
              disabled={isSupervisor}
              value={isSupervisor ? activeSupervisorId || 'Todos' : supervisorFilter}
              onChange={(e) => {
                setSupervisorFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-[#ffffff] dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2.5 text-xs shadow-sm text-zinc-800 dark:text-zinc-200 outline-none cursor-pointer disabled:opacity-60"
            >
              {isSupervisor ? (
                <option value={activeSupervisorId || ''}>{supervisorName} (Supervisor)</option>
              ) : (
                <>
                  <option value="Todos">Todos os Supervisores</option>
                  {supervisors.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </>
              )}
            </select>
          </div>

          {/* Filtro de Monitoras */}
          <div>
            <select
              value={monitorFilter}
              onChange={(e) => {
                setMonitorFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-[#ffffff] dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2.5 text-xs shadow-sm text-zinc-800 dark:text-zinc-200 outline-none cursor-pointer"
            >
              <option value="Todos">Todas as Monitoras</option>
              {monitors.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          {/* Filtro de Status */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-[#ffffff] dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2.5 text-xs shadow-sm text-zinc-800 dark:text-zinc-200 outline-none cursor-pointer"
            >
              <option value="Todos">Todos os Status</option>
              <option value="Aguardando Feedback">Aguardando Feedback</option>
              <option value="Feedback Concluído">Feedback Concluído</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabela de Resultados */}
      <div className="bg-white dark:bg-[#0c0c0f] rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-900/40 text-zinc-500 dark:text-zinc-400 font-semibold uppercase border-b border-zinc-200 dark:border-zinc-800">
                <th className="px-5 py-3.5">Data</th>
                <th className="px-5 py-3.5">Operador</th>
                <th className="px-5 py-3.5">Supervisor</th>
                <th className="px-5 py-3.5">Monitora</th>
                <th className="px-5 py-3.5 text-center">Nota</th>
                <th className="px-5 py-3.5 text-center">Status</th>
                <th className="px-5 py-3.5">Observações / Feedback</th>
                <th className="px-5 py-3.5 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-zinc-800 dark:text-zinc-200">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-10 text-zinc-400">Nenhum monitoramento correspondente aos filtros.</td>
                </tr>
              ) : (
                paginatedData.map(h => {
                  const op = operators.find(o => o.id === h.operator_id) || {};
                  return (
                    <tr key={h.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/30 transition-colors">
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        {new Date(h.monitoring_date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-5 py-3.5 font-bold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                        {op.name || 'Operador Ausente'}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">{op.supervisor_name || 'Sem Supervisor'}</td>
                      <td className="px-5 py-3.5 whitespace-nowrap">{h.q_monitors?.name || 'Clarice'}</td>
                      <td className="px-5 py-3.5 text-center font-bold">
                        <span className={`inline-block px-2 py-0.5 rounded font-extrabold text-[11px] ${getScoreStyleClass(h.score)}`}>
                          {h.score}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center whitespace-nowrap">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          h.status === 'Aguardando Feedback' 
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' 
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                        }`}>
                          {h.status}
                        </span>
                      </td>
                      <td 
                        onClick={() => setSelectedMonitoringForDetails(h)}
                        className="px-5 py-3.5 max-w-xs truncate text-zinc-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer font-medium" 
                        title="Clique para ver anotação completa"
                      >
                        {h.feedback_notes || <span className="text-zinc-400 italic">Sem observações (Clique para ver detalhes)</span>}
                      </td>
                      <td className="px-5 py-3.5 text-center whitespace-nowrap space-x-1.5">
                        <button
                          onClick={() => setSelectedMonitoringForDetails(h)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded font-bold transition-all cursor-pointer text-[10px]"
                          title="Visualizar Folha Completa"
                        >
                          <Eye className="w-3 h-3" />
                          Ver
                        </button>
                        <button
                          onClick={() => onEditMonitoring(h)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded font-bold transition-all cursor-pointer text-[10px]"
                          title="Editar Monitoria"
                        >
                          <Edit className="w-3 h-3" />
                          Editar
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Deseja realmente excluir esta monitoria? Esta ação é irreversível.')) {
                              onDeleteMonitoring(h.id);
                            }
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/30 hover:bg-rose-100 dark:hover:bg-rose-900/20 rounded font-bold transition-all cursor-pointer text-[10px]"
                          title="Excluir Monitoria"
                        >
                          <Trash2 className="w-3 h-3" />
                          Excluir
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="px-5 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/10 flex items-center justify-between">
            <span className="text-zinc-500 dark:text-zinc-400">
              Mostrando {paginatedData.length} de {filteredData.length} registros
            </span>
            <div className="flex items-center gap-1.5">
              <button
                disabled={currentPage === 1}
                onClick={() => handlePageChange(currentPage - 1)}
                className="p-1.5 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 disabled:opacity-40 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => handlePageChange(i + 1)}
                  className={`w-7 h-7 flex items-center justify-center rounded-lg border font-bold transition-all cursor-pointer ${
                    currentPage === i + 1
                      ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                      : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                disabled={currentPage === totalPages}
                onClick={() => handlePageChange(currentPage + 1)}
                className="p-1.5 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 disabled:opacity-40 transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Detalhes Completos da Monitoria */}
      {selectedMonitoringForDetails && (
        <MonitoringDetailsModal 
          monitoring={selectedMonitoringForDetails} 
          operators={operators} 
          onClose={() => setSelectedMonitoringForDetails(null)} 
          darkMode={darkMode}
        />
      )}
    </div>
  );
}

// Sub-Componente Interno: Modal de Detalhes da Monitoria
function MonitoringDetailsModal({ monitoring, operators = [], onClose, darkMode }) {
  const op = operators.find(o => o.id === monitoring.operator_id) || {};
  const checklist = monitoring.checklist || [];

  const getScoreStyleClass = (val) => {
    if (val === 0) return 'text-purple-600 bg-purple-50 border border-purple-200';
    if (val >= 90) return 'text-emerald-600 bg-emerald-50 border border-emerald-200';
    if (val >= 80) return 'text-orange-500 bg-orange-50 border border-orange-200';
    return 'text-rose-600 bg-rose-50 border border-rose-200';
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm no-print">
      <div className="bg-white dark:bg-[#0c0c0f] w-full max-w-2xl rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        
        {/* Header Modal */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-900/10">
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Folha de Avaliação Individual</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Detalhamento completo dos critérios</p>
          </div>
          <button 
            onClick={onClose} 
            className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
          
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
              <div className={`mt-1.5 px-4 py-1.5 rounded-lg font-black text-2xl ${getScoreStyleClass(monitoring.score)}`}>
                {monitoring.score}
              </div>
              {monitoring.is_ncg && (
                <span className="mt-1.5 text-[9px] bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">
                  NCG Ativada
                </span>
              )}
            </div>
          </div>

          {/* Observações / Feedback (Leitura Ampla e Dinâmica) */}
          <div className="space-y-2 bg-[#fefcf8] dark:bg-zinc-900/10 p-5 rounded-xl border border-amber-100 dark:border-zinc-800/40">
            <h4 className="text-xs font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-amber-600 dark:text-amber-500" />
              Observações / Justificativas de Erro
            </h4>
            <div className="text-zinc-800 dark:text-zinc-200 text-sm leading-relaxed whitespace-pre-wrap font-medium">
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
                          : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
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
