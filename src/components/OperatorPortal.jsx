import React, { useState } from 'react';
import { 
  Award, 
  Calendar, 
  Clock, 
  User, 
  MessageSquare, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Eye, 
  X,
  Sparkles,
  TrendingUp,
  FileText,
  KeyRound,
  HeartHandshake,
  Lightbulb,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function OperatorPortal({ 
  currentUser, 
  operator, 
  monitorings = [],
  audits = []
}) {
  const [activeSubTab, setActiveSubTab] = useState('monitorings'); // 'monitorings' | 'audits'
  const [selectedMonitoring, setSelectedMonitoring] = useState(null);
  const [selectedAudit, setSelectedAudit] = useState(null);

  // Estados do Modal de Alteração de Senha
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdError, setPwdError] = useState('');
  const [pwdSuccess, setPwdSuccess] = useState('');

  // Filtrar apenas as monitorias e auditorias deste operador
  const myMonitorings = monitorings.filter(m => m.operator_id === operator?.id);
  const myAudits = audits.filter(a => a.operator_id === operator?.id);

  // KPIs
  const totalMonitorings = myMonitorings.length;
  const avgScore = totalMonitorings > 0 
    ? Math.round(myMonitorings.reduce((sum, m) => sum + (parseFloat(m.score) || 0), 0) / totalMonitorings) 
    : 0;

  const feedbacksReceived = myMonitorings.filter(m => m.status === 'Feedback Concluído' || m.feedback_date).length;

  const getScoreColor = (score) => {
    if (score >= 90) return 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800';
    if (score >= 80) return 'text-blue-500 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800';
    if (score >= 70) return 'text-amber-500 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800';
    return 'text-rose-500 bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800';
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setPwdError('');
    setPwdSuccess('');

    if (newPassword.length < 6) {
      setPwdError('A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPwdError('As senhas digitadas não coincidem.');
      return;
    }

    setPwdLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      setPwdSuccess('Senha alterada com sucesso! Utilize-a nos próximos acessos.');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setShowPasswordModal(false);
        setPwdSuccess('');
      }, 1500);
    } catch (err) {
      console.error(err);
      setPwdError(err.message || 'Erro ao atualizar senha.');
    } finally {
      setPwdLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      
      {/* Welcome & Profile Card */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-800 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              Painel do Colaborador 156
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight">
              Olá, {operator?.name || currentUser?.name}!
            </h2>
            <div className="flex flex-wrap items-center gap-4 text-xs text-blue-100 font-medium">
              <span><strong>Matrícula:</strong> {operator?.matricula || currentUser?.matricula || 'N/D'}</span>
              <span>•</span>
              <span><strong>Supervisor:</strong> {operator?.supervisor_name || 'Geral'}</span>
              <span>•</span>
              <span><strong>Turno:</strong> {operator?.schedule || '08:00 - 17:12'}</span>
              <span>•</span>
              <span><strong>Skill:</strong> {operator?.skill || 'Voz'}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/20 text-center min-w-[140px]">
              <span className="text-xs text-blue-100 uppercase tracking-wider font-semibold block">
                Sua Média Geral
              </span>
              <span className="text-3xl font-extrabold tracking-tight">
                {avgScore}%
              </span>
              <span className="text-[11px] text-blue-200 block mt-0.5">
                {avgScore >= 85 ? '🌟 Desempenho Excelente' : avgScore >= 75 ? '👍 Bom Desempenho' : '📈 Em Desenvolvimento'}
              </span>
            </div>

            <button
              onClick={() => {
                setPwdError('');
                setPwdSuccess('');
                setShowPasswordModal(true);
              }}
              className="px-3.5 py-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-md text-white border border-white/30 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <KeyRound className="w-4 h-4" />
              Alterar Senha
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white dark:bg-[#0c0c0f] p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-xl">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Avaliações com Nota</span>
            <h4 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{totalMonitorings}</h4>
          </div>
        </div>

        <div className="bg-white dark:bg-[#0c0c0f] p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-xl">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Feedbacks Concluídos</span>
            <h4 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{feedbacksReceived}</h4>
          </div>
        </div>

        <div className="bg-white dark:bg-[#0c0c0f] p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 rounded-xl">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Auditorias Formativas</span>
            <h4 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{myAudits.length}</h4>
          </div>
        </div>
      </div>

      {/* Navegação entre Abas do Operador */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800 gap-6">
        <button
          onClick={() => setActiveSubTab('monitorings')}
          className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
            activeSubTab === 'monitorings'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
        >
          <Award className="w-4 h-4" />
          Histórico de Monitorias ({myMonitorings.length})
        </button>

        <button
          onClick={() => setActiveSubTab('audits')}
          className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
            activeSubTab === 'audits'
              ? 'border-purple-600 text-purple-600 dark:text-purple-400'
              : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          Auditorias de Desenvolvimento ({myAudits.length})
        </button>
      </div>

      {/* ABA 1: MONITORIAS COM NOTA */}
      {activeSubTab === 'monitorings' && (
        <div className="bg-white dark:bg-[#0c0c0f] rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-zinc-200 dark:border-zinc-800">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Suas Avaliações de Qualidade
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Consulte as notas obtidas e as orientações deixadas nas monitorias.
            </p>
          </div>

          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {myMonitorings.length === 0 ? (
              <div className="text-center py-16 text-zinc-500 text-xs">
                Nenhuma monitoria registrada para o seu usuário até o momento.
              </div>
            ) : (
              myMonitorings.map((m) => {
                const dateFormatted = m.monitoring_date 
                  ? new Date(m.monitoring_date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
                  : 'N/D';

                return (
                  <div 
                    key={m.id}
                    className="p-5 hover:bg-zinc-50 dark:hover:bg-zinc-900/30 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-xl border flex flex-col items-center justify-center font-extrabold text-lg shadow-sm ${getScoreColor(m.score)}`}>
                        <span>{Math.round(m.score)}%</span>
                        <span className="text-[9px] uppercase tracking-tighter opacity-80 font-bold">Nota</span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                            Avaliação em {dateFormatted}
                          </span>
                          {m.is_ncg && (
                            <span className="text-[10px] bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-400 px-2 py-0.2 rounded font-bold">
                              NCG
                            </span>
                          )}
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                            m.status === 'Feedback Concluído' 
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' 
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                          }`}>
                            {m.status || 'Aguardando Feedback'}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                          <span>Monitor(a): <strong>{m.q_monitors?.name || 'Monitoria'}</strong></span>
                          {m.feedback_date && (
                            <>
                              <span>•</span>
                              <span>Feedback realizado em: <strong>{new Date(m.feedback_date).toLocaleDateString('pt-BR')}</strong></span>
                              {m.feedback_given_by_name && (
                                <span>por <strong>{m.feedback_given_by_name}</strong></span>
                              )}
                            </>
                          )}
                        </div>

                        {(m.feedback_parecer || m.feedback_notes) && (
                          <div className="pt-1.5">
                            <span className="text-[11px] font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider block">Parecer do Feedback:</span>
                            <p className="text-xs text-zinc-700 dark:text-zinc-300 italic max-w-xl line-clamp-3">
                              "{m.feedback_parecer || m.feedback_notes}"
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedMonitoring(m)}
                      className="px-3.5 py-2 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 self-end md:self-center cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Ver Ficha Completa
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ABA 2: AUDITORIAS DE DESENVOLVIMENTO (SEM NOTA) */}
      {activeSubTab === 'audits' && (
        <div className="bg-white dark:bg-[#0c0c0f] rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-zinc-200 dark:border-zinc-800">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              Auditorias de Desenvolvimento & Mentoria
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Feedbacks formativos sem nota numérica com orientações práticas para aprimorar seu atendimento.
            </p>
          </div>

          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {myAudits.length === 0 ? (
              <div className="text-center py-16 text-zinc-500 text-xs">
                Nenhuma auditoria formativa registrada até o momento.
              </div>
            ) : (
              myAudits.map((a) => {
                const dateFormatted = a.audit_date 
                  ? new Date(a.audit_date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
                  : 'N/D';

                return (
                  <div 
                    key={a.id}
                    className="p-5 hover:bg-zinc-50 dark:hover:bg-zinc-900/30 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                          {a.topic || 'Desenvolvimento Geral'}
                        </span>
                        <span className="text-[10px] bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300 px-2 py-0.5 rounded-full font-bold">
                          Sem Nota
                        </span>
                        <span className="text-[10px] text-zinc-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {dateFormatted}
                        </span>
                      </div>

                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Avaliador: <strong className="text-blue-600 dark:text-blue-400">{a.auditor_name}</strong> ({a.auditor_role === 'supervisor' ? 'Supervisor' : 'Monitor'})
                        {a.call_protocol && <span> • Protocolo: <strong>{a.call_protocol}</strong></span>}
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        {a.strengths && (
                          <div className="text-[11px] bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/30 p-2 rounded-lg text-emerald-900 dark:text-emerald-300 flex items-start gap-1.5">
                            <HeartHandshake className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                            <span className="line-clamp-2"><strong>Destaque:</strong> {a.strengths}</span>
                          </div>
                        )}
                        {a.improvements && (
                          <div className="text-[11px] bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/30 p-2 rounded-lg text-amber-900 dark:text-amber-300 flex items-start gap-1.5">
                            <Lightbulb className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                            <span className="line-clamp-2"><strong>Ajuste recomendado:</strong> {a.improvements}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedAudit(a)}
                      className="px-3.5 py-2 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 self-end md:self-center cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Ver Detalhes
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: DETALHES DA MONITORIA COM NOTA */}
      {selectedMonitoring && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#0c0c0f] w-full max-w-2xl rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-900/20">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Ficha de Avaliação da Monitoria
              </h3>
              <button 
                onClick={() => setSelectedMonitoring(null)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
              <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-zinc-200 dark:border-zinc-800">
                <div>
                  <span className="text-xs text-zinc-500 font-semibold uppercase tracking-wider block">Nota Final</span>
                  <span className="text-2xl font-extrabold text-blue-600 dark:text-blue-400">
                    {Math.round(selectedMonitoring.score)}%
                  </span>
                </div>
                <div>
                  <span className="text-xs text-zinc-500 font-semibold uppercase tracking-wider block">Não Conformidade Grave</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    selectedMonitoring.is_ncg 
                      ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400'
                      : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                  }`}>
                    {selectedMonitoring.is_ncg ? 'Sim (NCG Aplicada)' : 'Não (Conforme)'}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider text-xs">
                  Critérios Avaliados no Checklist
                </h4>

                <div className="space-y-2">
                  {(selectedMonitoring.checklist || []).map((item, idx) => (
                    <div 
                      key={idx} 
                      className="p-3 bg-zinc-50/50 dark:bg-zinc-900/30 rounded-lg border border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-4"
                    >
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                        {item.label}
                      </span>
                      <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                        item.value === 'Sim' || item.status === 'Conforme' || item.status === true
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : item.value === 'Não' || item.status === 'Não Conforme' || item.status === false
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400'
                          : 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300'
                      }`}>
                        {item.value || (typeof item.status === 'boolean' ? (item.status ? 'Sim' : 'Não') : (item.status || 'Sim'))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3 bg-blue-50/50 dark:bg-blue-950/20 p-5 rounded-xl border border-blue-200 dark:border-blue-900/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-blue-900 dark:text-blue-300 font-bold">
                    <MessageSquare className="w-4 h-4" />
                    <span>Parecer do Feedback & Orientações</span>
                  </div>
                  <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold ${
                    selectedMonitoring.status === 'Feedback Concluído'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-400'
                  }`}>
                    {selectedMonitoring.status || 'Aguardando Feedback'}
                  </span>
                </div>

                {selectedMonitoring.feedback_date && (
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400 flex flex-wrap gap-2 pb-2 border-b border-blue-200/50 dark:border-blue-900/30">
                    <span>Feedback aplicado em: <strong>{new Date(selectedMonitoring.feedback_date).toLocaleString('pt-BR')}</strong></span>
                    {selectedMonitoring.feedback_given_by_name && (
                      <span>• Avaliador(a): <strong>{selectedMonitoring.feedback_given_by_name}</strong></span>
                    )}
                  </div>
                )}

                <div className="text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap text-xs">
                  {selectedMonitoring.feedback_parecer ? (
                    <div className="space-y-2">
                      <div className="p-3 bg-white dark:bg-zinc-900/50 rounded-lg border border-blue-200/60 dark:border-blue-900/40">
                        <span className="text-[10px] font-bold text-blue-900 dark:text-blue-300 uppercase tracking-wider block mb-1">Parecer Conclusivo:</span>
                        <p className="whitespace-pre-wrap">{selectedMonitoring.feedback_parecer}</p>
                      </div>
                      {selectedMonitoring.feedback_notes && selectedMonitoring.feedback_notes !== selectedMonitoring.feedback_parecer && (
                        <div className="p-3 bg-white dark:bg-zinc-900/50 rounded-lg border border-blue-200/60 dark:border-blue-900/40">
                          <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block mb-1">Observações & Plano de Ação:</span>
                          <p className="whitespace-pre-wrap">{selectedMonitoring.feedback_notes}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    selectedMonitoring.feedback_notes || 'Nenhum apontamento adicional inserido para esta avaliação.'
                  )}
                </div>
              </div>
            </div>

            <div className="px-6 py-3 border-t border-zinc-200 dark:border-zinc-800 flex justify-end bg-zinc-50/50 dark:bg-zinc-900/20">
              <button
                onClick={() => setSelectedMonitoring(null)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-900 text-white rounded-lg font-bold text-xs cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: DETALHES DA AUDITORIA FORMATIVA */}
      {selectedAudit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#0c0c0f] w-full max-w-2xl rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-900/20">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-600" />
                Auditoria de Desenvolvimento: {selectedAudit.topic}
              </h3>
              <button 
                onClick={() => setSelectedAudit(null)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              <div className="bg-zinc-50 dark:bg-zinc-900/40 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 flex justify-between">
                <div>
                  <span className="text-zinc-400 block">Avaliador</span>
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">{selectedAudit.auditor_name}</span>
                </div>
                <div>
                  <span className="text-zinc-400 block">Data</span>
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">
                    {new Date(selectedAudit.audit_date).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                {selectedAudit.call_protocol && (
                  <div>
                    <span className="text-zinc-400 block">Protocolo</span>
                    <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">{selectedAudit.call_protocol}</span>
                  </div>
                )}
              </div>

              {selectedAudit.strengths && (
                <div className="space-y-1 bg-emerald-50/50 dark:bg-emerald-950/20 p-4 rounded-xl border border-emerald-200/80 dark:border-emerald-900/30">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-900 dark:text-emerald-300">
                    <HeartHandshake className="w-4 h-4 text-emerald-600" />
                    <span>Pontos Fortes & Destaques</span>
                  </div>
                  <p className="text-zinc-800 dark:text-zinc-200 leading-relaxed whitespace-pre-wrap">
                    {selectedAudit.strengths}
                  </p>
                </div>
              )}

              {selectedAudit.improvements && (
                <div className="space-y-1 bg-amber-50/50 dark:bg-amber-950/20 p-4 rounded-xl border border-amber-200/80 dark:border-amber-900/30">
                  <div className="flex items-center gap-1.5 font-bold text-amber-900 dark:text-amber-300">
                    <Lightbulb className="w-4 h-4 text-amber-600" />
                    <span>Oportunidades de Melhoria</span>
                  </div>
                  <p className="text-zinc-800 dark:text-zinc-200 leading-relaxed whitespace-pre-wrap">
                    {selectedAudit.improvements}
                  </p>
                </div>
              )}

              {selectedAudit.action_plan && (
                <div className="space-y-1 bg-blue-50/50 dark:bg-blue-950/20 p-4 rounded-xl border border-blue-200/80 dark:border-blue-900/30">
                  <div className="flex items-center gap-1.5 font-bold text-blue-900 dark:text-blue-300">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span>Orientações Práticas & Plano de Ação</span>
                  </div>
                  <p className="text-zinc-800 dark:text-zinc-200 leading-relaxed whitespace-pre-wrap">
                    {selectedAudit.action_plan}
                  </p>
                </div>
              )}

              {selectedAudit.general_notes && (
                <div className="space-y-1 bg-zinc-50 dark:bg-zinc-900/30 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800">
                  <span className="font-semibold text-zinc-500">Observações Adicionais:</span>
                  <p className="text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
                    {selectedAudit.general_notes}
                  </p>
                </div>
              )}
            </div>

            <div className="px-6 py-3 border-t border-zinc-200 dark:border-zinc-800 flex justify-end bg-zinc-50/50 dark:bg-zinc-900/20">
              <button
                onClick={() => setSelectedAudit(null)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-900 text-white rounded-lg font-bold text-xs cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: ALTERAR SENHA DO OPERADOR */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#0c0c0f] w-full max-w-md rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-900/20">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-blue-500" />
                Alterar Minha Senha de Acesso
              </h3>
              <button 
                onClick={() => setShowPasswordModal(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdatePassword} className="p-6 space-y-4 text-xs">
              {pwdError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-400 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{pwdError}</span>
                </div>
              )}

              {pwdSuccess && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-400 rounded-lg flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{pwdSuccess}</span>
                </div>
              )}

              <p className="text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Você pode trocar a senha padrão inicial por uma nova senha pessoal de no mínimo 6 caracteres:
              </p>

              <div className="space-y-1.5">
                <label className="font-semibold text-zinc-600 dark:text-zinc-400">Nova Senha</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-white dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-zinc-950 dark:text-zinc-100"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-zinc-600 dark:text-zinc-400">Confirmar Nova Senha</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-white dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-zinc-950 dark:text-zinc-100"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  disabled={pwdLoading}
                  className="px-4 py-2 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold rounded-lg transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={pwdLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {pwdLoading ? 'Salvando...' : 'Salvar Nova Senha'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
