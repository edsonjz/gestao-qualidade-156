import React, { useState, useEffect } from 'react';
import { X, CheckCircle, Clock, ShieldAlert, UserCheck, MessageSquare, AlertCircle, FileText } from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function FeedbackModal({ 
  operator, 
  currentUser, 
  onClose, 
  onSave, 
  targetMonitoring = null 
}) {
  const [monitoring, setMonitoring] = useState(targetMonitoring);
  const [parecer, setParecer] = useState('');
  const [actionPlan, setActionPlan] = useState('');
  const [confirmedCheck, setConfirmedCheck] = useState(false);
  const [loading, setLoading] = useState(!targetMonitoring);
  const [isSaving, setIsSaving] = useState(false);

  // Fechar ao pressionar a tecla Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (targetMonitoring) {
      setMonitoring(targetMonitoring);
      setParecer(targetMonitoring.feedback_parecer || targetMonitoring.feedback_notes || '');
      setLoading(false);
      return;
    }

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
          .maybeSingle();

        if (error) throw error;
        setMonitoring(data);
        setParecer(data?.feedback_notes || '');
      } catch (err) {
        console.error('Erro ao buscar monitoria pendente:', err);
      } finally {
        setLoading(false);
      }
    }

    if (operator) {
      fetchPending();
    }
  }, [operator, targetMonitoring]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!parecer.trim()) {
      alert('Por favor, informe o Parecer do Feedback para concluir o registro.');
      return;
    }
    if (!confirmedCheck) {
      alert('Por favor, marque a caixa confirmando a realização do feedback com o colaborador.');
      return;
    }

    setIsSaving(true);
    try {
      const fullNotes = actionPlan.trim() 
        ? `${parecer.trim()}\n\n[Plano de Ação]: ${actionPlan.trim()}`
        : parecer.trim();

      await onSave({
        monitoring_id: monitoring.id,
        operator_id: operator.id,
        feedback_notes: fullNotes,
        feedback_parecer: parecer.trim(),
        feedback_given_by_name: currentUser?.name || 'Avaliador',
        feedback_given_by_role: currentUser?.role || 'supervisor',
        feedback_date: new Date().toISOString()
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Cores de notas
  const getScoreStyleClass = (val) => {
    if (val === 0) return 'text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-950/30';
    if (val >= 90) return 'text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/30';
    if (val >= 80) return 'text-orange-500 dark:text-orange-400 bg-orange-100 dark:bg-orange-950/30';
    return 'text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-950/30';
  };

  return (
    <div 
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm no-print"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className="bg-white dark:bg-[#0c0c0f] w-full max-w-2xl rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header Modal */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-900/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                Registro & Confirmação de Feedback
                <span className="text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  Qualidade 156
                </span>
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Operador: <strong>{operator.name}</strong> {operator.matricula ? `(${operator.matricula})` : ''} • Supervisor: <strong>{operator.supervisor_name || 'Geral'}</strong>
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 p-10 text-center text-zinc-500 dark:text-zinc-400 text-xs">
            Buscando dados da monitoria...
          </div>
        ) : !monitoring ? (
          <div className="flex-1 p-10 text-center text-zinc-500 dark:text-zinc-400 text-xs space-y-2">
            <p>Nenhuma monitoria pendente de feedback encontrada para este colaborador.</p>
            <button 
              onClick={onClose}
              className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 rounded-lg text-xs font-bold transition-colors"
            >
              Fechar
            </button>
          </div>
        ) : (
          <form onSubmit={handleSave} className="flex-1 overflow-y-auto flex flex-col">
            {/* Conteúdo Formulário (Rolável) */}
            <div className="flex-1 p-6 space-y-5 text-xs">
              
              {/* Infobox Nota e Avaliador */}
              <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-900/30 rounded-xl border border-zinc-200 dark:border-zinc-800/40">
                <div className="space-y-0.5">
                  <span className="text-[10px] text-zinc-400 block font-bold uppercase">Nota da Monitoria</span>
                  <span className={`text-2xl font-extrabold px-3 py-1 rounded-lg tracking-tight inline-block ${getScoreStyleClass(monitoring.score)}`}>
                    {monitoring.score}
                  </span>
                </div>
                <div className="text-right text-xs text-zinc-500 dark:text-zinc-400 space-y-0.5">
                  <p>Monitora Responsável: <strong>{monitoring.q_monitors?.name || 'Monitora'}</strong></p>
                  <p>Data da Avaliação: <strong>{monitoring.monitoring_date ? new Date(monitoring.monitoring_date).toLocaleDateString() : 'Hoje'}</strong></p>
                  <p className="text-blue-600 dark:text-blue-400 font-semibold">
                    Aplicando Feedback: <strong>{currentUser?.name || 'Avaliador'}</strong> ({currentUser?.role === 'supervisor' ? 'Supervisão' : currentUser?.role === 'monitor' ? 'Monitoria' : 'Admin'})
                  </p>
                </div>
              </div>

              {/* Detalhamento dos Itens do Checklist */}
              {monitoring.checklist && monitoring.checklist.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Itens Avaliados na Monitoria</h4>
                  <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg divide-y divide-zinc-200 dark:divide-zinc-800 overflow-hidden text-xs max-h-40 overflow-y-auto">
                    {monitoring.checklist.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center p-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-900/30 transition-colors">
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

              {/* Parecer do Feedback (Obrigatório) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider flex items-center justify-between">
                  <span>Parecer Conclusivo do Feedback *</span>
                  <span className="text-[11px] font-normal text-zinc-400 lowercase">visível para o operador</span>
                </label>
                <textarea
                  rows="4"
                  required
                  placeholder="Descreva detalhadamente o parecer do atendimento com o colaborador: pontos alinhados, orientações passadas e como o operador recebeu o feedback..."
                  value={parecer}
                  onChange={(e) => setParecer(e.target.value)}
                  className="w-full bg-[#ffffff] dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-zinc-950 dark:text-zinc-100 leading-relaxed"
                />
              </div>

              {/* Plano de Ação / Recomendações */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Plano de Ação e Metas Acordadas (Opcional)
                </label>
                <textarea
                  rows="2"
                  placeholder="Compromissos acordados com o operador para as próximas ligações e acompanhamento da supervisão..."
                  value={actionPlan}
                  onChange={(e) => setActionPlan(e.target.value)}
                  className="w-full bg-[#ffffff] dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-zinc-950 dark:text-zinc-100"
                />
              </div>

              {/* Checkbox de Confirmação Obrigatória */}
              <div className="p-3.5 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/70 dark:border-blue-900/40 rounded-xl flex items-start gap-3">
                <input
                  type="checkbox"
                  id="confirmFeedbackBox"
                  checked={confirmedCheck}
                  onChange={(e) => setConfirmedCheck(e.target.checked)}
                  required
                  className="w-4 h-4 mt-0.5 accent-blue-600 rounded cursor-pointer"
                />
                <label htmlFor="confirmFeedbackBox" className="text-xs text-zinc-700 dark:text-zinc-300 font-medium cursor-pointer select-none leading-relaxed">
                  Confirmo que realizei o alinhamento de feedback com <strong>{operator.name}</strong>, apresentei os apontamentos da avaliação e o operador está ciente do parecer registrado.
                </label>
              </div>

            </div>

            {/* Footer Modal */}
            <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/10">
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                O operador será liberado na fila inteligente imediatamente após a confirmação.
              </span>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSaving}
                  className="px-4 py-2 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle className="w-4 h-4" />
                  {isSaving ? 'Salvando...' : 'Confirmar e Finalizar Feedback'}
                </button>
              </div>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}
