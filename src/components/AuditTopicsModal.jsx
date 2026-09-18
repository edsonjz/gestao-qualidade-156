import React, { useState } from 'react';
import { 
  X, 
  Plus, 
  Edit3, 
  Trash2, 
  Sparkles, 
  Check, 
  AlertCircle, 
  Layers,
  HelpCircle
} from 'lucide-react';

export const TOPIC_COLORS = [
  { id: 'blue', label: 'Azul', bg: 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-900/50', ring: 'ring-blue-500' },
  { id: 'purple', label: 'Roxo', bg: 'bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-900/50', ring: 'ring-purple-500' },
  { id: 'emerald', label: 'Verde', bg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/50', ring: 'ring-emerald-500' },
  { id: 'amber', label: 'Âmbar', bg: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-900/50', ring: 'ring-amber-500' },
  { id: 'indigo', label: 'Índigo', bg: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-900/50', ring: 'ring-indigo-500' },
  { id: 'rose', label: 'Rosa / Vermelho', bg: 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-900/50', ring: 'ring-rose-500' },
  { id: 'cyan', label: 'Ciano', bg: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950/40 dark:text-cyan-300 border-cyan-200 dark:border-cyan-900/50', ring: 'ring-cyan-500' },
  { id: 'zinc', label: 'Cinza / Neutro', bg: 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700', ring: 'ring-zinc-500' }
];

export const getTopicBadgeClass = (color = 'blue') => {
  const match = TOPIC_COLORS.find(c => c.id === color);
  return match ? match.bg : TOPIC_COLORS[0].bg;
};

export default function AuditTopicsModal({ 
  topics = [], 
  audits = [], 
  onClose, 
  onAddTopic, 
  onUpdateTopic, 
  onDeleteTopic,
  onSelectTopic = null
}) {
  const [editingTopicId, setEditingTopicId] = useState(null);
  
  // Campos do formulário (inclusão ou edição)
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('blue');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Iniciar modo de edição
  const handleStartEdit = (t) => {
    setEditingTopicId(t.id);
    setName(t.name || '');
    setDescription(t.description || '');
    setColor(t.color || 'blue');
    setErrorMsg('');
  };

  // Cancelar formulário de edição e voltar ao modo de inclusão
  const handleCancelEdit = () => {
    setEditingTopicId(null);
    setName('');
    setDescription('');
    setColor('blue');
    setErrorMsg('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMsg('O nome do tema é obrigatório.');
      return;
    }

    // Verificar duplicidade de nome
    const nameExists = topics.some(
      t => t.name.toLowerCase() === trimmedName.toLowerCase() && t.id !== editingTopicId
    );
    if (nameExists) {
      setErrorMsg('Já existe um tema com este nome. Escolha outro nome.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingTopicId) {
        const oldTopic = topics.find(t => t.id === editingTopicId);
        await onUpdateTopic(editingTopicId, {
          name: trimmedName,
          description: description.trim(),
          color
        }, oldTopic?.name);
      } else {
        const newTopic = await onAddTopic({
          name: trimmedName,
          description: description.trim(),
          color
        });
        if (onSelectTopic && newTopic) {
          onSelectTopic(newTopic.name);
        }
      }
      handleCancelEdit();
    } catch (err) {
      setErrorMsg(err.message || 'Erro ao salvar tema.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (topic) => {
    // Contar quantas auditorias utilizam este tema
    const usageCount = audits.filter(a => a.topic === topic.name).length;
    
    let confirmMessage = `Deseja realmente excluir o tema "${topic.name}"?`;
    if (usageCount > 0) {
      confirmMessage = `Atenção: existem ${usageCount} auditoria(s) registradas com o tema "${topic.name}". ` +
        `Ao excluir, o tema deixará de aparecer nas opções para novas auditorias, mas o histórico existente permanecerá intacto. Deseja continuar?`;
    }

    if (window.confirm(confirmMessage)) {
      try {
        await onDeleteTopic(topic.id, topic.name);
        if (editingTopicId === topic.id) {
          handleCancelEdit();
        }
      } catch (err) {
        alert('Erro ao excluir tema: ' + (err.message || ''));
      }
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm no-print"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="bg-white dark:bg-[#0c0c0f] w-full max-w-2xl rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-900/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                Temas Principais da Auditoria
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Gerencie os eixos temáticos disponíveis para auditorias formativas
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo Rolável */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
          
          {/* Formulário de Inclusão / Edição */}
          <div className="bg-zinc-50 dark:bg-zinc-900/40 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-zinc-900 dark:text-zinc-100 text-xs flex items-center gap-1.5">
                {editingTopicId ? (
                  <>
                    <Edit3 className="w-4 h-4 text-blue-600" />
                    Editar Tema
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 text-blue-600" />
                    Adicionar Novo Tema
                  </>
                )}
              </h4>
              {editingTopicId && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="text-[11px] text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 underline cursor-pointer"
                >
                  Cancelar edição
                </button>
              )}
            </div>

            {errorMsg && (
              <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 flex items-center gap-2 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-zinc-700 dark:text-zinc-300">
                    Nome do Tema <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Atendimento e Postura"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setErrorMsg('');
                    }}
                    className="w-full bg-white dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-blue-500/40"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-zinc-700 dark:text-zinc-300">
                    Descrição / Rótulo Explicativo
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Cordialidade, empatia e postura ativa"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-white dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-blue-500/40"
                  />
                </div>
              </div>

              {/* Seletor de Cores com Preview */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-zinc-700 dark:text-zinc-300">
                    Cor do Indicador / Badge
                  </label>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-zinc-400">Prévia:</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getTopicBadgeClass(color)}`}>
                      {name.trim() || 'Nome do Tema'}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  {TOPIC_COLORS.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setColor(c.id)}
                      className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium flex items-center gap-1.5 transition-all cursor-pointer ${c.bg} ${
                        color === c.id 
                          ? `ring-2 ${c.ring} font-bold shadow-xs scale-105` 
                          : 'opacity-70 hover:opacity-100'
                      }`}
                    >
                      {color === c.id && <Check className="w-3 h-3" />}
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
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
              </div>
            </form>
          </div>

          {/* Lista de Temas Cadastrados */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider text-[11px]">
                Temas Cadastrados ({topics.length})
              </h4>
              <span className="text-[11px] text-zinc-400">
                Disponíveis no formulário e filtros de auditoria
              </span>
            </div>

            {topics.length === 0 ? (
              <div className="text-center py-8 bg-zinc-50 dark:bg-zinc-900/20 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 text-zinc-500">
                Nenhum tema cadastrado no momento. Adicione um tema acima.
              </div>
            ) : (
              <div className="divide-y divide-zinc-200 dark:divide-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-[#0c0c0f]">
                {topics.map((t) => {
                  const auditCount = audits.filter(a => a.topic === t.name).length;
                  const isEditing = editingTopicId === t.id;

                  return (
                    <div 
                      key={t.id} 
                      className={`p-3.5 flex items-center justify-between gap-3 transition-colors ${
                        isEditing 
                          ? 'bg-blue-50/50 dark:bg-blue-950/20' 
                          : 'hover:bg-zinc-50 dark:hover:bg-zinc-900/30'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border shrink-0 ${getTopicBadgeClass(t.color)}`}>
                          {t.name}
                        </span>
                        
                        <div className="min-w-0">
                          <p className="text-xs text-zinc-600 dark:text-zinc-400 truncate">
                            {t.description || <span className="text-zinc-400 italic">Sem descrição</span>}
                          </p>
                          <span className="text-[10px] text-zinc-400">
                            {auditCount} auditoria(s) realizada(s)
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {onSelectTopic && (
                          <button
                            onClick={() => {
                              onSelectTopic(t.name);
                              onClose();
                            }}
                            className="px-2 py-1 text-[11px] font-semibold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded transition-colors"
                            title="Selecionar este tema na auditoria atual"
                          >
                            Selecionar
                          </button>
                        )}
                        <button
                          onClick={() => handleStartEdit(t)}
                          className="p-1.5 text-zinc-400 hover:text-blue-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                          title="Editar Tema"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(t)}
                          className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                          title="Excluir Tema"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/20 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-semibold rounded-lg transition-colors text-xs cursor-pointer"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
}
