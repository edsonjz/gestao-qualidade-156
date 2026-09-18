import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  Settings, 
  AlertCircle, 
  Check, 
  Layers, 
  Sparkles, 
  ClipboardList, 
  Edit3 
} from 'lucide-react';
import { TOPIC_COLORS, getTopicBadgeClass } from './AuditTopicsModal';

export default function ConfigChecklist({ 
  checklistItems = [], 
  onAddChecklistItem, 
  onDeleteChecklistItem,
  isLoading,
  auditTopics = [],
  onAddAuditTopic,
  onUpdateAuditTopic,
  onDeleteAuditTopic,
  audits = []
}) {
  const [activeSubTab, setActiveSubTab] = useState('checklist'); // 'checklist' | 'audit_topics'

  // Estados do Checklist
  const [newLabel, setNewLabel] = useState('');
  const [newWeight, setNewWeight] = useState(20);

  // Estados do Gerenciamento de Temas
  const [editingTopicId, setEditingTopicId] = useState(null);
  const [topicName, setTopicName] = useState('');
  const [topicDescription, setTopicDescription] = useState('');
  const [topicColor, setTopicColor] = useState('blue');
  const [topicError, setTopicError] = useState('');
  const [isSubmittingTopic, setIsSubmittingTopic] = useState(false);

  const totalWeight = checklistItems.reduce((sum, item) => sum + item.weight, 0);

  const handleChecklistSubmit = (e) => {
    e.preventDefault();
    if (!newLabel.trim()) return;
    onAddChecklistItem(newLabel.trim(), parseInt(newWeight, 10));
    setNewLabel('');
    setNewWeight(20);
  };

  // Funções de Temas de Auditoria
  const handleStartEditTopic = (t) => {
    setEditingTopicId(t.id);
    setTopicName(t.name);
    setTopicDescription(t.description || '');
    setTopicColor(t.color || 'blue');
    setTopicError('');
  };

  const handleCancelEditTopic = () => {
    setEditingTopicId(null);
    setTopicName('');
    setTopicDescription('');
    setTopicColor('blue');
    setTopicError('');
  };

  const handleTopicSubmit = async (e) => {
    e.preventDefault();
    const trimmed = topicName.trim();
    if (!trimmed) {
      setTopicError('O nome do tema é obrigatório.');
      return;
    }

    const exists = auditTopics.some(
      t => t.name.toLowerCase() === trimmed.toLowerCase() && t.id !== editingTopicId
    );
    if (exists) {
      setTopicError('Já existe um tema com este nome. Escolha outro nome.');
      return;
    }

    setIsSubmittingTopic(true);
    try {
      if (editingTopicId) {
        const old = auditTopics.find(t => t.id === editingTopicId);
        await onUpdateAuditTopic(editingTopicId, {
          name: trimmed,
          description: topicDescription.trim(),
          color: topicColor
        }, old?.name);
      } else {
        await onAddAuditTopic({
          name: trimmed,
          description: topicDescription.trim(),
          color: topicColor
        });
      }
      handleCancelEditTopic();
    } catch (err) {
      setTopicError(err.message || 'Erro ao salvar tema.');
    } finally {
      setIsSubmittingTopic(false);
    }
  };

  const handleDeleteTopic = async (topic) => {
    const count = audits.filter(a => a.topic === topic.name).length;
    let msg = `Deseja realmente excluir o tema "${topic.name}"?`;
    if (count > 0) {
      msg = `Atenção: existem ${count} auditoria(s) com o tema "${topic.name}". Deseja excluir das opções futuras mantendo os dados históricos?`;
    }
    if (window.confirm(msg)) {
      try {
        await onDeleteAuditTopic(topic.id, topic.name);
        if (editingTopicId === topic.id) {
          handleCancelEditTopic();
        }
      } catch (err) {
        alert('Erro ao excluir tema: ' + (err.message || ''));
      }
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Navegação entre Sub-Abas de Configuração */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800 gap-4">
        <button
          onClick={() => setActiveSubTab('checklist')}
          className={`pb-3 px-1 text-xs font-bold transition-colors flex items-center gap-2 border-b-2 cursor-pointer ${
            activeSubTab === 'checklist'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
        >
          <ClipboardList className="w-4 h-4" />
          Checklist de Monitoria (Com Nota)
        </button>

        <button
          onClick={() => setActiveSubTab('audit_topics')}
          className={`pb-3 px-1 text-xs font-bold transition-colors flex items-center gap-2 border-b-2 cursor-pointer ${
            activeSubTab === 'audit_topics'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          Temas da Auditoria Formativa ({auditTopics.length})
        </button>
      </div>

      {/* ABA 1: CHECKLIST DE MONITORIA */}
      {activeSubTab === 'checklist' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-200">
          
          {/* Coluna 1: Formulário de Adicionar Item (w-1/3) */}
          <div className="bg-white dark:bg-[#0c0c0f] p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4 h-fit">
            <div className="border-b border-zinc-200 dark:border-zinc-800 pb-3 flex items-center gap-2">
              <Settings className="w-4 h-4 text-blue-500" />
              <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">Novo Item de Checklist</h4>
            </div>

            <form onSubmit={handleChecklistSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                  Nome do Critério / Item de Qualidade
                </label>
                <input
                  type="text"
                  placeholder="Ex: Cordialidade, Procedimento Correto..."
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  required
                  className="w-full bg-[#ffffff] dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-zinc-950 dark:text-zinc-100"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                  Peso do Item (Pontuação)
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={newWeight}
                  onChange={(e) => setNewWeight(e.target.value)}
                  required
                  className="w-full bg-[#ffffff] dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-zinc-950 dark:text-zinc-100"
                />
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-1.5 bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold py-2 px-3 rounded-lg transition-colors shadow-sm cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Adicionar Item
              </button>
            </form>

            <div className="bg-zinc-50 dark:bg-zinc-900/30 p-3.5 rounded-lg border border-zinc-200 dark:border-zinc-800/40 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed flex gap-2">
              <AlertCircle className="w-4 h-4 text-blue-500 flex-shrink-0" />
              <span>
                Os pesos dos itens são relativizados na monitoria. Ex: Se um item for marcado como <strong>N/A</strong> (Não Aplicável), seu peso é retirado e os outros pesos são redistribuídos automaticamente para manter a nota máxima em 100.
              </span>
            </div>
          </div>

          {/* Coluna 2: Itens Cadastrados (w-2/3) */}
          <div className="lg:col-span-2 bg-white dark:bg-[#0c0c0f] p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">Itens de Avaliação Ativos</h4>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                totalWeight === 100 
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' 
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
              }`}>
                Soma dos pesos: {totalWeight}
              </span>
            </div>

            <div className="bg-white dark:bg-[#0c0c0f] rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50 dark:bg-zinc-900/40 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-800">
                    <th className="px-6 py-3">Critério / Item</th>
                    <th className="px-6 py-3 text-center w-32">Peso Relativo</th>
                    <th className="px-6 py-3 text-center w-24">Porcentagem</th>
                    <th className="px-6 py-3 text-right w-24">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-sm text-zinc-800 dark:text-zinc-200">
                  {isLoading ? (
                    <tr>
                      <td colSpan="4" className="text-center py-6 text-zinc-500">Carregando itens...</td>
                    </tr>
                  ) : checklistItems.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="text-center py-6 text-zinc-500">Nenhum critério ativo. Adicione critérios ao checklist.</td>
                    </tr>
                  ) : (
                    checklistItems.map(item => {
                      const pct = totalWeight > 0 ? Math.round((item.weight / totalWeight) * 100) : 0;
                      return (
                        <tr key={item.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/30 transition-colors">
                          <td className="px-6 py-3.5 font-bold">{item.label}</td>
                          <td className="px-6 py-3.5 text-center font-semibold text-zinc-700 dark:text-zinc-300">{item.weight} pts</td>
                          <td className="px-6 py-3.5 text-center text-zinc-500">{pct}%</td>
                          <td className="px-6 py-3.5 text-right">
                            <button
                              onClick={() => onDeleteChecklistItem(item.id)}
                              className="p-1 text-zinc-400 hover:text-rose-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors cursor-pointer"
                              title="Excluir Critério"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ABA 2: TEMAS DA AUDITORIA FORMATIVA */}
      {activeSubTab === 'audit_topics' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-200">
          
          {/* Coluna 1: Formulário de Inclusão / Edição de Tema (w-1/3) */}
          <div className="bg-white dark:bg-[#0c0c0f] p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4 h-fit">
            <div className="border-b border-zinc-200 dark:border-zinc-800 pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {editingTopicId ? (
                  <Edit3 className="w-4 h-4 text-blue-500" />
                ) : (
                  <Sparkles className="w-4 h-4 text-blue-500" />
                )}
                <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
                  {editingTopicId ? 'Editar Tema' : 'Novo Tema da Auditoria'}
                </h4>
              </div>
              {editingTopicId && (
                <button
                  type="button"
                  onClick={handleCancelEditTopic}
                  className="text-[11px] text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 underline cursor-pointer"
                >
                  Cancelar
                </button>
              )}
            </div>

            {topicError && (
              <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 flex items-center gap-2 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{topicError}</span>
              </div>
            )}

            <form onSubmit={handleTopicSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Nome do Tema <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ex: Atendimento e Postura"
                  value={topicName}
                  onChange={(e) => {
                    setTopicName(e.target.value);
                    setTopicError('');
                  }}
                  required
                  className="w-full bg-[#ffffff] dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-zinc-950 dark:text-zinc-100"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Descrição Explicativa
                </label>
                <input
                  type="text"
                  placeholder="Ex: Cordialidade, empatia e escuta ativa"
                  value={topicDescription}
                  onChange={(e) => setTopicDescription(e.target.value)}
                  className="w-full bg-[#ffffff] dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-zinc-950 dark:text-zinc-100"
                />
              </div>

              {/* Seletor de Cores com Prévia */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Cor do Badge
                  </label>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getTopicBadgeClass(topicColor)}`}>
                    {topicName.trim() || 'Prévia'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  {TOPIC_COLORS.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setTopicColor(c.id)}
                      className={`px-2 py-1 rounded-lg border text-[11px] font-medium flex items-center justify-between transition-all cursor-pointer ${c.bg} ${
                        topicColor === c.id 
                          ? `ring-2 ${c.ring} font-bold shadow-xs scale-[1.02]` 
                          : 'opacity-70 hover:opacity-100'
                      }`}
                    >
                      <span>{c.label}</span>
                      {topicColor === c.id && <Check className="w-3 h-3" />}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmittingTopic}
                className="w-full flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2.5 px-3 rounded-lg transition-colors shadow-sm cursor-pointer disabled:opacity-50"
              >
                {editingTopicId ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Salvar Alterações
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    Adicionar Tema
                  </>
                )}
              </button>
            </form>

            <div className="bg-zinc-50 dark:bg-zinc-900/30 p-3.5 rounded-lg border border-zinc-200 dark:border-zinc-800/40 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed flex gap-2">
              <AlertCircle className="w-4 h-4 text-blue-500 flex-shrink-0" />
              <span>
                Estes temas são exibidos nas auditorias formativas realizadas por Monitores e Supervisores, além de compor os filtros de relatórios e painéis.
              </span>
            </div>
          </div>

          {/* Coluna 2: Temas Cadastrados (w-2/3) */}
          <div className="lg:col-span-2 bg-white dark:bg-[#0c0c0f] p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
                Temas Ativos na Operação ({auditTopics.length})
              </h4>
            </div>

            <div className="bg-white dark:bg-[#0c0c0f] rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50 dark:bg-zinc-900/40 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-800">
                    <th className="px-6 py-3">Tema & Badge</th>
                    <th className="px-6 py-3">Descrição</th>
                    <th className="px-6 py-3 text-center w-32">Auditorias</th>
                    <th className="px-6 py-3 text-right w-24">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-sm text-zinc-800 dark:text-zinc-200">
                  {auditTopics.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="text-center py-6 text-zinc-500">
                        Nenhum tema ativo. Adicione um tema no formulário ao lado.
                      </td>
                    </tr>
                  ) : (
                    auditTopics.map(topic => {
                      const count = audits.filter(a => a.topic === topic.name).length;
                      const isEditing = editingTopicId === topic.id;

                      return (
                        <tr 
                          key={topic.id} 
                          className={`transition-colors ${
                            isEditing 
                              ? 'bg-blue-50/50 dark:bg-blue-950/20' 
                              : 'hover:bg-zinc-50 dark:hover:bg-zinc-900/30'
                          }`}
                        >
                          <td className="px-6 py-3.5">
                            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${getTopicBadgeClass(topic.color)}`}>
                              {topic.name}
                            </span>
                          </td>
                          <td className="px-6 py-3.5 text-xs text-zinc-600 dark:text-zinc-400">
                            {topic.description || <span className="text-zinc-400 italic">Sem descrição</span>}
                          </td>
                          <td className="px-6 py-3.5 text-center text-xs font-bold text-zinc-700 dark:text-zinc-300">
                            {count}
                          </td>
                          <td className="px-6 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleStartEditTopic(topic)}
                                className="p-1 text-zinc-400 hover:text-blue-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors cursor-pointer"
                                title="Editar Tema"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteTopic(topic)}
                                className="p-1 text-zinc-400 hover:text-rose-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors cursor-pointer"
                                title="Excluir Tema"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
