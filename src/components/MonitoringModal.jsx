import React, { useState, useEffect, useMemo } from 'react';
import { X, Plus, AlertTriangle, Info, ShieldAlert } from 'lucide-react';

export default function MonitoringModal({ 
  operator, 
  monitor, 
  activeCycle, 
  defaultChecklistItems, 
  onClose, 
  onSave,
  monitoring = null
}) {
  const [checklist, setChecklist] = useState([]);
  const [customItems, setCustomItems] = useState([]);
  const [notes, setNotes] = useState('');
  const [isNCG, setIsNCG] = useState(false);
  const [newCustomLabel, setNewCustomLabel] = useState('');
  const [newCustomWeight, setNewCustomWeight] = useState(20);
  const [showCustomForm, setShowCustomForm] = useState(false);

  // Inicializar o checklist com os itens padrão ou os salvos na monitoria
  useEffect(() => {
    if (monitoring) {
      setNotes(monitoring.feedback_notes || '');
      setIsNCG(monitoring.is_ncg || false);

      const savedChecklist = monitoring.checklist || [];
      const defaultLabels = new Set((defaultChecklistItems || []).map(item => item.label));
      
      const standards = [];
      const customs = [];

      savedChecklist.forEach((item, index) => {
        if (defaultLabels.has(item.label)) {
          standards.push({
            id: `std_${index}`,
            label: item.label,
            weight: item.weight,
            value: item.value
          });
        } else {
          customs.push({
            id: `custom_${index}`,
            label: item.label,
            weight: item.weight,
            value: item.value,
            isCustom: true
          });
        }
      });

      setChecklist(standards);
      setCustomItems(customs);
    } else if (defaultChecklistItems) {
      setChecklist(defaultChecklistItems.map(item => ({
        id: item.id,
        label: item.label,
        weight: item.weight,
        value: 'Sim' // Padrão é Conforme ('Sim', 'Não', 'N/A')
      })));
      setCustomItems([]);
      setNotes('');
      setIsNCG(false);
    }
  }, [monitoring, defaultChecklistItems]);

  // Combinar itens padrão e customizados
  const allItems = useMemo(() => {
    return [...checklist, ...customItems];
  }, [checklist, customItems]);

  // Calcular a nota dinamicamente
  const score = useMemo(() => {
    if (isNCG) return 0;

    let numerator = 0;
    let denominator = 0;

    allItems.forEach(item => {
      if (item.value === 'Sim') {
        numerator += item.weight;
        denominator += item.weight;
      } else if (item.value === 'Não') {
        denominator += item.weight;
      }
      // N/A ignora do numerador e denominador
    });

    if (denominator === 0) return 100;
    return Math.round((numerator / denominator) * 100);
  }, [allItems, isNCG]);

  const handleValueChange = (id, isCustom, value) => {
    if (isCustom) {
      setCustomItems(prev => prev.map(item => 
        item.id === id ? { ...item, value } : item
      ));
    } else {
      setChecklist(prev => prev.map(item => 
        item.id === id ? { ...item, value } : item
      ));
    }
  };

  const handleAddCustomItem = (e) => {
    e.preventDefault();
    if (!newCustomLabel.trim()) return;

    const newItem = {
      id: `custom_${Date.now()}`,
      label: newCustomLabel.trim(),
      weight: parseInt(newCustomWeight, 10),
      value: 'Sim',
      isCustom: true
    };

    setCustomItems(prev => [...prev, newItem]);
    setNewCustomLabel('');
    setNewCustomWeight(20);
    setShowCustomForm(false);
  };

  const handleSave = () => {
    // Formatar checklist completo para persistência
    const formattedChecklist = allItems.map(item => ({
      label: item.label,
      weight: item.weight,
      value: item.value
    }));

    const payload = {
      operator_id: operator.id,
      monitor_id: monitoring ? monitoring.monitor_id : monitor.id,
      cycle_id: monitoring ? monitoring.cycle_id : activeCycle.id,
      score: score,
      status: monitoring ? monitoring.status : 'Aguardando Feedback',
      feedback_notes: notes,
      checklist: formattedChecklist,
      is_ncg: isNCG
    };

    if (monitoring) {
      payload.id = monitoring.id;
    }

    onSave(payload);
  };

  // Cores de fundo e texto dinâmicas para a nota
  const getScoreStyleClass = (val) => {
    if (val === 0) return 'text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-950/30';
    if (val >= 90) return 'text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/30';
    if (val >= 80) return 'text-orange-500 dark:text-orange-400 bg-orange-100 dark:bg-orange-950/30';
    return 'text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-950/30';
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm no-print">
      <div className="bg-white dark:bg-[#0c0c0f] w-full max-w-3xl rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        
        {/* Header Modal */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-900/10">
          <div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Nova Monitoria de Qualidade</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Operador: <strong>{operator.name}</strong> • Supervisor: <strong>{operator.supervisor_name}</strong>
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo Formulário (Rolável) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Ficha Operacional Rápida */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-zinc-50 dark:bg-zinc-900/30 p-3.5 rounded-lg border border-zinc-200 dark:border-zinc-800/40 text-xs">
            <div>
              <span className="text-zinc-400 block mb-0.5">Turno / Entrada</span>
              <span className="font-bold text-zinc-800 dark:text-zinc-200">{operator.schedule}</span>
            </div>
            <div>
              <span className="text-zinc-400 block mb-0.5">Skill</span>
              <span className="font-bold text-zinc-800 dark:text-zinc-200">{operator.skill}</span>
            </div>
            <div>
              <span className="text-zinc-400 block mb-0.5">Alocação</span>
              <span className="font-bold text-zinc-800 dark:text-zinc-200">{operator.allocation}</span>
            </div>
            <div>
              <span className="text-zinc-400 block mb-0.5">Monitora Logada</span>
              <span className="font-bold text-blue-600 dark:text-blue-400">{monitor.name}</span>
            </div>
          </div>

          {/* Checklist de Itens */}
          <div className="space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-zinc-200 dark:border-zinc-800">
              <h4 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Itens de Avaliação</h4>
              
              <button
                onClick={() => setShowCustomForm(!showCustomForm)}
                className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold"
              >
                <Plus className="w-3.5 h-3.5" />
                Incluir Item Manual
              </button>
            </div>

            {/* Formulário Rápido para Item Customizado */}
            {showCustomForm && (
              <form onSubmit={handleAddCustomItem} className="p-4 bg-blue-50/50 dark:bg-blue-950/10 border border-blue-100 dark:border-blue-900/30 rounded-lg space-y-3">
                <h5 className="text-xs font-bold text-blue-700 dark:text-blue-400">Adicionar Novo Critério na Avaliação Atual</h5>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2 space-y-1">
                    <input
                      type="text"
                      placeholder="Nome do critério..."
                      value={newCustomLabel}
                      onChange={(e) => setNewCustomLabel(e.target.value)}
                      required
                      className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md px-3 py-1.5 text-xs outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <input
                      type="number"
                      placeholder="Peso (1-100)"
                      value={newCustomWeight}
                      onChange={(e) => setNewCustomWeight(e.target.value)}
                      required
                      className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md px-3 py-1.5 text-xs outline-none"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setShowCustomForm(false)}
                    className="px-3 py-1.5 border border-zinc-200 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-blue-600 text-white font-bold rounded-md hover:bg-blue-700 transition-colors shadow-sm"
                  >
                    Adicionar
                  </button>
                </div>
              </form>
            )}

            {/* Lista de Critérios */}
            <div className="space-y-2">
              {allItems.map((item) => (
                <div 
                  key={item.id} 
                  className={`flex items-center justify-between p-3.5 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/80 rounded-lg hover:border-zinc-300 dark:hover:border-zinc-700/80 transition-colors ${
                    item.isCustom ? 'border-dashed border-blue-300 dark:border-blue-900/40' : ''
                  }`}
                >
                  <div className="space-y-0.5 max-w-[65%]">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">{item.label}</p>
                      {item.isCustom && (
                        <span className="text-[9px] bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 px-1 rounded font-bold uppercase">
                          Custom
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">Peso: {item.weight} pts</p>
                  </div>

                  {/* Controles de Conformidade (Segmented Control) */}
                  <div className="bg-zinc-200 dark:bg-zinc-900 p-0.5 rounded-lg flex items-center gap-0.5">
                    {['Sim', 'Não', 'N/A'].map(val => (
                      <button
                        key={val}
                        onClick={() => handleValueChange(item.id, item.isCustom, val)}
                        className={`text-xs font-bold px-3 py-1.5 rounded-md transition-all ${
                          item.value === val
                            ? val === 'Sim'
                              ? 'bg-emerald-500 text-white shadow-sm'
                              : val === 'Não'
                                ? 'bg-rose-500 text-white shadow-sm'
                                : 'bg-zinc-400 text-white shadow-sm'
                            : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
                        }`}
                      >
                        {val === 'Sim' ? 'C' : val === 'Não' ? 'NC' : 'N/A'}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Não Conformidade Grave (NCG) */}
          <div className="p-4 bg-purple-50/50 dark:bg-purple-950/10 border border-purple-200 dark:border-purple-900/30 rounded-xl flex items-center justify-between">
            <div className="flex items-start gap-2.5 max-w-[80%]">
              <ShieldAlert className="w-5 h-5 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-bold text-purple-800 dark:text-purple-300">Não Conformidade Grave (NCG)</h4>
                <p className="text-xs text-purple-600/80 dark:text-purple-400/80 leading-relaxed">
                  Marque esta opção caso ocorra um erro impeditivo de gravidade máxima (ex: vazamento de dados, atitude desrespeitosa). A nota será zerada imediatamente e classificada em roxo.
                </p>
              </div>
            </div>
            
            <input
              type="checkbox"
              checked={isNCG}
              onChange={(e) => setIsNCG(e.target.checked)}
              className="w-5 h-5 accent-purple-600 cursor-pointer"
            />
          </div>

          {/* Observações da Monitoria */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Observações / Justificativas de Erro
            </label>
            <textarea
              rows="3"
              placeholder="Descreva aqui observações detalhadas do atendimento e justificativas para itens 'Não Conformes'..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-[#ffffff] dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-zinc-950 dark:text-zinc-100"
            ></textarea>
          </div>
        </div>

        {/* Footer com Nota Dinâmica + Salvar */}
        <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/10">
          <div className="flex items-center gap-3">
            <span className="text-sm text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-wider">Nota Calculada:</span>
            <span className={`text-2xl font-extrabold px-3 py-1 rounded-lg tracking-tight transition-colors ${getScoreStyleClass(score)}`}>
              {score}
            </span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300 text-xs font-bold rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
            >
              Salvar Monitoria
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
