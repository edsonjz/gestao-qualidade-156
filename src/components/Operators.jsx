import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Upload, 
  Search, 
  Edit, 
  Trash2, 
  UserCheck, 
  UserX,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Info
} from 'lucide-react';
import { parseOperatorsExcel } from '../utils/xlsxParser';

export default function Operators({ 
  operators, 
  supervisors,
  onAddOperator, 
  onEditOperator, 
  onDeleteOperator, 
  onExcelUpload,
  onViewProfile,
  isLoading 
}) {
  const [search, setSearch] = useState('');
  const [filterActive, setFilterActive] = useState('ativos');
  const [filterSupervisor, setFilterSupervisor] = useState('todos');
  const [filterSkill, setFilterSkill] = useState('todos');
  const [currentPage, setCurrentPage] = useState(1);
  const [uploading, setUploading] = useState(false);
  const itemsPerPage = 15;

  // 1. Filtragem de dados
  const filtered = useMemo(() => {
    return operators.filter(o => {
      // Busca por nome
      const matchesSearch = o.name.toLowerCase().includes(search.toLowerCase());
      
      // Filtro ativo/inativo
      const matchesActive = 
        filterActive === 'todos' ? true :
        filterActive === 'ativos' ? o.active === true :
        o.active === false;

      // Filtro supervisor
      const matchesSupervisor = 
        filterSupervisor === 'todos' ? true :
        o.supervisor_name === filterSupervisor;

      // Filtro skill
      const matchesSkill = 
        filterSkill === 'todos' ? true :
        (o.skill || 'Voz') === filterSkill;

      return matchesSearch && matchesActive && matchesSupervisor && matchesSkill;
    });
  }, [operators, search, filterActive, filterSupervisor, filterSkill]);

  // 2. Paginação
  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage]);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // 3. Upload Excel
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const parsed = await parseOperatorsExcel(file);
      if (parsed.length > 0) {
        await onExcelUpload(parsed);
        alert('Planilha importada com sucesso!');
      } else {
        alert('Nenhum operador válido encontrado na planilha.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao ler arquivo Excel. Verifique a formatação.');
    } finally {
      setUploading(false);
      e.target.value = null; // reset file input
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Barra superior de Ações e Filtros */}
      <div className="bg-white dark:bg-[#0c0c0f] p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
            Listagem de Operadores ({filtered.length})
          </h3>
          
          <div className="flex items-center gap-3">
            {/* Importar Planilha */}
            <label className="flex items-center gap-1.5 bg-[#ffffff] dark:bg-[#262626] hover:bg-[#f8fafc] dark:hover:bg-zinc-800 text-[#334155] dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-xs font-bold transition-colors shadow-sm cursor-pointer select-none">
              {uploading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Upload className="w-3.5 h-3.5" />
              )}
              Importar Planilha
              <input 
                type="file" 
                accept=".xlsx, .xls, .csv" 
                onChange={handleFileUpload} 
                disabled={uploading}
                className="hidden" 
              />
            </label>

            {/* Adicionar Operador Manual */}
            <button
              onClick={onAddOperator}
              className="flex items-center gap-1.5 bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold py-2 px-3 rounded-lg transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              Adicionar Novo
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-2">
          {/* Busca por Nome */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400 dark:text-zinc-500" />
            <input
              type="text"
              placeholder="Buscar operador..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-[#ffffff] dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-zinc-950 dark:text-zinc-100 transition-all"
            />
          </div>

          {/* Filtro Status */}
          <select
            value={filterActive}
            onChange={(e) => {
              setFilterActive(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-[#ffffff] dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs shadow-sm text-zinc-800 dark:text-zinc-200 outline-none"
          >
            <option value="ativos">Apenas Ativos</option>
            <option value="inativos">Apenas Inativos</option>
            <option value="todos">Todos (Ativos/Inativos)</option>
          </select>

          {/* Filtro Supervisor */}
          <select
            value={filterSupervisor}
            onChange={(e) => {
              setFilterSupervisor(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-[#ffffff] dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs shadow-sm text-zinc-800 dark:text-zinc-200 outline-none"
          >
            <option value="todos">Todos os Supervisores</option>
            {supervisors.map(s => (
              <option key={s.id} value={s.name}>{s.name}</option>
            ))}
          </select>

          {/* Filtro Skill */}
          <select
            value={filterSkill}
            onChange={(e) => {
              setFilterSkill(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-[#ffffff] dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs shadow-sm text-zinc-800 dark:text-zinc-200 outline-none cursor-pointer"
          >
            <option value="todos">Todas as Skills</option>
            <option value="Voz">Voz</option>
            <option value="Mídias">Mídias</option>
          </select>
        </div>
      </div>

      {/* Tabela de Operadores */}
      <div className="bg-white dark:bg-[#0c0c0f] rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-900/40 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-800">
                <th className="px-6 py-3.5">Nome</th>
                <th className="px-6 py-3.5">Supervisor</th>
                <th className="px-6 py-3.5">Turno</th>
                <th className="px-6 py-3.5">Skill</th>
                <th className="px-6 py-3.5">Escala</th>
                <th className="px-6 py-3.5">Alocação</th>
                <th className="px-6 py-3.5 text-center">Status</th>
                <th className="px-6 py-3.5 text-center">Situação</th>
                <th className="px-6 py-3.5 text-right no-print">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-sm text-zinc-800 dark:text-zinc-200">
              {isLoading ? (
                <tr>
                  <td colSpan="9" className="text-center py-10 text-zinc-500 dark:text-zinc-400">
                    Carregando operadores...
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-10 text-zinc-500 dark:text-zinc-400">
                    Nenhum operador encontrado para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                paginated.map(op => (
                  <tr 
                    key={op.id} 
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-900/30 transition-colors"
                  >
                    <td className="px-6 py-3.5 font-semibold">
                      <button 
                        onClick={() => onViewProfile(op)}
                        className="hover:underline text-blue-600 dark:text-blue-400 text-left font-bold"
                      >
                        {op.name}
                      </button>
                    </td>
                    <td className="px-6 py-3.5 text-zinc-500 dark:text-zinc-400">
                      {op.supervisor_name || 'Sem Supervisor'}
                    </td>
                    <td className="px-6 py-3.5">{op.schedule}</td>
                    <td className="px-6 py-3.5">{op.skill}</td>
                    <td className="px-6 py-3.5">{op.escala}</td>
                    <td className="px-6 py-3.5">{op.allocation}</td>
                    <td className="px-6 py-3.5 text-center">
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold ${
                        op.active 
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400' 
                          : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                      }`}>
                        {op.active ? <UserCheck className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
                        {op.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                        op.status_feedback === 'Aguardando Feedback' 
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' 
                          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                      }`}>
                        {op.status_feedback}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-right space-x-2 no-print">
                      <button
                        onClick={() => onViewProfile(op)}
                        className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded text-blue-600 hover:text-blue-800 transition-colors"
                        title="Ver Ficha Completa"
                      >
                        <Info className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onEditOperator(op)}
                        className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
                        title="Editar"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDeleteOperator(op.id)}
                        className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded text-rose-500 hover:text-rose-700 transition-colors"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="px-6 py-4 flex items-center justify-between border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/10 no-print">
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              Mostrando pág. <strong>{currentPage}</strong> de {totalPages} ({filtered.length} operadores)
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-1.5 border border-zinc-200 dark:border-zinc-800 rounded hover:bg-zinc-100 dark:hover:bg-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-1.5 border border-zinc-200 dark:border-zinc-800 rounded hover:bg-zinc-100 dark:hover:bg-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
