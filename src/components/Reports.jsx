import React, { useState } from 'react';
import { FileSpreadsheet, FileText, Download, Printer } from 'lucide-react';
import { exportToExcel } from '../utils/xlsxParser';
import { getTurnFromSchedule } from '../utils/distribution';

export default function Reports({ operators, monitorings, monitors, supervisors }) {
  const [selectedReport, setSelectedReport] = useState('geral');

  const reportTypes = [
    { id: 'geral', label: 'Relatório Geral de Monitorias', desc: 'Dados consolidados de todas as monitorias e feedbacks realizados.' },
    { id: 'operadores', label: 'Relatório por Operador', desc: 'Desempenho individual, médias de notas e situação de bloqueio.' },
    { id: 'supervisores', label: 'Relatório de Supervisores', desc: 'Média de notas, volumetria e pendências de feedback agrupados por supervisor.' },
    { id: 'monitoras', label: 'Produtividade de Monitoras', desc: 'Metas diárias, quantidade realizada e produtividade mensal por monitora.' },
    { id: 'cobertura', label: 'Relatório de Cobertura', desc: 'Acompanhamento de cobertura do ciclo atual por turno, skill e escala.' },
    { id: 'feedbacks', label: 'Relatório de Feedbacks', desc: 'Histórico de feedbacks concluídos e listagem de pendências atrasadas.' },
  ];

  const handleExportExcel = () => {
    let dataToExport = [];
    let fileName = `${selectedReport}_relatorio.xlsx`;

    switch (selectedReport) {
      case 'geral':
        dataToExport = monitorings.map(m => ({
          'ID Monitoria': m.id.slice(0, 8),
          'Operador': m.q_operators?.name || 'Desconhecido',
          'Supervisor': m.q_operators?.supervisor_name || 'Sem Supervisor',
          'Turno': getTurnFromSchedule(m.q_operators?.schedule),
          'Skill': m.q_operators?.skill || 'Voz',
          'Monitora': m.q_monitors?.name || 'Desconhecida',
          'Nota': m.score,
          'Data': new Date(m.monitoring_date).toLocaleDateString(),
          'Status': m.status,
          'Data do Feedback': m.feedback_date ? new Date(m.feedback_date).toLocaleDateString() : '-',
          'Observações': m.feedback_notes || ''
        }));
        break;

      case 'operadores':
        dataToExport = operators.map(o => {
          const opsMon = monitorings.filter(m => m.operator_id === o.id);
          const avg = opsMon.length > 0 ? Math.round(opsMon.reduce((sum, m) => sum + m.score, 0) / opsMon.length * 10) / 10 : 0;
          return {
            'Nome': o.name,
            'Supervisor': o.supervisor_name,
            'Turno': getTurnFromSchedule(o.schedule),
            'Horário': o.schedule,
            'Skill': o.skill,
            'Escala': o.escala,
            'Alocação': o.allocation,
            'Status': o.active ? 'Ativo' : 'Inativo',
            'Situação': o.status_feedback,
            'Total Monitorias': opsMon.length,
            'Média Notas': avg > 0 ? avg : '-'
          };
        });
        break;

      case 'supervisores':
        dataToExport = supervisors.map(s => {
          const superOps = operators.filter(o => o.supervisor_id === s.id);
          const opIds = new Set(superOps.map(o => o.id));
          const superMon = monitorings.filter(m => opIds.has(m.operator_id));
          const avg = superMon.length > 0 ? Math.round(superMon.reduce((sum, m) => sum + m.score, 0) / superMon.length * 10) / 10 : 0;
          
          return {
            'Supervisor': s.name,
            'Qtd Operadores': superOps.length,
            'Monitorias Realizadas': superMon.length,
            'Média Notas': avg > 0 ? avg : '-',
            'Feedbacks Pendentes': superMon.filter(m => m.status === 'Aguardando Feedback').length,
            'Feedbacks Concluídos': superMon.filter(m => m.status === 'Feedback Concluído').length
          };
        });
        break;

      case 'monitoras':
        dataToExport = monitors.map(m => {
          const monMons = monitorings.filter(mon => mon.monitor_id === m.id);
          return {
            'Monitora': m.name,
            'Meta Diária': m.daily_target,
            'Total Realizado': monMons.length,
            'Feedbacks Pendentes': monMons.filter(mon => mon.status === 'Aguardando Feedback').length,
            'Feedbacks Concluídos': monMons.filter(mon => mon.status === 'Feedback Concluído').length
          };
        });
        break;

      case 'cobertura':
        // Exportar resumo por Turno e Skill
        const turns = {};
        operators.filter(o => o.active).forEach(o => {
          const t = getTurnFromSchedule(o.schedule);
          if (!turns[t]) turns[t] = { total: 0, monitored: 0 };
          turns[t].total++;
          const hasMon = monitorings.some(m => m.operator_id === o.id);
          if (hasMon) turns[t].monitored++;
        });
        
        dataToExport = Object.keys(turns).map(t => ({
          'Segmento (Turno)': t,
          'Total Operadores': turns[t].total,
          'Monitorados': turns[t].monitored,
          'Taxa Cobertura': turns[t].total > 0 ? `${Math.round((turns[t].monitored / turns[t].total) * 100)}%` : '0%'
        }));
        break;

      case 'feedbacks':
        dataToExport = monitorings
          .filter(m => m.status === 'Aguardando Feedback')
          .map(m => {
            const op = operators.find(o => o.id === m.operator_id);
            return {
              'Operador': op?.name || 'Desconhecido',
              'Supervisor': op?.supervisor_name || 'Sem Supervisor',
              'Nota': m.score,
              'Data da Monitoria': new Date(m.monitoring_date).toLocaleDateString(),
              'Dias Atraso': Math.ceil(Math.abs(new Date() - new Date(m.monitoring_date)) / (1000 * 60 * 60 * 24)),
              'Monitora': m.q_monitors?.name || 'Desconhecida'
            };
          });
        break;

      default:
        return;
    }

    exportToExcel(dataToExport, fileName);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      
      {/* Box de Seleção de Relatórios */}
      <div className="bg-white dark:bg-[#0c0c0f] p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
        <div>
          <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
            Painel Gerador de Relatórios
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Selecione o modelo de relatório abaixo para extrair dados em formato Excel.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
          {reportTypes.map(r => (
            <button
              key={r.id}
              onClick={() => setSelectedReport(r.id)}
              className={`p-4 rounded-xl border text-left space-y-2 transition-all flex flex-col justify-between ${
                selectedReport === r.id
                  ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'bg-white dark:bg-zinc-900/10 border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 hover:border-zinc-300 dark:hover:border-zinc-700'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className={`w-4 h-4 ${selectedReport === r.id ? 'text-blue-500' : 'text-zinc-400'}`} />
                  <h4 className="font-bold text-sm">{r.label}</h4>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">{r.desc}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Ações de Download */}
        <div className="flex justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800/60">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 bg-[#ffffff] dark:bg-[#262626] hover:bg-[#f8fafc] dark:hover:bg-zinc-800 text-[#334155] dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-2.5 text-xs font-bold transition-colors shadow-sm"
          >
            <Printer className="w-3.5 h-3.5" />
            Visualizar Impressão (PDF)
          </button>
          
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold py-2.5 px-4 rounded-lg transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            Exportar para Excel (.xlsx)
          </button>
        </div>
      </div>

    </div>
  );
}
