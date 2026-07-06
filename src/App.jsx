import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from './supabaseClient';

// Importar Componentes
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import SmartQueue from './components/SmartQueue';
import Operators from './components/Operators';
import MonitorsSupervisors from './components/MonitorsSupervisors';
import AnalyticalIntelligence from './components/AnalyticalIntelligence';
import Reports from './components/Reports';
import ConfigChecklist from './components/ConfigChecklist';
import MonitoringsHistory from './components/MonitoringsHistory';

// Modais
import MonitoringModal from './components/MonitoringModal';
import FeedbackModal from './components/FeedbackModal';
import OperatorProfileModal from './components/OperatorProfileModal';
import Login from './components/Login';

export default function App() {
  // Estados de Autenticação Supabase
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Estados de Interface
  const [activeTab, setActiveTab] = useState('dashboard');
  const [darkMode, setDarkMode] = useState(false);
  const [activeProfile, setActiveProfile] = useState(() => {
    try {
      const saved = localStorage.getItem('q_active_profile');
      return saved ? JSON.parse(saved) : { id: 'Admin', name: 'Administrador (Admin)', role: 'Admin' };
    } catch (e) {
      return { id: 'Admin', name: 'Administrador (Admin)', role: 'Admin' };
    }
  });

  // Salvar perfil selecionado no navegador
  useEffect(() => {
    localStorage.setItem('q_active_profile', JSON.stringify(activeProfile));
  }, [activeProfile]);

  // Estados de Dados
  const [operators, setOperators] = useState([]);
  const [monitorings, setMonitorings] = useState([]);
  const [monitors, setMonitors] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [checklistItems, setChecklistItems] = useState([]);
  const [activeCycle, setActiveCycle] = useState(null);
  
  const [isLoading, setIsLoading] = useState(true);

  // Estados dos Modais
  const [selectedOperatorForMonitoring, setSelectedOperatorForMonitoring] = useState(null);
  const [selectedOperatorForFeedback, setSelectedOperatorForFeedback] = useState(null);
  const [selectedOperatorForProfile, setSelectedOperatorForProfile] = useState(null);
  const [editingMonitoring, setEditingMonitoring] = useState(null);
  
  // Modais de Cadastro Manual
  const [showOpForm, setShowOpForm] = useState(false);
  const [editingOperator, setEditingOperator] = useState(null);
  const [opFormFields, setOpFormFields] = useState({
    name: '',
    supervisor_id: '',
    schedule: '08:00 - 17:12',
    allocation: 'Presencial',
    skill: 'Voz',
    escala: '6x1',
    active: true,
    assigned_monitor_id: ''
  });

  // 0. Monitorar Sessão do Supabase
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 1. Alternância de Modo Escuro
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // 2. Carregamento Geral de Dados (Supabase)
  const fetchStaticData = useCallback(async () => {
    try {
      // a. Ciclos
      const { data: cycles } = await supabase
        .from('q_cycles')
        .select('id, cycle_number, status, started_at, completed_at, total_operators, completed_operators')
        .order('cycle_number', { ascending: false });
      
      const active = cycles?.find(c => c.status === 'Ativo') || null;
      setActiveCycle(active);

      // b. Monitores
      const { data: monitorsData } = await supabase
        .from('q_monitors')
        .select('id, name, daily_target')
        .order('name');
      setMonitors(monitorsData || []);

      // c. Supervisores
      const { data: supervisorsData } = await supabase
        .from('q_supervisors')
        .select('id, name')
        .order('name');
      setSupervisors(supervisorsData || []);

      // f. Itens do Checklist
      const { data: checklistData } = await supabase
        .from('q_checklist_items')
        .select('id, label, weight')
        .order('weight', { ascending: false });
      setChecklistItems(checklistData || []);

    } catch (err) {
      console.error('Erro ao buscar dados estáticos do Supabase:', err);
    }
  }, []);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // d. Operadores
      const { data: operatorsData } = await supabase
        .from('q_operators')
        .select('id, name, supervisor_id, supervisor_name, schedule, allocation, skill, escala, active, status_feedback, last_monitoring_at, last_feedback_at, assigned_monitor_id, assigned_monitor_name')
        .order('name');
      setOperators(operatorsData || []);

      // e. Monitorias
      const { data: monitoringsData } = await supabase
        .from('q_monitorings')
        .select('id, operator_id, monitor_id, cycle_id, score, monitoring_date, status, feedback_date, feedback_notes, checklist, is_ncg, q_monitors(name), q_operators(name, supervisor_name, schedule, allocation, skill, escala)')
        .order('monitoring_date', { ascending: false });
      setMonitorings(monitoringsData || []);

    } catch (err) {
      console.error('Erro ao buscar dados dinâmicos do Supabase:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session) {
      fetchStaticData();
      fetchData();
    }
  }, [fetchStaticData, fetchData, session]);

  // 3. CRUD Operadores
  const handleSaveOperator = async (e) => {
    e.preventDefault();
    const superObj = supervisors.find(s => s.id === opFormFields.supervisor_id);
    const monitorObj = monitors.find(m => m.id === opFormFields.assigned_monitor_id);
    const opData = {
      name: opFormFields.name,
      supervisor_id: opFormFields.supervisor_id || null,
      supervisor_name: superObj ? superObj.name : 'Sem Supervisor',
      schedule: opFormFields.schedule,
      allocation: opFormFields.allocation,
      skill: opFormFields.skill,
      escala: opFormFields.escala,
      active: opFormFields.active,
      assigned_monitor_id: opFormFields.assigned_monitor_id || null,
      assigned_monitor_name: monitorObj ? monitorObj.name : null
    };

    try {
      if (editingOperator) {
        // Atualizar
        const { error } = await supabase
          .from('q_operators')
          .update(opData)
          .eq('id', editingOperator.id);
        if (error) throw error;
      } else {
        // Inserir
        const { error } = await supabase
          .from('q_operators')
          .insert([opData]);
        if (error) throw error;
      }
      setShowOpForm(false);
      setEditingOperator(null);
      fetchData();
    } catch (err) {
      console.error('Erro ao salvar operador:', err);
      alert('Erro ao salvar operador. Certifique-se de que o nome é único.');
    }
  };

  const handleEditOperatorClick = (op) => {
    setEditingOperator(op);
    setOpFormFields({
      name: op.name,
      supervisor_id: op.supervisor_id || '',
      schedule: op.schedule,
      allocation: op.allocation,
      skill: op.skill,
      escala: op.escala,
      active: op.active,
      assigned_monitor_id: op.assigned_monitor_id || ''
    });
    setShowOpForm(true);
  };

  const handleDeleteOperator = async (id) => {
    if (!confirm('Deseja realmente excluir este operador? Isso apagará todo o seu histórico de monitorias.')) return;
    try {
      const { error } = await supabase
        .from('q_operators')
        .delete()
        .eq('id', id);
      if (error) throw error;
      fetchData();
    } catch (err) {
      console.error('Erro ao excluir operador:', err);
    }
  };

  // 4. CRUD Supervisores
  const handleAddSupervisor = async (name) => {
    try {
      const { error } = await supabase
        .from('q_supervisors')
        .insert([{ name }]);
      if (error) throw error;
      fetchStaticData();
      fetchData();
    } catch (err) {
      console.error('Erro ao adicionar supervisor:', err);
    }
  };

  const handleDeleteSupervisor = async (id) => {
    if (!confirm('Deseja excluir este supervisor?')) return;
    try {
      const { error } = await supabase
        .from('q_supervisors')
        .delete()
        .eq('id', id);
      if (error) throw error;
      fetchStaticData();
      fetchData();
    } catch (err) {
      console.error('Erro ao excluir supervisor:', err);
    }
  };

  // 5. CRUD Monitoras
  const handleAddMonitor = async (name, target) => {
    try {
      const { error } = await supabase
        .from('q_monitors')
        .insert([{ name, daily_target: target }]);
      if (error) throw error;
      fetchStaticData();
      fetchData();
    } catch (err) {
      console.error('Erro ao adicionar monitora:', err);
    }
  };

  const handleDeleteMonitor = async (id) => {
    if (!confirm('Deseja excluir esta monitora?')) return;
    try {
      const { error } = await supabase
        .from('q_monitors')
        .delete()
        .eq('id', id);
      if (error) throw error;
      fetchStaticData();
      fetchData();
    } catch (err) {
      console.error('Erro ao excluir monitora:', err);
    }
  };

  // 6. CRUD Itens do Checklist
  const handleAddChecklistItem = async (label, weight) => {
    try {
      const { error } = await supabase
        .from('q_checklist_items')
        .insert([{ label, weight }]);
      if (error) throw error;
      fetchStaticData();
    } catch (err) {
      console.error('Erro ao adicionar critério:', err);
      alert('Cuidado: Nome do critério já cadastrado.');
    }
  };

  const handleDeleteChecklistItem = async (id) => {
    if (!confirm('Deseja excluir este critério do checklist padrão?')) return;
    try {
      const { error } = await supabase
        .from('q_checklist_items')
        .delete()
        .eq('id', id);
      if (error) throw error;
      fetchStaticData();
    } catch (err) {
      console.error('Erro ao excluir critério:', err);
    }
  };

  // 7. Sincronização automática via Excel Upload
  const handleExcelUpload = async (parsedOperators) => {
    setIsLoading(true);
    try {
      // a. Criar supervisores novos
      const uniqueSuperNames = [...new Set(parsedOperators.map(o => o.supervisor_name).filter(Boolean))];
      const { data: currentSupers } = await supabase.from('q_supervisors').select('id, name');
      const currentSuperNames = currentSupers.map(s => s.name);
      
      const newSuperNames = uniqueSuperNames.filter(name => !currentSuperNames.includes(name));
      if (newSuperNames.length > 0) {
        const { data: insertedSupers } = await supabase
          .from('q_supervisors')
          .insert(newSuperNames.map(name => ({ name })))
          .select('id, name');
        if (insertedSupers) {
          currentSupers.push(...insertedSupers);
        }
      }

      // Mapear nome de supervisor para ID
      const superNameToIdMap = {};
      currentSupers.forEach(s => {
        superNameToIdMap[s.name] = s.id;
      });

      // b. Processar Operadores
      const { data: currentOps } = await supabase
        .from('q_operators')
        .select('id, name, supervisor_id, supervisor_name, schedule, allocation, skill, escala, active, status_feedback');
      const currentOpsMap = {};
      currentOps.forEach(o => {
        currentOpsMap[o.name] = o;
      });

      const opsToUpsert = [];
      const processedNames = new Set();
      
      const normalizeSkill = (s) => {
        if (!s) return 'Voz';
        const cleaned = s.trim().toLowerCase();
        return (cleaned.includes('midia') || cleaned.includes('mídia')) ? 'Mídias' : 'Voz';
      };

      parsedOperators.forEach(op => {
        const supervisor_id = superNameToIdMap[op.supervisor_name] || null;
        const existing = currentOpsMap[op.name];

        opsToUpsert.push({
          id: existing ? existing.id : undefined,
          name: op.name,
          supervisor_id,
          supervisor_name: op.supervisor_name,
          schedule: op.schedule,
          allocation: op.allocation,
          skill: normalizeSkill(op.skill),
          escala: op.escala,
          active: true,
          status_feedback: existing ? existing.status_feedback : 'Liberado'
        });
        processedNames.add(op.name);
      });

      // c. Inativar operadores ausentes
      const opsToInactivate = currentOps.filter(o => o.active && !processedNames.has(o.name));
      opsToInactivate.forEach(o => {
        opsToUpsert.push({
          id: o.id,
          name: o.name,
          supervisor_id: o.supervisor_id,
          supervisor_name: o.supervisor_name,
          schedule: o.schedule,
          allocation: o.allocation,
          skill: o.skill,
          escala: o.escala,
          active: false, // inativado
          status_feedback: o.status_feedback
        });
      });

      // d. Salvar tudo
      if (opsToUpsert.length > 0) {
        const { error } = await supabase.from('q_operators').upsert(opsToUpsert);
        if (error) throw error;
      }

      await fetchStaticData();
      await fetchData();
    } catch (err) {
      console.error('Erro na sincronização de planilha:', err);
      alert('Erro ao importar operadores. Detalhes no console.');
    } finally {
      setIsLoading(false);
    }
  };

  // 8. Salvar monitoria (criar ou editar)
  const handleSaveMonitoring = async (payload) => {
    // Validar se ciclo e monitora estão corretos para evitar rejeição por chaves estrangeiras no banco
    if (!payload.cycle_id) {
      alert('Erro: Nenhum ciclo ativo foi encontrado. Crie um ciclo na aba "Configurações" antes de realizar monitorias.');
      return;
    }
    if (!payload.monitor_id || payload.monitor_id === '00000000-0000-0000-0000-000000000000') {
      alert('Erro: Nenhuma monitora cadastrada ou selecionada para assinar esta avaliação. Cadastre uma monitora na aba "Monitoras & Supervisores" ou selecione uma no cabeçalho antes de salvar.');
      return;
    }

    try {
      // Remover colunas calculadas/geradas pelo banco de dados para evitar erro de inserção/update
      const { is_ncg, ...dbPayload } = payload;

      if (dbPayload.id) {
        // Atualizar monitoria existente
        const { error } = await supabase
          .from('q_monitorings')
          .update({
            score: dbPayload.score,
            feedback_notes: dbPayload.feedback_notes,
            checklist: dbPayload.checklist,
            status: dbPayload.status
          })
          .eq('id', dbPayload.id);
        if (error) throw error;
      } else {
        // Criar nova monitoria
        const { error } = await supabase
          .from('q_monitorings')
          .insert([dbPayload]);
        if (error) throw error;
      }
      
      setSelectedOperatorForMonitoring(null);
      setEditingMonitoring(null);
      fetchData();
    } catch (err) {
      console.error('Erro ao salvar monitoria:', err);
      alert('Erro ao salvar monitoria no Supabase: ' + (err.message || JSON.stringify(err)));
    }
  };

  // Excluir monitoria
  const handleDeleteMonitoring = async (monitoringId) => {
    try {
      const { error } = await supabase
        .from('q_monitorings')
        .delete()
        .eq('id', monitoringId);
      if (error) throw error;
      fetchData();
    } catch (err) {
      console.error('Erro ao excluir monitoria:', err);
      alert('Erro ao excluir monitoria no banco de dados.');
    }
  };

  // Iniciar edição de monitoria
  const handleEditMonitoringClick = (monitoring) => {
    const op = operators.find(o => o.id === monitoring.operator_id);
    if (!op) return;
    setEditingMonitoring(monitoring);
    setSelectedOperatorForMonitoring(op);
  };

  // 9. Concluir feedback e liberar operador
  const handleSaveFeedback = async (payload) => {
    try {
      // Atualiza monitoria
      const { error: monError } = await supabase
        .from('q_monitorings')
        .update({
          status: 'Feedback Concluído',
          feedback_date: payload.feedback_date,
          feedback_notes: payload.feedback_notes
        })
        .eq('id', payload.monitoring_id);
      
      if (monError) throw monError;

      setSelectedOperatorForFeedback(null);
      fetchData();
    } catch (err) {
      console.error('Erro ao salvar feedback:', err);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setSession(null);
    } catch (err) {
      console.error('Erro ao sair do sistema:', err);
    }
  };

  // 10. Mapeamento de Monitora Logada
  // Clarice e Simone são cadastradas como Monitora 1 e Monitora 2 padrão no banco de dados.
  // Vamos buscar a correspondente.
  const activeMonitorObj = useMemo(() => {
    return monitors.find(m => m.id === activeProfile.id || m.name.toLowerCase().includes(activeProfile.id.toLowerCase())) || 
           monitors[0] || 
           { id: '00000000-0000-0000-0000-000000000000', name: 'Clarice' };
  }, [monitors, activeProfile]);

  // 11. Filtragem Geral baseada na Identificação de Perfil Ativo
  const isSupervisor = activeProfile.role === 'Supervisor';
  const isMonitor = activeProfile.role === 'Monitora';
  const supervisorName = activeProfile.name ? activeProfile.name.replace(' (Supervisor)', '') : '';
  const monitorName = activeProfile.name ? activeProfile.name.replace(' (Monitora)', '') : '';

  // Filtrar operadores por supervisor se for supervisor logado
  const filteredOperators = useMemo(() => {
    if (!isSupervisor) return operators;
    return operators.filter(o => o.supervisor_id === activeProfile.id || o.supervisor_name === supervisorName);
  }, [operators, activeProfile, isSupervisor, supervisorName]);

  // Filtrar monitorias por supervisor se for supervisor logado
  const filteredMonitorings = useMemo(() => {
    if (!isSupervisor) return monitorings;
    const supervisorOpIds = new Set(filteredOperators.map(o => o.id));
    return monitorings.filter(m => supervisorOpIds.has(m.operator_id));
  }, [monitorings, filteredOperators, isSupervisor]);

  // Filtrar fila inteligente do monitor logado se for monitora
  const queueOperators = useMemo(() => {
    if (!isMonitor) return filteredOperators;
    return filteredOperators.filter(o => o.assigned_monitor_id === null || o.assigned_monitor_id === activeProfile.id || o.assigned_monitor_name === monitorName);
  }, [filteredOperators, activeProfile, isMonitor, monitorName]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-[#09090b]">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Verificando credenciais...</span>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Login onLoginSuccess={(s) => setSession(s)} />;
  }

  return (
    <div className="flex bg-zinc-50 dark:bg-[#09090b] min-h-screen text-zinc-950 dark:text-zinc-50">
      
      {/* Sidebar */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        unreadAlertsCount={0} 
      />

      {/* Main Panel */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Header */}
        <Header 
          activeProfile={activeProfile}
          setActiveProfile={setActiveProfile}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          alertsCount={0}
          activeTab={activeTab}
          onLogout={handleLogout}
          monitors={monitors}
          supervisors={supervisors}
        />

        {/* Content Wrapper */}
        <main className="flex-1 p-6 overflow-y-auto">
          {isLoading && operators.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <span className="text-sm text-zinc-500 dark:text-zinc-400">Carregando sistema...</span>
            </div>
          ) : (
            <>
              {activeTab === 'dashboard' && (
                <Dashboard 
                  operators={filteredOperators} 
                  monitorings={filteredMonitorings} 
                  activeCycle={activeCycle}
                  darkMode={darkMode} 
                />
              )}

              {activeTab === 'queue' && (
                <SmartQueue 
                  operators={queueOperators}
                  monitorings={filteredMonitorings}
                  activeCycle={activeCycle}
                  onStartMonitoring={(op) => setSelectedOperatorForMonitoring(op)}
                  onOpenFeedback={(op) => setSelectedOperatorForFeedback(op)}
                  isLoading={isLoading}
                />
              )}

              {activeTab === 'operators' && (
                <Operators 
                  operators={filteredOperators}
                  supervisors={supervisors}
                  onAddOperator={() => {
                    setEditingOperator(null);
                    setOpFormFields({
                      name: '',
                      supervisor_id: supervisors[0]?.id || '',
                      schedule: '08:00 - 17:12',
                      allocation: 'Presencial',
                      skill: 'Voz',
                      escala: '6x1',
                      active: true,
                      assigned_monitor_id: ''
                    });
                    setShowOpForm(true);
                  }}
                  onEditOperator={handleEditOperatorClick}
                  onDeleteOperator={handleDeleteOperator}
                  onExcelUpload={handleExcelUpload}
                  onViewProfile={(op) => setSelectedOperatorForProfile(op)}
                  isLoading={isLoading}
                />
              )}

              {activeTab === 'monitorings_history' && (
                <MonitoringsHistory 
                  operators={filteredOperators}
                  monitorings={filteredMonitorings}
                  monitors={monitors}
                  supervisors={supervisors}
                  onEditMonitoring={handleEditMonitoringClick}
                  onDeleteMonitoring={handleDeleteMonitoring}
                  activeProfile={activeProfile}
                  darkMode={darkMode}
                />
              )}

              {activeTab === 'monitors' && (
                <MonitorsSupervisors 
                  operators={filteredOperators}
                  monitorings={filteredMonitorings}
                  monitors={monitors}
                  supervisors={supervisors}
                  activeCycle={activeCycle}
                  onAddMonitor={handleAddMonitor}
                  onDeleteMonitor={handleDeleteMonitor}
                  onAddSupervisor={handleAddSupervisor}
                  onDeleteSupervisor={handleDeleteSupervisor}
                />
              )}

              {activeTab === 'intelligence' && (
                <AnalyticalIntelligence 
                  operators={filteredOperators}
                  monitorings={filteredMonitorings}
                  activeCycle={activeCycle}
                  darkMode={darkMode}
                />
              )}

              {activeTab === 'reports' && (
                <Reports 
                  operators={filteredOperators}
                  monitorings={filteredMonitorings}
                  monitors={monitors}
                  supervisors={supervisors}
                />
              )}

              {activeTab === 'config' && (
                <ConfigChecklist 
                  checklistItems={checklistItems}
                  onAddChecklistItem={handleAddChecklistItem}
                  onDeleteChecklistItem={handleDeleteChecklistItem}
                  isLoading={isLoading}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* ================= MODAIS DE AVALIAÇÃO E FICHA ================= */}

      {/* Modal: Realizar/Editar Monitoria */}
      {selectedOperatorForMonitoring && (
        <MonitoringModal
          operator={selectedOperatorForMonitoring}
          monitor={activeMonitorObj}
          activeCycle={activeCycle}
          defaultChecklistItems={checklistItems}
          onClose={() => {
            setSelectedOperatorForMonitoring(null);
            setEditingMonitoring(null);
          }}
          onSave={handleSaveMonitoring}
          monitoring={editingMonitoring}
        />
      )}

      {/* Modal: Registrar Feedback */}
      {selectedOperatorForFeedback && (
        <FeedbackModal
          operator={selectedOperatorForFeedback}
          onClose={() => setSelectedOperatorForFeedback(null)}
          onSave={handleSaveFeedback}
        />
      )}

      {/* Modal: Ficha Completa do Operador */}
      {selectedOperatorForProfile && (
        <OperatorProfileModal
          operator={selectedOperatorForProfile}
          onClose={() => setSelectedOperatorForProfile(null)}
          darkMode={darkMode}
          onEditMonitoring={handleEditMonitoringClick}
          onDeleteMonitoring={handleDeleteMonitoring}
        />
      )}

      {/* Modal: Adicionar/Editar Operador (Manual) */}
      {showOpForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#0c0c0f] w-full max-w-md rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-900/10">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                {editingOperator ? 'Editar Operador' : 'Adicionar Operador'}
              </h3>
              <button onClick={() => setShowOpForm(false)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveOperator} className="p-6 space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-semibold text-zinc-500">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={opFormFields.name}
                  onChange={(e) => setOpFormFields({ ...opFormFields, name: e.target.value })}
                  className="w-full bg-[#ffffff] dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-zinc-950 dark:text-zinc-100"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-zinc-500">Supervisor</label>
                <select
                  required
                  value={opFormFields.supervisor_id}
                  onChange={(e) => setOpFormFields({ ...opFormFields, supervisor_id: e.target.value })}
                  className="w-full bg-[#ffffff] dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs shadow-sm text-zinc-800 dark:text-zinc-200 outline-none"
                >
                  <option value="">Selecione...</option>
                  {supervisors.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-zinc-500">Monitora Vinculada (Opcional)</label>
                <select
                  value={opFormFields.assigned_monitor_id}
                  onChange={(e) => setOpFormFields({ ...opFormFields, assigned_monitor_id: e.target.value })}
                  className="w-full bg-[#ffffff] dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs shadow-sm text-zinc-800 dark:text-zinc-200 outline-none"
                >
                  <option value="">Qualquer Monitora</option>
                  {monitors.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-semibold text-zinc-500">Horário</label>
                  <input
                    type="text"
                    required
                    value={opFormFields.schedule}
                    onChange={(e) => setOpFormFields({ ...opFormFields, schedule: e.target.value })}
                    className="w-full bg-[#ffffff] dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs shadow-sm text-zinc-950 dark:text-zinc-100"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-semibold text-zinc-500">Skill</label>
                  <select
                    value={opFormFields.skill}
                    onChange={(e) => setOpFormFields({ ...opFormFields, skill: e.target.value })}
                    className="w-full bg-[#ffffff] dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs shadow-sm text-zinc-850 dark:text-zinc-200 outline-none"
                  >
                    <option value="Voz">Voz</option>
                    <option value="Mídias">Mídias</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-semibold text-zinc-500">Alocação</label>
                  <select
                    value={opFormFields.allocation}
                    onChange={(e) => setOpFormFields({ ...opFormFields, allocation: e.target.value })}
                    className="w-full bg-[#ffffff] dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs shadow-sm text-zinc-850 dark:text-zinc-200 outline-none"
                  >
                    <option value="Presencial">Presencial</option>
                    <option value="Home Office">Home Office</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="font-semibold text-zinc-500">Escala</label>
                  <select
                    value={opFormFields.escala}
                    onChange={(e) => setOpFormFields({ ...opFormFields, escala: e.target.value })}
                    className="w-full bg-[#ffffff] dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs shadow-sm text-zinc-850 dark:text-zinc-200 outline-none"
                  >
                    <option value="6x1">6x1</option>
                    <option value="5x2">5x2</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="activeCheck"
                  checked={opFormFields.active}
                  onChange={(e) => setOpFormFields({ ...opFormFields, active: e.target.checked })}
                  className="w-4 h-4 accent-blue-600 cursor-pointer"
                />
                <label htmlFor="activeCheck" className="font-semibold text-zinc-600 dark:text-zinc-400 cursor-pointer">
                  Operador Ativo na Operação
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowOpForm(false)}
                  className="px-4 py-2 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 text-zinc-700 dark:text-zinc-300 font-bold rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-sm"
                >
                  {editingOperator ? 'Salvar Alterações' : 'Adicionar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

function XIcon(props) {
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
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
