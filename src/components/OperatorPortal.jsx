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
  FileText
} from 'lucide-react';

export default function OperatorPortal({ 
  currentUser, 
  operator, 
  monitorings = [] 
}) {
  const [selectedMonitoring, setSelectedMonitoring] = useState(null);

  // Filtrar apenas as monitorias deste operador
  const myMonitorings = monitorings.filter(m => m.operator_id === operator?.id);

  // KPIs
  const totalMonitorings = myMonitorings.length;
  const avgScore = totalMonitorings > 0 
    ? Math.round(myMonitorings.reduce((sum, m) => sum + (parseFloat(m.score) || 0), 0) / totalMonitorings) 
    : 0;

  const feedbacksReceived = myMonitorings.filter(m => m.status === 'Feedback Concluído' || m.feedback_date).length;
  const pendingFeedbacks = myMonitorings.filter(m => m.status === 'Aguardando Feedback' || (!m.feedback_date && m.status !== 'Liberado')).length;

  const getScoreColor = (score) => {
    if (score >= 90) return 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800';
    if (score >= 80) return 'text-blue-500 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800';
    if (score >= 70) return 'text-amber-500 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800';
    return 'text-rose-500 bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800';
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
            <div className="flex flex-wrap gap-4 text-xs text-blue-100 font-medium">
              <span><strong>Matrícula:</strong> {operator?.matricula || 'N/D'}</span>
              <span>•</span>
              <span><strong>Supervisor:</strong> {operator?.supervisor_name || 'Sem Supervisor'}</span>
              <span>•</span>
              <span><strong>Turno:</strong> {operator?.schedule || '08:00 - 17:12'}</span>
              <span>•</span>
              <span><strong>Skill:</strong> {operator?.skill || 'Voz'}</span>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/20 text-center min-w-[150px]">
            <span className="text-xs text-blue-100 uppercase tracking-wider font-semibold block">
              Sua Média Geral
            </span>
            <span className="text-3xl font-extrabold tracking-tight">
              {avgScore}%
            </span>
            <span className="text-[11px] text-blue-200 block mt-0.5">
              {avgScore >= 85 ? '🌟 Desempenho Excelente' : avgScore >= 75 ? '👍 Bom Desempenho' : '📈 Oportunidade de Melhoria'}
            </span>
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
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Total de Avaliações</span>
            <h4 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{totalMonitorings}</h4>
          </div>
        </div>

        <div className="bg-white dark:bg-[#0c0c0f] p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-xl">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Feedbacks Realizados</span>
            <h4 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{feedbacksReceived}</h4>
          </div>
        </div>

        <div className="bg-white dark:bg-[#0c0c0f] p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-600 rounded-xl">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Aguardando Feedback</span>
            <h4 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{pendingFeedbacks}</h4>
          </div>
        </div>
      </div>

      {/* Tabela de Monitorias */}
      <div className="bg-white dark:bg-[#0c0c0f] rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-500" />
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Histórico das Suas Monitorias ({myMonitorings.length})
            </h3>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-900/40 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-800">
                <th className="px-6 py-3.5">Data da Avaliação</th>
                <th className="px-6 py-3.5">Monitora Avaliadora</th>
                <th className="px-6 py-3.5 text-center">Nota / Score</th>
                <th className="px-6 py-3.5 text-center">Situação do Feedback</th>
                <th className="px-6 py-3.5 text-right">Ver Detalhes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-sm text-zinc-800 dark:text-zinc-200">
              {myMonitorings.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-12 text-zinc-500 text-xs">
                    Nenhuma monitoria registrada para o seu perfil até o momento.
                  </td>
                </tr>
              ) : (
                myMonitorings.map(m => (
                  <tr key={m.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/30 transition-colors">
                    <td className="px-6 py-3.5 text-xs font-medium">
                      {m.monitoring_date ? new Date(m.monitoring_date).toLocaleDateString('pt-BR') : '--'}
                    </td>
                    <td className="px-6 py-3.5 text-xs text-zinc-600 dark:text-zinc-300 font-semibold">
                      {m.q_monitors?.name || 'Qualidade 156'}
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${getScoreColor(m.score)}`}>
                        {Math.round(m.score)}%
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                        m.status === 'Feedback Concluído'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                      }`}>
                        {m.status || 'Pendente'}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <button
                        onClick={() => setSelectedMonitoring(m)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-lg text-xs font-bold transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Ver Ficha
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Detalhado da Monitoria */}
      {selectedMonitoring && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#0c0c0f] w-full max-w-2xl rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            
            {/* Header Modal */}
            <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-900/20">
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Detalhes da Monitoria
                </h3>
                <p className="text-xs text-zinc-500">
                  Realizada em {selectedMonitoring.monitoring_date ? new Date(selectedMonitoring.monitoring_date).toLocaleDateString('pt-BR') : '--'}
                </p>
              </div>
              <button 
                onClick={() => setSelectedMonitoring(null)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conteúdo com Scroll */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
              
              {/* Score & NCG */}
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

              {/* Checklist de Critérios */}
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
                        item.status === 'Conforme' || item.status === true
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : item.status === 'Parcial'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400'
                      }`}>
                        {typeof item.status === 'boolean' ? (item.status ? 'Conforme' : 'Não Conforme') : (item.status || 'Conforme')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Feedback e Orientações do Supervisor */}
              <div className="space-y-2 bg-blue-50/50 dark:bg-blue-950/20 p-4 rounded-xl border border-blue-200 dark:border-blue-900/30">
                <div className="flex items-center gap-2 text-blue-900 dark:text-blue-300 font-bold">
                  <MessageSquare className="w-4 h-4" />
                  <span>Observações & Apontamentos de Feedback</span>
                </div>
                <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
                  {selectedMonitoring.feedback_notes || 'Nenhum apontamento adicional inserido pelo supervisor para esta avaliação.'}
                </p>
                {selectedMonitoring.feedback_date && (
                  <span className="text-[11px] text-zinc-500 block pt-2">
                    Feedback aplicado em: {new Date(selectedMonitoring.feedback_date).toLocaleString('pt-BR')}
                  </span>
                )}
              </div>

            </div>

            {/* Footer Modal */}
            <div className="px-6 py-3 border-t border-zinc-200 dark:border-zinc-800 flex justify-end bg-zinc-50/50 dark:bg-zinc-900/20">
              <button
                onClick={() => setSelectedMonitoring(null)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-900 text-white rounded-lg font-bold text-xs"
              >
                Fechar
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
