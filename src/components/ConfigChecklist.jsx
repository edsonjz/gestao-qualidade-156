import React, { useState } from 'react';
import { Plus, Trash2, Settings, AlertCircle, Save } from 'lucide-react';

export default function ConfigChecklist({ 
  checklistItems, 
  onAddChecklistItem, 
  onDeleteChecklistItem,
  isLoading 
}) {
  const [newLabel, setNewLabel] = useState('');
  const [newWeight, setNewWeight] = useState(20);

  const totalWeight = checklistItems.reduce((sum, item) => sum + item.weight, 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newLabel.trim()) return;
    onAddChecklistItem(newLabel.trim(), parseInt(newWeight, 10));
    setNewLabel('');
    setNewWeight(20);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Coluna 1: Formulário de Adicionar Item (w-1/3) */}
      <div className="bg-white dark:bg-[#0c0c0f] p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4 h-fit">
        <div className="border-b border-zinc-200 dark:border-zinc-800 pb-3 flex items-center gap-2">
          <Settings className="w-4 h-4 text-blue-500" />
          <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">Novo Item de Checklist</h4>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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
            className="w-full flex items-center justify-center gap-1.5 bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold py-2 px-3 rounded-lg transition-colors shadow-sm"
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
                          className="p-1 text-zinc-400 hover:text-rose-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors"
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
  );
}
