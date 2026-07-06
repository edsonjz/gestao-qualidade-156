import React, { useState, useEffect } from 'react';
import { X, CheckCircle, Clock, ShieldAlert } from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function FeedbackModal({ operator, onClose, onSave }) {
  const [monitoring, setMonitoring] = useState(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Buscar a monitoria pendente deste operador
    async function fetchPending() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('q_monitorings')
          .select('id, score, monitoring_date, feedback_notes, status, q_monitors(name)')
          .eq('operator_id', operator.id)
          .eq('status', 'Aguardando Feedback')
          .order('monitoring_date', { ascending: false })
          .limit(1)
          .single();

        if (error) throw error;
        setMonitoring(data);
        setNotes(data.feedback_notes || '');
      } catch (err) {
        console.error('Erro ao buscar monitoria pendente:', err);
      } finally {
        setLoading(false);
      }
    }

    if (operator) {
      fetchPending();
    }
  }, [operator]);

  const handleSave = () => {
    onSave({
      monitoring_id: monitoring.id,
      operator_id: operator.id,
      feedback_notes: notes,
      feedback_date: new Date().toISOString()
    });
  };

  // Cores de notas
  const getScoreStyleClass = (val) => {
    if (val === 0) return 'text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-950/30';
    if (val >= 90) return 'text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/30';
    if (val >= 80) return 'text-orange-500 dark:text-orange-400 bg-orange-100 dark:bg-orange-950/30';
    return 'text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-950/30';
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm no-print">
      <div className="bg-white dark:bg-[#0c0c0f] w-full max-w-2xl rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        
        {/* Header Modal */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-900/10">
          <div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Registro de Feedback</h3>
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

        {loading ? (
          <div className="flex-1 p-10 text-center text-zinc-500 dark:text-zinc-400">
            Buscando dados da monitoria...
          </div>
        ) : !monitoring ? (
          <div className="flex-1 p-10 text-center text-zinc-500 dark:text-zinc-400">
            Nenhuma monitoria pendente de feedback encontrada para este operador.
          </div>
        ) : (
          <>
            {/* Conteúdo Formulário (Rolável) */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Infobox Nota */}
              <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-900/30 rounded-xl border border-zinc-200 dark:border-zinc-800/40">
                <div className="space-y-0.5">
                  <span className="text-[10px] text-zinc-400 block font-bold uppercase">Nota da Monitoria</span>
                  <span className={`text-2xl font-extrabold px-3 py-1 rounded-lg tracking-tight ${getScoreStyleClass(monitoring.score)}`}>
                    {monitoring.score}
                  </span>
                </div>
                <div className="text-right text-xs text-zinc-500 dark:text-zinc-400">
                  <p>Realizada por: <strong>{monitoring.q_monitors?.name || 'Clarice'}</strong></p>
                  <p className="mt-0.5">Data: {new Date(monitoring.monitoring_date).toLocaleString()}</p>
                </div>
              </div>

              {/* Detalhamento do Checklist Respondido */}
              {monitoring.checklist && monitoring.checklist.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Itens Avaliados</h4>
                  <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg divide-y divide-zinc-200 dark:divide-zinc-800 overflow-hidden text-xs">
                    {monitoring.checklist.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center p-3 hover:bg-zinc-50 dark:hover:bg-zinc-900/30 transition-colors">
                        <div>
                          <p className="font-bold text-zinc-800 dark:text-zinc-200">{item.label}</p>
                          <p className="text-[10px] text-zinc-400">Peso: {item.weight} pts</p>
                        </div>
                        <span className={`font-bold px-2 py-0.5 rounded text-[10px] uppercase ${
                          item.value === 'Sim'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400'
                            : item.value === 'Não'
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/20 dark:text-rose-400'
                              : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-850 dark:text-zinc-400'
                        }`}>
                          {item.value === 'Sim' ? 'Conforme' : item.value === 'Não' ? 'Não Conforme' : 'N/A'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notas/Justificativas de Monitoração */}
              {monitoring.feedback_notes && (
                <div className="p-3 bg-zinc-50 dark:bg-zinc-900/20 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs">
                  <span className="text-zinc-400 block font-bold uppercase mb-1">Notas do Monitoramento</span>
                  <p className="text-zinc-700 dark:text-zinc-300 italic">"{monitoring.feedback_notes}"</p>
                </div>
              )}

              {/* Formulário de Registro do Feedback de Reciclagem */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Notas do Feedback / Plano de Ação Acordado
                </label>
                <textarea
                  rows="4"
                  placeholder="Escreva quais pontos foram repassados com o operador, quais foram suas dificuldades e o plano de ação acertado para melhoria das notas..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-[#ffffff] dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-zinc-950 dark:text-zinc-100"
                ></textarea>
              </div>
            </div>

            {/* Footer Modal */}
            <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/10">
              <span className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                <InfoIcon className="w-4 h-4 text-blue-500" />
                Liberará o operador na fila inteligente automaticamente.
              </span>

              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300 text-xs font-bold rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm flex items-center gap-1"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  Concluir e Liberar
                </button>
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );
}

function InfoIcon(props) {
  return (
    <svg 
      {...props} 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  );
}
