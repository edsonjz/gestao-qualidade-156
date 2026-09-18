import React, { useState, useEffect } from 'react';
import { X, Sparkles, UserCheck, HeartHandshake, Lightbulb, FileText } from 'lucide-react';

export default function AuditModal({ 
  operator, 
  auditor, 
  onClose, 
  onSave, 
  audit = null 
}) {
  const [topic, setTopic] = useState(audit?.topic || 'Atendimento e Postura');
  const [callProtocol, setCallProtocol] = useState(audit?.call_protocol || '');
  const [callDuration, setCallDuration] = useState(audit?.call_duration || '');
  const [strengths, setStrengths] = useState(audit?.strengths || '');
  const [improvements, setImprovements] = useState(audit?.improvements || '');
  const [actionPlan, setActionPlan] = useState(audit?.action_plan || '');
  const [generalNotes, setGeneralNotes] = useState(audit?.general_notes || '');
  const [status, setStatus] = useState(audit?.status || 'Realizada');
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!strengths.trim() && !improvements.trim()) {
      alert('Por favor, preencha ao menos os pontos fortes ou pontos a desenvolver para registrar a auditoria.');
      return;
    }

    setIsSaving(true);
    const payload = {
      operator_id: operator.id,
      auditor_id: auditor?.id || null,
      auditor_name: auditor?.name || 'Avaliador',
      auditor_role: auditor?.role || 'monitor',
      call_protocol: callProtocol.trim() || null,
      call_duration: callDuration.trim() || null,
      topic: topic,
      strengths: strengths.trim(),
      improvements: improvements.trim(),
      action_plan: actionPlan.trim(),
      general_notes: generalNotes.trim(),
      status: status
    };

    if (audit?.id) {
      payload.id = audit.id;
    }

    try {
      await onSave(payload);
    } finally {
      setIsSaving(false);
    }
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
        className="bg-white dark:bg-[#0c0c0f] w-full max-w-3xl rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header Modal */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-900/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                {audit ? 'Detalhes da Auditoria' : 'Nova Auditoria de Desenvolvimento'}
                <span className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  Sem Nota • Formativa
                </span>
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Operador: <strong>{operator.name}</strong> {operator.matricula ? `(${operator.matricula})` : ''} • Sup: <strong>{operator.supervisor_name || 'Geral'}</strong>
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulário Rolável */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
          
          {/* Card de Ficha Rápida do Operador e Avaliador */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-zinc-50 dark:bg-zinc-900/30 p-3.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800/60">
            <div>
              <span className="text-[11px] text-zinc-400 block mb-0.5">Avaliador(a)</span>
              <span className="font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5" />
                {auditor?.name || 'Avaliador'}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-zinc-400 block mb-0.5">Perfil do Avaliador</span>
              <span className="font-semibold text-zinc-700 dark:text-zinc-300 capitalize">
                {auditor?.role === 'supervisor' ? 'Supervisor(a)' : auditor?.role === 'monitor' ? 'Monitor(a)' : 'Administrador'}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-zinc-400 block mb-0.5">Horário / Turno</span>
              <span className="font-semibold text-zinc-700 dark:text-zinc-300">{operator.schedule || 'Padrão'}</span>
            </div>
            <div>
              <span className="text-[11px] text-zinc-400 block mb-0.5">Skill</span>
              <span className="font-semibold text-zinc-700 dark:text-zinc-300">{operator.skill || 'Voz'}</span>
            </div>
          </div>

          {/* Dados do Atendimento Auditado */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider text-[10px]">
                Tema Principal da Auditoria
              </label>
              <select
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full bg-white dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs shadow-sm font-semibold text-zinc-900 dark:text-zinc-100 outline-none"
              >
                <option value="Atendimento e Postura">Atendimento, Postura e Empatia</option>
                <option value="Procedimentos 156">Procedimentos e Regras 156</option>
                <option value="Comunicação e Clareza">Comunicação, Clareza e Dicção</option>
                <option value="Navegação em Sistemas">Agilidade e Navegação em Sistemas</option>
                <option value="Acompanhamento e Reciclagem">Acompanhamento / Reciclagem</option>
                <option value="Geral">Desenvolvimento Geral</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider text-[10px]">
                Protocolo do Atendimento (Opcional)
              </label>
              <input
                type="text"
                placeholder="Ex: 2026/156-987654"
                value={callProtocol}
                onChange={(e) => setCallProtocol(e.target.value)}
                className="w-full bg-white dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs shadow-sm text-zinc-900 dark:text-zinc-100 outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider text-[10px]">
                Duração da Chamada / Contato
              </label>
              <input
                type="text"
                placeholder="Ex: 03:45"
                value={callDuration}
                onChange={(e) => setCallDuration(e.target.value)}
                className="w-full bg-white dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs shadow-sm text-zinc-900 dark:text-zinc-100 outline-none"
              />
            </div>
          </div>

          {/* 1. Pontos Fortes e Destaques Positivos */}
          <div className="space-y-1.5 bg-emerald-50/40 dark:bg-emerald-950/10 p-4 rounded-xl border border-emerald-200/80 dark:border-emerald-900/30">
            <label className="font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5 text-xs">
              <HeartHandshake className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Pontos Fortes e Boas Práticas Observadas
            </label>
            <p className="text-[11px] text-emerald-700/90 dark:text-emerald-400/80">
              Destaque o que o operador fez com excelência (ex: cordialidade, clareza na resposta, empatia, escuta ativa).
            </p>
            <textarea
              rows="3"
              required
              placeholder="Descreva os pontos positivos que merecem reconhecimento..."
              value={strengths}
              onChange={(e) => setStrengths(e.target.value)}
              className="w-full bg-white dark:bg-[#09090b] border border-emerald-200 dark:border-emerald-800/60 rounded-lg p-3 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-zinc-950 dark:text-zinc-100"
            />
          </div>

          {/* 2. Oportunidades de Desenvolvimento */}
          <div className="space-y-1.5 bg-amber-50/40 dark:bg-amber-950/10 p-4 rounded-xl border border-amber-200/80 dark:border-amber-900/30">
            <label className="font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5 text-xs">
              <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              Oportunidades de Melhoria & O que Pode Desenvolver
            </label>
            <p className="text-[11px] text-amber-700/90 dark:text-amber-400/80">
              Aponte de forma construtiva pontos onde o operador pode evoluir (sem caráter punitivo, foco em aprendizado).
            </p>
            <textarea
              rows="3"
              placeholder="Descreva pontos de atenção ou ajustes recomendados no atendimento..."
              value={improvements}
              onChange={(e) => setImprovements(e.target.value)}
              className="w-full bg-white dark:bg-[#09090b] border border-amber-200 dark:border-amber-800/60 rounded-lg p-3 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 text-zinc-950 dark:text-zinc-100"
            />
          </div>

          {/* 3. Plano de Ação e Orientações Práticas */}
          <div className="space-y-1.5 bg-blue-50/40 dark:bg-blue-950/10 p-4 rounded-xl border border-blue-200/80 dark:border-blue-900/30">
            <label className="font-bold text-blue-900 dark:text-blue-300 flex items-center gap-1.5 text-xs">
              <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Orientações Práticas & Plano de Ação Conjunto
            </label>
            <p className="text-[11px] text-blue-700/90 dark:text-blue-400/80">
              Dicas práticas, caminhos ou combinados estabelecidos para que o operador aplique nos próximos atendimentos.
            </p>
            <textarea
              rows="2"
              placeholder="Ex: Praticar confirmação do endereço com o munícipe antes de registrar o protocolo..."
              value={actionPlan}
              onChange={(e) => setActionPlan(e.target.value)}
              className="w-full bg-white dark:bg-[#09090b] border border-blue-200 dark:border-blue-800/60 rounded-lg p-3 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-zinc-950 dark:text-zinc-100"
            />
          </div>

          {/* Observações Adicionais */}
          <div className="space-y-1.5">
            <label className="font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-[10px]">
              Observações Gerais (Opcional)
            </label>
            <textarea
              rows="2"
              placeholder="Anotações internas do monitor ou supervisor..."
              value={generalNotes}
              onChange={(e) => setGeneralNotes(e.target.value)}
              className="w-full bg-white dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-zinc-950 dark:text-zinc-100"
            />
          </div>

          {/* Footer com botões */}
          <div className="flex items-center justify-between pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-zinc-500">Status:</span>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="bg-white dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1 text-xs text-zinc-800 dark:text-zinc-200 outline-none"
              >
                <option value="Realizada">Realizada</option>
                <option value="Em Acompanhamento">Em Acompanhamento</option>
                <option value="Concluída">Concluída</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="px-4 py-2 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold rounded-lg transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSaving ? 'Salvando...' : 'Salvar Auditoria'}
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
}
