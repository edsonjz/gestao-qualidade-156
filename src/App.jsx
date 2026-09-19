import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase, createEphemeralClient } from './supabaseClient';

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
import UserManagement from './components/UserManagement';
import OperatorPortal from './components/OperatorPortal';
import Audits from './components/Audits';
import PdiManagement from './components/PdiManagement';

// Modais
import MonitoringModal from './components/MonitoringModal';
import FeedbackModal from './components/FeedbackModal';
import OperatorProfileModal from './components/OperatorProfileModal';
import AuditModal from './components/AuditModal';
import AuditTopicsModal from './components/AuditTopicsModal';
import PdiModal from './components/PdiModal';
import Login from './components/Login';

export default function App() {
  // Estados de Autenticação Supabase
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Estados de Usuário e RBAC
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState('admin'); // 'admin', 'monitor', 'supervisor', 'operador'
  const [users, setUsers] = useState([]);

  // Estados de Interface
  const [activeTab, setActiveTab] = useState('dashboard');
  const [darkMode, setDarkMode] = useState(false);

  // Estados de Dados
  const [operators, setOperators] = useState([]);
  const [monitorings, setMonitorings] = useState([]);
  const [audits, setAudits] = useState([]);
  const [monitors, setMonitors] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [checklistItems, setChecklistItems] = useState([]);
  const [activeCycle, setActiveCycle] = useState(null);
  
  // Temas Principais da Auditoria Formativa
  const [auditTopics, setAuditTopics] = useState(() => {
    try {
      const cached = localStorage.getItem('q_audit_topics');
      return cached ? JSON.parse(cached) : [
        { id: 'topic-1', name: 'Atendimento e Postura', description: 'Atendimento, Postura e Empatia', color: 'blue' },
        { id: 'topic-2', name: 'Procedimentos 156', description: 'Procedimentos e Regras 156', color: 'purple' },
        { id: 'topic-3', name: 'Comunicação e Clareza', description: 'Comunicação, Clareza e Dicção', color: 'emerald' },
        { id: 'topic-4', name: 'Navegação em Sistemas', description: 'Agilidade e Navegação em Sistemas', color: 'amber' },
        { id: 'topic-5', name: 'Acompanhamento e Reciclagem', description: 'Acompanhamento / Reciclagem', color: 'indigo' },
        { id: 'topic-6', name: 'Geral', description: 'Desenvolvimento Geral', color: 'zinc' }
      ];
    } catch {
      return [];
    }
  });
  const [showAuditTopicsModal, setShowAuditTopicsModal] = useState(false);
  
  // PDIs (Planos de Desenvolvimento Individual)
  const [pdis, setPdis] = useState(() => {
    try {
      const cached = localStorage.getItem('q_pdis_cache');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [selectedOperatorForPdi, setSelectedOperatorForPdi] = useState(null);
  const [selectedPdiForEdit, setSelectedPdiForEdit] = useState(null);
  
  const [isLoading, setIsLoading] = useState(true);

  // Estados dos Modais
  const [selectedOperatorForMonitoring, setSelectedOperatorForMonitoring] = useState(null);
  const [selectedOperatorForFeedback, setSelectedOperatorForFeedback] = useState(null);
  const [selectedOperatorForProfile, setSelectedOperatorForProfile] = useState(null);
  const [editingMonitoring, setEditingMonitoring] = useState(null);
  const [selectedOperatorForAudit, setSelectedOperatorForAudit] = useState(null);
  const [selectedAuditForView, setSelectedAuditForView] = useState(null);
  
  // Modais de Cadastro Manual
  const [showOpForm, setShowOpForm] = useState(false);
  const [editingOperator, setEditingOperator] = useState(null);
  const [opFormFields, setOpFormFields] = useState({
    name: '',
    matricula: '',
    supervisor_id: '',
    schedule: '08:00 - 17:12',
    allocation: 'Presencial',
    skill: 'Voz',
    escala: '6x1',
    active: true,
    assigned_monitor_id: ''
  });

  // 0. Carregar Perfil do Usuário Autenticado
  const fetchCurrentUserProfile = useCallback(async (currentSession) => {
    if (!currentSession?.user) {
      setCurrentUser(null);
      setUserRole('admin');
      return;
    }

    const email = currentSession.user.email?.toLowerCase();
    
    // O e-mail edson_jz@hotmail.com é SEMPRE reconhecido como Administrador Master
    if (email === 'edson_jz@hotmail.com') {
      const masterProfile = {
        id: currentSession.user.id,
        email: email,
        name: 'Edson Azevedo',
        role: 'admin'
      };
      setCurrentUser(masterProfile);
      setUserRole('admin');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('q_users')
        .select('*')
        .eq('email', email)
        .maybeSingle();

      const isOpEmail = email.startsWith('op_');
      const extractedMatricula = currentSession.user.user_metadata?.matricula || 
        (isOpEmail ? email.replace(/^op_/, '').split('@')[0] : null);

      let resolvedRole = data?.role || (isOpEmail ? 'operador' : (currentSession.user.user_metadata?.role || 'monitor'));
      let profile = data && data.active !== false ? { ...data } : {
        id: currentSession.user.id,
        email: email,
        name: currentSession.user.user_metadata?.name || (isOpEmail ? `Operador (${extractedMatricula})` : email.split('@')[0]),
        role: resolvedRole
      };

      profile.matricula = profile.matricula || extractedMatricula;

      // Hidratação profunda se for perfil Operador: buscar dados reais em q_operators
      if (resolvedRole === 'operador' || isOpEmail) {
        try {
          const matClean = profile.matricula ? String(profile.matricula).trim().toLowerCase() : '';
          const { data: opMatches } = await supabase
            .from('q_operators')
            .select('id, name, matricula, supervisor_id, supervisor_name, schedule, skill, allocation, escala');

          if (opMatches && opMatches.length > 0) {
            const foundOp = 
              (profile.operator_id && opMatches.find(o => o.id === profile.operator_id)) ||
              (matClean && opMatches.find(o => o.matricula && String(o.matricula).trim().toLowerCase() === matClean)) ||
              (profile.name && opMatches.find(o => o.name && o.name.toLowerCase() === profile.name.toLowerCase())) ||
              null;

            if (foundOp) {
              profile.operator_id = foundOp.id;
              profile.name = foundOp.name;
              profile.matricula = foundOp.matricula || profile.matricula;
              profile.supervisor_id = foundOp.supervisor_id;
              profile.supervisor_name = foundOp.supervisor_name;
              profile.operator_data = foundOp;
            }
          }
        } catch (opHydrateErr) {
          console.warn('Não foi possível hidratar operador antecipadamente:', opHydrateErr);
        }
      }

      // Hidratação profunda se for perfil Supervisor: garantir que supervisor_id esteja preenchido
      if (resolvedRole === 'supervisor') {
        try {
          const { data: supMatches } = await supabase
            .from('q_supervisors')
            .select('id, name');

          if (supMatches && supMatches.length > 0) {
            const cleanSupName = (profile.name || '').replace(/\s*\(supervisor\)/i, '').trim().toLowerCase();
            const foundSup = 
              (profile.supervisor_id && supMatches.find(s => s.id === profile.supervisor_id)) ||
              (cleanSupName && supMatches.find(s => s.name && s.name.trim().toLowerCase() === cleanSupName)) ||
              null;

            if (foundSup) {
              profile.supervisor_id = foundSup.id;
              profile.name = foundSup.name;
            }
          }
        } catch (supHydrateErr) {
          console.warn('Não foi possível hidratar supervisor antecipadamente:', supHydrateErr);
        }
      }

      setCurrentUser(profile);
      setUserRole(resolvedRole);
      if (resolvedRole === 'operador') {
        setActiveTab('portal');
      }
    } catch (err) {
      console.warn('Erro ao carregar perfil do usuário:', err);
    }
  }, []);

  // Monitorar Sessão do Supabase
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      fetchCurrentUserProfile(currentSession).finally(() => setAuthLoading(false));
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
      fetchCurrentUserProfile(currentSession).finally(() => setAuthLoading(false));
    });

    return () => subscription.unsubscribe();
  }, [fetchCurrentUserProfile]);

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

      // b. Itens do Checklist e Configurações Persistidas na Nuvem
      const { data: checklistData } = await supabase
        .from('q_checklist_items')
        .select('id, label, weight, active')
        .order('weight', { ascending: false });

      const visibleChecklist = (checklistData || []).filter(item => 
        !item.label?.startsWith('__CONFIG_') && item.weight !== -999
      );
      setChecklistItems(visibleChecklist);

      // c. Metas Diárias de Auditoria (Sincronizadas entre Navegadores)
      const targetsConfig = (checklistData || []).find(item => item.label?.startsWith('__CONFIG_DAILY_AUDIT_TARGETS__:'));
      let cloudTargets = {};
      if (targetsConfig) {
        try {
          cloudTargets = JSON.parse(targetsConfig.label.replace('__CONFIG_DAILY_AUDIT_TARGETS__:', ''));
        } catch (_) {}
      }
      const localTargets = JSON.parse(localStorage.getItem('q_daily_audit_targets') || '{}');
      const auditTargets = { ...localTargets, ...cloudTargets };
      localStorage.setItem('q_daily_audit_targets', JSON.stringify(auditTargets));

      // d. Monitores (com hidratação de metas sincronizadas)
      const { data: monitorsData } = await supabase
        .from('q_monitors')
        .select('*')
        .order('name');
      const hydratedMonitors = (monitorsData || []).map(m => ({
        ...m,
        daily_target: Number(m.daily_target) || 17,
        daily_audit_target: Number(m.daily_audit_target) || Number(auditTargets[m.id]) || 5
      }));
      setMonitors(hydratedMonitors);

      // e. Supervisores
      const { data: supervisorsData } = await supabase
        .from('q_supervisors')
        .select('id, name')
        .order('name');
      setSupervisors(supervisorsData || []);

      // f. Temas da Auditoria Formativa (Sincronizados entre Navegadores)
      let resolvedTopics = null;
      try {
        const { data: topicsData, error: topicsErr } = await supabase
          .from('q_audit_topics')
          .select('*')
          .order('created_at', { ascending: true });
        if (!topicsErr && topicsData && topicsData.length > 0) {
          resolvedTopics = topicsData;
        }
      } catch (_) {}

      if (!resolvedTopics) {
        const topicConfig = (checklistData || []).find(item => item.label?.startsWith('__CONFIG_AUDIT_TOPICS__:'));
        if (topicConfig) {
          try {
            const parsed = JSON.parse(topicConfig.label.replace('__CONFIG_AUDIT_TOPICS__:', ''));
            if (Array.isArray(parsed) && parsed.length > 0) {
              resolvedTopics = parsed;
            }
          } catch (_) {}
        }
      }

      if (!resolvedTopics) {
        const cached = localStorage.getItem('q_audit_topics');
        if (cached) {
          try { resolvedTopics = JSON.parse(cached); } catch (_) {}
        }
      }

      if (!resolvedTopics || resolvedTopics.length === 0) {
        resolvedTopics = [
          { id: 'topic-1', name: 'Atendimento e Postura', description: 'Atendimento, Postura e Empatia', color: 'blue' },
          { id: 'topic-2', name: 'Procedimentos 156', description: 'Procedimentos e Regras 156', color: 'purple' },
          { id: 'topic-3', name: 'Comunicação e Clareza', description: 'Comunicação, Clareza e Dicção', color: 'emerald' },
          { id: 'topic-4', name: 'Navegação em Sistemas', description: 'Agilidade e Navegação em Sistemas', color: 'amber' },
          { id: 'topic-5', name: 'Acompanhamento e Reciclagem', description: 'Acompanhamento / Reciclagem', color: 'indigo' },
          { id: 'topic-6', name: 'Geral', description: 'Desenvolvimento Geral', color: 'zinc' }
        ];
      }

      setAuditTopics(resolvedTopics);
      localStorage.setItem('q_audit_topics', JSON.stringify(resolvedTopics));

    } catch (err) {
      console.error('Erro ao buscar dados estáticos do Supabase:', err);
    }
  }, []);

  // Carregar lista de usuários para o Admin
  const fetchUsers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('q_users')
        .select('*')
        .order('name');

      const masterUser = {
        id: 'master-admin-entry',
        email: 'edson_jz@hotmail.com',
        name: 'Edson Azevedo',
        role: 'admin',
        active: true
      };

      const userList = data ? [...data] : [];
      if (!userList.some(u => u.email === 'edson_jz@hotmail.com')) {
        userList.unshift(masterUser);
      }
      setUsers(userList);
    } catch (err) {
      console.warn('Tabela q_users ainda não criada ou inacessível:', err);
    }
  }, []);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // d. Operadores (incluindo campos de lock e matrícula)
      const { data: operatorsData } = await supabase
        .from('q_operators')
        .select('id, name, matricula, supervisor_id, supervisor_name, schedule, allocation, skill, escala, active, status_feedback, last_monitoring_at, last_feedback_at, assigned_monitor_id, assigned_monitor_name, locked_by_monitor_id, locked_by_monitor_name, locked_at')
        .order('name');
      // e. Monitorias
      const { data: monitoringsData } = await supabase
        .from('q_monitorings')
        .select('id, operator_id, monitor_id, cycle_id, score, monitoring_date, status, feedback_date, feedback_notes, checklist, is_ncg, q_monitors(name), q_operators(name, supervisor_name, schedule, allocation, skill, escala, matricula)')
        .order('monitoring_date', { ascending: false });

      // Sincronizar status_feedback em tempo real caso haja monitorias aguardando feedback
      const pendingOperatorIds = new Set(
        (monitoringsData || [])
          .filter(m => m.status === 'Aguardando Feedback')
          .map(m => m.operator_id)
      );

      const reconciledOperators = (operatorsData || []).map(op => {
        if (pendingOperatorIds.has(op.id) && op.status_feedback !== 'Aguardando Feedback') {
          return { ...op, status_feedback: 'Aguardando Feedback' };
        }
        return op;
      });

      setOperators(reconciledOperators);
      setMonitorings(monitoringsData || []);

      // f. Auditorias de Desenvolvimento e Sincronização em Nuvem de PDIs
      try {
        const { data: auditsData } = await supabase
          .from('q_audits')
          .select('*, q_operators(name, matricula, supervisor_id, supervisor_name, schedule, allocation, skill, escala)')
          .order('audit_date', { ascending: false });

        if (auditsData) {
          const regularAudits = [];
          const cloudPdis = [];

          auditsData.forEach(item => {
            if (item.topic && item.topic.startsWith('[PDI]')) {
              try {
                const parsed = JSON.parse(item.general_notes || '{}');
                cloudPdis.push({
                  ...parsed,
                  id: item.id,
                  operator_id: item.operator_id,
                  status: item.status || parsed.status || 'Em Andamento',
                  created_at: parsed.created_at || item.audit_date || item.created_at,
                  updated_at: parsed.updated_at || item.audit_date || item.created_at
                });
              } catch (e) {
                console.warn('Erro ao decodificar registro de PDI da nuvem:', e);
              }
            } else {
              regularAudits.push(item);
            }
          });

          setAudits(regularAudits);

          // Sincronização de contingência e auto-migração:
          // Se havia PDIs criados em outro navegador (ex: Chrome via localStorage), migra automaticamente para a nuvem
          let finalPdis = [...cloudPdis];
          try {
            const localCached = JSON.parse(localStorage.getItem('q_pdis_cache') || '[]');
            if (Array.isArray(localCached) && localCached.length > 0) {
              for (const localPdi of localCached) {
                const existsInCloud = cloudPdis.some(cp => 
                  cp.operator_id === localPdi.operator_id || String(cp.operator_id) === String(localPdi.operator_id)
                );
                if (!existsInCloud && localPdi.operator_id) {
                  finalPdis.push(localPdi);
                  supabase.from('q_audits').insert([{
                    operator_id: localPdi.operator_id,
                    auditor_name: 'Sistema Qualidade 156',
                    auditor_role: 'admin',
                    topic: '[PDI] Plano de Desenvolvimento Individual',
                    status: localPdi.status || 'Em Andamento',
                    strengths: Array.isArray(localPdi.strengths) ? localPdi.strengths.join('\n') : (localPdi.strengths || ''),
                    improvements: Array.isArray(localPdi.improvements) ? localPdi.improvements.join('\n') : (localPdi.improvements || ''),
                    action_plan: typeof localPdi.actionPlan === 'string' ? localPdi.actionPlan : JSON.stringify(localPdi.actionPlan || []),
                    general_notes: JSON.stringify(localPdi),
                    audit_date: localPdi.updated_at || localPdi.created_at || new Date().toISOString()
                  }]).then(() => {});
                }
              }
            }
          } catch (migErr) {
            console.warn('Erro na contingência de PDI local:', migErr);
          }

          setPdis(finalPdis);
          localStorage.setItem('q_pdis_cache', JSON.stringify(finalPdis));
        }
      } catch (aErr) {
        console.warn('Tabela q_audits ainda não criada ou inacessível:', aErr);
      }

    } catch (err) {
      console.error('Erro ao buscar dados dinâmicos do Supabase:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Referência para destrancar operador caso o usuário feche a aba ou navegador abruptamente
  const activeLockedOperatorRef = useRef(null);
  useEffect(() => {
    activeLockedOperatorRef.current = selectedOperatorForMonitoring || selectedOperatorForAudit;
  }, [selectedOperatorForMonitoring, selectedOperatorForAudit]);

  // Listener para liberar trava se o usuário fechar a aba/janela ou recarregar
  useEffect(() => {
    const handleBeforeUnload = () => {
      const op = activeLockedOperatorRef.current;
      if (!op) return;
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        if (supabaseUrl && supabaseKey) {
          fetch(`${supabaseUrl}/rest/v1/q_operators?id=eq.${op.id}`, {
            method: 'PATCH',
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal'
            },
            body: JSON.stringify({
              locked_by_monitor_id: null,
              locked_by_monitor_name: null,
              locked_at: null
            }),
            keepalive: true
          });
        }
      } catch (e) {
        // ignore on close
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  useEffect(() => {
    if (session) {
      fetchStaticData();
      fetchData();
      fetchUsers();

      // 1. Canal Realtime Supabase para sincronização instantânea de travas e operadores
      const realtimeLocksChannel = supabase
        .channel('realtime_q_operators_locks')
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'q_operators' },
          (payload) => {
            const updated = payload.new;
            if (!updated) return;
            setOperators(prev => prev.map(op => {
              if (op.id !== updated.id) return op;
              return {
                ...op,
                locked_by_monitor_id: updated.locked_by_monitor_id,
                locked_by_monitor_name: updated.locked_by_monitor_name,
                locked_at: updated.locked_at,
                status_feedback: updated.status_feedback,
                last_monitoring_at: updated.last_monitoring_at
              };
            }));
          }
        )
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'q_operators' },
          () => fetchData()
        )
        .on(
          'postgres_changes',
          { event: 'DELETE', schema: 'public', table: 'q_operators' },
          () => fetchData()
        )
        .subscribe();

      // 2. Canal Realtime Supabase para Auditorias e PDIs (sincronização instantânea entre Chrome e Firefox)
      const realtimeAuditsChannel = supabase
        .channel('realtime_q_audits_sync')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'q_audits' },
          () => {
            fetchData();
          }
        )
        .subscribe();

      // 3. Canal Realtime Supabase para Monitorias e Feedbacks
      const realtimeMonitoringsChannel = supabase
        .channel('realtime_q_monitorings_sync')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'q_monitorings' },
          () => {
            fetchData();
          }
        )
        .subscribe();

      // 4. Sincronização periódica leve como garantia de contingência a cada 10 segundos
      const syncInterval = setInterval(() => {
        fetchData();
      }, 10000);

      return () => {
        supabase.removeChannel(realtimeLocksChannel);
        supabase.removeChannel(realtimeAuditsChannel);
        supabase.removeChannel(realtimeMonitoringsChannel);
        clearInterval(syncInterval);
      };
    }
  }, [fetchStaticData, fetchData, fetchUsers, session]);

  // 3. CRUD Operadores
  const handleSaveOperator = async (e) => {
    e.preventDefault();
    const superObj = supervisors.find(s => s.id === opFormFields.supervisor_id);
    const monitorObj = monitors.find(m => m.id === opFormFields.assigned_monitor_id);
    const opData = {
      name: opFormFields.name.trim(),
      matricula: opFormFields.matricula ? opFormFields.matricula.trim() : null,
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
      alert('Erro ao salvar operador: ' + (err.message || JSON.stringify(err)));
    }
  };

  const handleEditOperatorClick = (op) => {
    setEditingOperator(op);
    setOpFormFields({
      name: op.name || '',
      matricula: op.matricula || '',
      supervisor_id: op.supervisor_id || '',
      schedule: op.schedule || '08:00 - 17:12',
      allocation: op.allocation || 'Presencial',
      skill: op.skill || 'Voz',
      escala: op.escala || '6x1',
      active: op.active !== undefined ? op.active : true,
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

  // 4. CRUD Supervisores (com credenciais e vínculos)
  const handleSaveSupervisor = async ({ id, name, email, password }) => {
    try {
      let supervisorId = id;
      if (id) {
        const oldSuper = supervisors.find(s => s.id === id);
        const { error: updErr } = await supabase
          .from('q_supervisors')
          .update({ name })
          .eq('id', id);
        if (updErr) throw updErr;

        if (oldSuper && oldSuper.name !== name) {
          await supabase
            .from('q_operators')
            .update({ supervisor_name: name })
            .eq('supervisor_id', id);
        }
      } else {
        const { data: newSuper, error: insErr } = await supabase
          .from('q_supervisors')
          .insert([{ name }])
          .select()
          .single();
        if (insErr) throw insErr;
        supervisorId = newSuper.id;
      }

      // Se informou e-mail para credencial
      if (email) {
        const existingUser = users.find(u => u.email?.toLowerCase() === email.toLowerCase() || u.supervisor_id === supervisorId);

        if (existingUser) {
          await supabase
            .from('q_users')
            .update({
              name,
              email,
              role: 'supervisor',
              supervisor_id: supervisorId,
              active: true
            })
            .eq('id', existingUser.id);
        } else {
          let authUserId = null;
          if (password && password.length >= 6) {
            const ephemeralAuth = createEphemeralClient();
            const { data: authData, error: authErr } = await ephemeralAuth.auth.signUp({
              email,
              password,
              options: {
                data: { name, role: 'supervisor' }
              }
            });
            if (authErr) console.warn('Aviso no Supabase Auth:', authErr);
            authUserId = authData?.user?.id || null;
          }

          await supabase
            .from('q_users')
            .insert([{
              auth_user_id: authUserId,
              email,
              name,
              role: 'supervisor',
              supervisor_id: supervisorId,
              active: true
            }]);
        }
      }

      await fetchStaticData();
      await fetchData();
      await fetchUsers();
    } catch (err) {
      console.error('Erro ao salvar supervisor:', err);
      throw err;
    }
  };

  const handleDeleteSupervisor = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este supervisor? Os operadores associados ficarão sem supervisor e a credencial vinculada será desfeita.')) {
      return;
    }
    try {
      await supabase.from('q_users').delete().eq('supervisor_id', id);
      await supabase.from('q_operators').update({ supervisor_id: null, supervisor_name: 'Sem Supervisor' }).eq('supervisor_id', id);
      const { error } = await supabase
        .from('q_supervisors')
        .delete()
        .eq('id', id);
      if (error) throw error;
      await fetchStaticData();
      await fetchData();
      await fetchUsers();
    } catch (err) {
      console.error('Erro ao excluir supervisor:', err);
      alert('Erro ao excluir supervisor: ' + (err.message || ''));
    }
  };

  // 5. CRUD Monitores (com metas de monitoria e auditoria e credenciais)
  const handleSaveMonitor = async ({ id, name, daily_target, daily_audit_target, email, password }) => {
    try {
      let monitorId = id;
      const numDaily = Number(daily_target) || 17;
      const numAuditDaily = Number(daily_audit_target) || 5;

      const auditTargets = JSON.parse(localStorage.getItem('q_daily_audit_targets') || '{}');
      const basePayload = { name, daily_target: numDaily };
      const extendedPayload = { ...basePayload, daily_audit_target: numAuditDaily };

      if (id) {
        auditTargets[id] = numAuditDaily;
        localStorage.setItem('q_daily_audit_targets', JSON.stringify(auditTargets));
        syncDailyAuditTargetsToCloud(auditTargets);

        try {
          const { error: updErr } = await supabase
            .from('q_monitors')
            .update(extendedPayload)
            .eq('id', id);
          if (updErr) throw updErr;
        } catch (colErr) {
          const { error: fbErr } = await supabase
            .from('q_monitors')
            .update(basePayload)
            .eq('id', id);
          if (fbErr) throw fbErr;
        }
      } else {
        try {
          const { data: newMon, error: insErr } = await supabase
            .from('q_monitors')
            .insert([extendedPayload])
            .select()
            .single();
          if (insErr) throw insErr;
          monitorId = newMon.id;
        } catch (colErr) {
          const { data: newMon, error: fbErr } = await supabase
            .from('q_monitors')
            .insert([basePayload])
            .select()
            .single();
          if (fbErr) throw fbErr;
          monitorId = newMon.id;
        }

        if (monitorId) {
          auditTargets[monitorId] = numAuditDaily;
          localStorage.setItem('q_daily_audit_targets', JSON.stringify(auditTargets));
          syncDailyAuditTargetsToCloud(auditTargets);
        }
      }

      // Se informou e-mail para credencial
      if (email) {
        const existingUser = users.find(u => u.email?.toLowerCase() === email.toLowerCase() || u.monitor_id === monitorId);

        if (existingUser) {
          await supabase
            .from('q_users')
            .update({
              name,
              email,
              role: 'monitor',
              monitor_id: monitorId,
              active: true
            })
            .eq('id', existingUser.id);
        } else {
          let authUserId = null;
          if (password && password.length >= 6) {
            const ephemeralAuth = createEphemeralClient();
            const { data: authData, error: authErr } = await ephemeralAuth.auth.signUp({
              email,
              password,
              options: {
                data: { name, role: 'monitor' }
              }
            });
            if (authErr) console.warn('Aviso no Supabase Auth:', authErr);
            authUserId = authData?.user?.id || null;
          }

          await supabase
            .from('q_users')
            .insert([{
              auth_user_id: authUserId,
              email,
              name,
              role: 'monitor',
              monitor_id: monitorId,
              active: true
            }]);
        }
      }

      await fetchStaticData();
      await fetchUsers();
    } catch (err) {
      console.error('Erro ao salvar monitora:', err);
      throw err;
    }
  };

  const handleDeleteMonitor = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir esta monitora? As credenciais de acesso vinculadas também serão excluídas.')) {
      return;
    }
    try {
      await supabase.from('q_users').delete().eq('monitor_id', id);
      const { error } = await supabase
        .from('q_monitors')
        .delete()
        .eq('id', id);
      if (error) throw error;
      await fetchStaticData();
      await fetchUsers();
    } catch (err) {
      console.error('Erro ao excluir monitor:', err);
      alert('Erro ao excluir monitora: ' + (err.message || ''));
    }
  };

  // 6. CRUD Checklist
  const handleAddChecklistItem = async (label, weight) => {
    try {
      const { error } = await supabase
        .from('q_checklist_items')
        .insert([{ label, weight, active: true }]);
      if (error) throw error;
      fetchStaticData();
    } catch (err) {
      console.error('Erro ao adicionar item de checklist:', err);
    }
  };

  const handleDeleteChecklistItem = async (id) => {
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

  // Funções auxiliares para sincronização persistente de configurações na nuvem
  const syncAuditTopicsToCloud = async (topicsList) => {
    try {
      const label = '__CONFIG_AUDIT_TOPICS__:' + JSON.stringify(topicsList);
      const { data: existing } = await supabase
        .from('q_checklist_items')
        .select('id')
        .like('label', '__CONFIG_AUDIT_TOPICS__:%')
        .limit(1);

      if (existing && existing.length > 0) {
        await supabase
          .from('q_checklist_items')
          .update({ label, weight: -999, active: false })
          .eq('id', existing[0].id);
      } else {
        await supabase
          .from('q_checklist_items')
          .insert([{ label, weight: -999, active: false }]);
      }
    } catch (e) {
      console.warn('Erro ao sincronizar temas de auditoria na nuvem:', e);
    }
  };

  const syncDailyAuditTargetsToCloud = async (targetsObj) => {
    try {
      const label = '__CONFIG_DAILY_AUDIT_TARGETS__:' + JSON.stringify(targetsObj);
      const { data: existing } = await supabase
        .from('q_checklist_items')
        .select('id')
        .like('label', '__CONFIG_DAILY_AUDIT_TARGETS__:%')
        .limit(1);

      if (existing && existing.length > 0) {
        await supabase
          .from('q_checklist_items')
          .update({ label, weight: -999, active: false })
          .eq('id', existing[0].id);
      } else {
        await supabase
          .from('q_checklist_items')
          .insert([{ label, weight: -999, active: false }]);
      }
    } catch (e) {
      console.warn('Erro ao sincronizar metas de auditoria na nuvem:', e);
    }
  };

  // 6.b CRUD Temas da Auditoria Formativa
  const handleAddAuditTopic = async ({ name, description, color }) => {
    const newTopic = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `topic-${Date.now()}`,
      name: name.trim(),
      description: description ? description.trim() : '',
      color: color || 'blue',
      created_at: new Date().toISOString()
    };

    let savedTopic = newTopic;
    try {
      const { data, error } = await supabase
        .from('q_audit_topics')
        .insert([{
          name: newTopic.name,
          description: newTopic.description,
          color: newTopic.color
        }])
        .select()
        .single();
      
      if (!error && data) {
        savedTopic = data;
      }
    } catch (e) {
      console.warn('Persistindo tema de auditoria em contingência:', e);
    }

    setAuditTopics(prev => {
      const updated = [...prev, savedTopic];
      localStorage.setItem('q_audit_topics', JSON.stringify(updated));
      syncAuditTopicsToCloud(updated);
      return updated;
    });

    return savedTopic;
  };

  const handleUpdateAuditTopic = async (id, fields, oldName) => {
    try {
      await supabase
        .from('q_audit_topics')
        .update(fields)
        .eq('id', id);
    } catch (e) {
      console.warn('Erro ao atualizar q_audit_topics no Supabase:', e);
    }

    // Se o nome do tema mudou, atualizar retroativamente as auditorias para manter o histórico alinhado
    if (oldName && fields.name && oldName !== fields.name) {
      try {
        await supabase
          .from('q_audits')
          .update({ topic: fields.name })
          .eq('topic', oldName);
        
        setAudits(prev => prev.map(a => a.topic === oldName ? { ...a, topic: fields.name } : a));
      } catch (e) {
        console.warn('Erro ao atualizar tópicos das auditorias existentes:', e);
      }
    }

    setAuditTopics(prev => {
      const updated = prev.map(t => t.id === id ? { ...t, ...fields } : t);
      localStorage.setItem('q_audit_topics', JSON.stringify(updated));
      syncAuditTopicsToCloud(updated);
      return updated;
    });
  };

  const handleDeleteAuditTopic = async (id, _topicName) => {
    try {
      await supabase
        .from('q_audit_topics')
        .delete()
        .eq('id', id);
    } catch (e) {
      console.warn('Erro ao excluir q_audit_topics no Supabase:', e);
    }

    setAuditTopics(prev => {
      const updated = prev.filter(t => t.id !== id);
      localStorage.setItem('q_audit_topics', JSON.stringify(updated));
      syncAuditTopicsToCloud(updated);
      return updated;
    });
  };

  // 6.c CRUD PDI (Plano de Desenvolvimento Individual) com Persistência Cloud Multiplataforma
  const handleSavePdi = async (payload) => {
    try {
      let savedPdi = { ...payload };
      if (!savedPdi.created_at) {
        savedPdi.created_at = new Date().toISOString();
      }
      savedPdi.updated_at = new Date().toISOString();

      const auditPayload = {
        operator_id: savedPdi.operator_id,
        auditor_id: currentUser?.id || null,
        auditor_name: currentUser?.name || 'Sistema Qualidade 156',
        auditor_role: currentUser?.role || 'admin',
        topic: '[PDI] Plano de Desenvolvimento Individual',
        status: savedPdi.status || 'Em Andamento',
        strengths: Array.isArray(savedPdi.strengths) ? savedPdi.strengths.join('\n') : (savedPdi.strengths || ''),
        improvements: Array.isArray(savedPdi.improvements) ? savedPdi.improvements.join('\n') : (savedPdi.improvements || ''),
        action_plan: typeof savedPdi.actionPlan === 'string' ? savedPdi.actionPlan : JSON.stringify(savedPdi.actionPlan || []),
        general_notes: JSON.stringify(savedPdi),
        audit_date: savedPdi.updated_at || savedPdi.created_at || new Date().toISOString()
      };

      // 1. Salvar no Supabase (q_audits) para sincronização em qualquer navegador
      let cloudId = null;
      try {
        const { data: existingAudits } = await supabase
          .from('q_audits')
          .select('id')
          .eq('operator_id', savedPdi.operator_id)
          .eq('topic', '[PDI] Plano de Desenvolvimento Individual')
          .limit(1);

        if (existingAudits && existingAudits.length > 0) {
          cloudId = existingAudits[0].id;
          await supabase
            .from('q_audits')
            .update(auditPayload)
            .eq('id', cloudId);
        } else {
          const { data: inserted, error: insErr } = await supabase
            .from('q_audits')
            .insert([auditPayload])
            .select('id')
            .single();
          if (!insErr && inserted) {
            cloudId = inserted.id;
          }
        }
      } catch (cloudErr) {
        console.warn('Persistindo PDI na nuvem (q_audits fallback):', cloudErr);
      }

      if (cloudId) {
        savedPdi.id = cloudId;
      } else if (!savedPdi.id) {
        savedPdi.id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `pdi-${Date.now()}`;
      }

      // 2. Tentar também q_pdis para compatibilidade futura
      try {
        await supabase
          .from('q_pdis')
          .upsert([savedPdi]);
      } catch (pdiErr) {
        // q_pdis pode não existir, o q_audits acima garante a sincronização
      }

      // 3. Atualizar estado local de PDIs
      setPdis(prev => {
        const index = prev.findIndex(p => 
          (savedPdi.id && p.id === savedPdi.id) || 
          p.operator_id === savedPdi.operator_id ||
          String(p.operator_id) === String(savedPdi.operator_id)
        );
        let updated;
        if (index >= 0) {
          updated = [...prev];
          updated[index] = savedPdi;
        } else {
          updated = [savedPdi, ...prev];
        }
        localStorage.setItem('q_pdis_cache', JSON.stringify(updated));
        return updated;
      });

      alert('PDI registrado e sincronizado em nuvem com sucesso!');
    } catch (err) {
      console.error('Erro ao salvar PDI:', err);
      alert('Erro ao salvar PDI: ' + (err.message || ''));
    }
  };

  const handleDeletePdi = async (pdiId) => {
    try {
      // 1. Excluir de q_audits
      await supabase.from('q_audits').delete().eq('id', pdiId);

      // Também garantir exclusão pelo operator_id
      const targetPdi = pdis.find(p => p.id === pdiId);
      if (targetPdi?.operator_id) {
        await supabase
          .from('q_audits')
          .delete()
          .eq('operator_id', targetPdi.operator_id)
          .eq('topic', '[PDI] Plano de Desenvolvimento Individual');
      }

      // 2. Tentar q_pdis
      try {
        await supabase.from('q_pdis').delete().eq('id', pdiId);
      } catch (_) {}
    } catch (e) {
      console.warn('Erro ao excluir PDI no Supabase:', e);
    }

    setPdis(prev => {
      const updated = prev.filter(p => p.id !== pdiId);
      localStorage.setItem('q_pdis_cache', JSON.stringify(updated));
      return updated;
    });
  };

  // 7. Sincronização automática via Excel Upload
  const handleExcelUpload = async (parsedOperators) => {
    setIsLoading(true);
    try {
      // a. Criar supervisores novos
      const uniqueSuperNames = [...new Set(parsedOperators.map(o => o.supervisor_name).filter(Boolean))];
      const { data: currentSupers } = await supabase.from('q_supervisors').select('id, name');
      const currentSuperNames = (currentSupers || []).map(s => s.name);
      
      const newSuperNames = uniqueSuperNames.filter(name => !currentSuperNames.includes(name));
      if (newSuperNames.length > 0) {
        const { data: insertedSupers } = await supabase
          .from('q_supervisors')
          .insert(newSuperNames.map(name => ({ name })))
          .select('id, name');
        if (insertedSupers && currentSupers) {
          currentSupers.push(...insertedSupers);
        }
      }

      // Mapear nome de supervisor para ID
      const superNameToIdMap = {};
      (currentSupers || []).forEach(s => {
        superNameToIdMap[s.name] = s.id;
      });

      // b. Processar Operadores
      const { data: currentOps } = await supabase
        .from('q_operators')
        .select('id, name, matricula, supervisor_id, supervisor_name, schedule, allocation, skill, escala, active, status_feedback');
      
      const currentOpsByName = {};
      const currentOpsByMatricula = {};
      (currentOps || []).forEach(o => {
        if (o.name) currentOpsByName[o.name.trim().toLowerCase()] = o;
        if (o.matricula) currentOpsByMatricula[String(o.matricula).trim().toLowerCase()] = o;
      });

      const opsToUpsert = [];
      const processedIds = new Set();
      const processedNames = new Set();
      
      const normalizeSkill = (s) => {
        if (!s) return 'Voz';
        const cleaned = s.trim().toLowerCase();
        return (cleaned.includes('midia') || cleaned.includes('mídia')) ? 'Mídias' : 'Voz';
      };

      parsedOperators.forEach(op => {
        const supervisor_id = superNameToIdMap[op.supervisor_name] || null;
        
        // Identificar se já existe por matrícula ou por nome
        const normName = (op.name || '').trim().toLowerCase();
        const normMatricula = (op.matricula || '').trim().toLowerCase();
        
        const existing = (normMatricula && currentOpsByMatricula[normMatricula]) || (normName && currentOpsByName[normName]) || null;

        const opRecord = {
          name: op.name,
          matricula: op.matricula || (existing ? existing.matricula : null),
          supervisor_id,
          supervisor_name: op.supervisor_name || 'Geral',
          schedule: op.schedule || '08:00 - 17:12',
          allocation: op.allocation || 'Presencial',
          skill: normalizeSkill(op.skill),
          escala: op.escala || '6x1',
          active: true,
          status_feedback: existing ? existing.status_feedback : 'Liberado'
        };

        if (existing && existing.id) {
          opRecord.id = existing.id;
          processedIds.add(existing.id);
        }

        opsToUpsert.push(opRecord);
        processedNames.add(normName);
      });

      // c. Inativar operadores ausentes na planilha
      const opsToInactivate = (currentOps || []).filter(o => 
        o.active && 
        !processedIds.has(o.id) && 
        !processedNames.has((o.name || '').trim().toLowerCase())
      );
      opsToInactivate.forEach(o => {
        opsToUpsert.push({
          id: o.id,
          name: o.name,
          matricula: o.matricula,
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

      // d. Salvar tudo (separar inserções novas e atualizações para evitar erros de conflito)
      const opsToInsert = opsToUpsert.filter(o => !o.id);
      const opsToUpdate = opsToUpsert.filter(o => o.id);

      if (opsToInsert.length > 0) {
        const { error: insError } = await supabase.from('q_operators').insert(opsToInsert);
        if (insError) throw insError;
      }

      if (opsToUpdate.length > 0) {
        const { error: upError } = await supabase.from('q_operators').upsert(opsToUpdate);
        if (upError) throw upError;
      }

      await fetchStaticData();
      await fetchData();
    } catch (err) {
      console.error('Erro na sincronização de planilha:', err);
      const msg = err?.message || err?.details || JSON.stringify(err);
      if (msg && msg.includes('matricula')) {
        alert('Atenção: A coluna "matricula" ainda não foi criada no banco de dados do Supabase.\n\nExecute o comando abaixo no SQL Editor do Supabase para habilitar o campo:\nALTER TABLE public.q_operators ADD COLUMN IF NOT EXISTS matricula TEXT;');
      } else {
        alert(`Erro ao importar operadores: ${msg}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 8. Iniciar Monitoria com Trava de Concorrência (Lock de 30 min)
  const activeMonitorObj = useMemo(() => {
    if (currentUser?.monitor_id) {
      const mon = monitors.find(m => m.id === currentUser.monitor_id);
      if (mon) return mon;
    }
    const byName = monitors.find(m => m.name.toLowerCase() === currentUser?.name?.toLowerCase());
    if (byName) return byName;
    return monitors[0] || { id: '00000000-0000-0000-0000-000000000000', name: currentUser?.name || 'Monitora' };
  }, [monitors, currentUser]);

  const handleStartMonitoring = async (op) => {
    try {
      // 1. Consultar estado mais recente do banco de dados em tempo real
      const { data: freshOp, error: fetchErr } = await supabase
        .from('q_operators')
        .select('id, name, locked_by_monitor_id, locked_by_monitor_name, locked_at')
        .eq('id', op.id)
        .maybeSingle();

      if (fetchErr) {
        console.warn('Aviso ao consultar operador no Supabase:', fetchErr);
      }

      const currentOp = freshOp || op;
      const isLocked = Boolean(
        currentOp.locked_at && 
        (new Date() - new Date(currentOp.locked_at)) < 30 * 60 * 1000
      );

      const myEmail = currentUser?.email?.toLowerCase();
      const myName = (currentUser?.name || activeMonitorObj?.name || '').toLowerCase();
      const myMonitorId = activeMonitorObj?.id;
      const lockNameLower = (currentOp.locked_by_monitor_name || '').toLowerCase();

      const isLockedByMe = isLocked && Boolean(
        (myEmail && lockNameLower.includes(myEmail)) ||
        (myName && myName.length > 2 && lockNameLower.includes(myName)) ||
        (myMonitorId && currentOp.locked_by_monitor_id === myMonitorId)
      );

      const isLockedByOther = isLocked && !isLockedByMe;

      if (isLockedByOther) {
        const displayName = currentOp.locked_by_monitor_name 
          ? currentOp.locked_by_monitor_name.replace(/\s*\[.*?\]/, '') 
          : 'outro usuário';
        alert(`Atenção: O operador ${op.name} já está em processo de avaliação/atendimento por ${displayName} neste momento.\n\nPara evitar duplicidade, selecione outro operador.`);
        fetchData();
        return; // INTERROMPE E NÃO ABRE O MODAL
      }

      // Validar se activeMonitorObj.id é UUID válido em q_monitors para não violar FK
      const validMonitorId = (activeMonitorObj?.id && monitors.some(m => m.id === activeMonitorObj.id)) 
        ? activeMonitorObj.id 
        : null;

      const userIdent = currentUser?.email || currentUser?.name || activeMonitorObj?.name || 'Avaliador';
      const lockedName = `${currentUser?.name || activeMonitorObj?.name || 'Avaliador'} (Monitoria) [${userIdent}]`;

      const { error: lockErr } = await supabase.from('q_operators').update({
        locked_by_monitor_id: validMonitorId,
        locked_by_monitor_name: lockedName,
        locked_at: new Date().toISOString()
      }).eq('id', op.id);

      if (lockErr) {
        console.error('Falha ao travar operador no banco:', lockErr);
        alert(`Não foi possível iniciar: erro ao registrar trava no banco de dados (${lockErr.message || JSON.stringify(lockErr)}).`);
        return; // INTERROMPE E NÃO ABRE O MODAL
      }

      // Atualizar no estado local
      setOperators(prev => prev.map(o => o.id === op.id ? {
        ...o,
        locked_by_monitor_id: validMonitorId,
        locked_by_monitor_name: lockedName,
        locked_at: new Date().toISOString()
      } : o));

      setSelectedOperatorForMonitoring(op);
    } catch (err) {
      console.error('Erro inesperado em handleStartMonitoring:', err);
      alert('Erro inesperado ao iniciar monitoria: ' + (err.message || ''));
    }
  };

  // Liberar trava ao fechar/cancelar modal de monitoria imediatamente
  const handleCloseMonitoringModal = async () => {
    const opToUnlock = selectedOperatorForMonitoring;
    setSelectedOperatorForMonitoring(null);
    setEditingMonitoring(null);

    if (opToUnlock) {
      try {
        await supabase.from('q_operators').update({
          locked_by_monitor_id: null,
          locked_by_monitor_name: null,
          locked_at: null
        }).eq('id', opToUnlock.id);

        setOperators(prev => prev.map(o => o.id === opToUnlock.id ? {
          ...o,
          locked_by_monitor_id: null,
          locked_by_monitor_name: null,
          locked_at: null
        } : o));

        fetchData();
      } catch (e) {
        console.warn('Erro ao liberar trava do operador:', e);
      }
    }
  };

  // 9. Concorrência e Handlers de Auditoria Formativa (Sem Nota)
  const handleStartAudit = async (op) => {
    try {
      const { data: freshOp, error: fetchErr } = await supabase
        .from('q_operators')
        .select('id, name, locked_by_monitor_id, locked_by_monitor_name, locked_at')
        .eq('id', op.id)
        .maybeSingle();

      if (fetchErr) {
        console.warn('Aviso ao consultar operador no Supabase:', fetchErr);
      }

      const currentOp = freshOp || op;
      const isLocked = Boolean(
        currentOp.locked_at && 
        (new Date() - new Date(currentOp.locked_at)) < 30 * 60 * 1000
      );

      const myEmail = currentUser?.email?.toLowerCase();
      const myName = (currentUser?.name || activeMonitorObj?.name || '').toLowerCase();
      const myMonitorId = activeMonitorObj?.id;
      const lockNameLower = (currentOp.locked_by_monitor_name || '').toLowerCase();

      const isLockedByMe = isLocked && Boolean(
        (myEmail && lockNameLower.includes(myEmail)) ||
        (myName && myName.length > 2 && lockNameLower.includes(myName)) ||
        (myMonitorId && currentOp.locked_by_monitor_id === myMonitorId)
      );

      const isLockedByOther = isLocked && !isLockedByMe;

      if (isLockedByOther) {
        const displayName = currentOp.locked_by_monitor_name 
          ? currentOp.locked_by_monitor_name.replace(/\s*\[.*?\]/, '') 
          : 'outro usuário';
        alert(`Atenção: O operador ${op.name} já está em processo de ${currentOp.locked_by_monitor_name?.includes('Monitoria') ? 'Monitoria' : 'Auditoria'} por ${displayName} neste momento.\n\nPara evitar conflito, selecione outro operador.`);
        fetchData();
        return; // INTERROMPE E NÃO ABRE O MODAL
      }

      const validMonitorId = (activeMonitorObj?.id && monitors.some(m => m.id === activeMonitorObj.id)) 
        ? activeMonitorObj.id 
        : null;

      const userIdent = currentUser?.email || currentUser?.name || 'Avaliador';
      const lockedName = `${currentUser?.name || 'Avaliador'} (Auditoria) [${userIdent}]`;

      const { error: lockErr } = await supabase.from('q_operators').update({
        locked_by_monitor_id: validMonitorId,
        locked_by_monitor_name: lockedName,
        locked_at: new Date().toISOString()
      }).eq('id', op.id);

      if (lockErr) {
        console.error('Falha ao travar operador para auditoria:', lockErr);
        alert(`Não foi possível iniciar auditoria: erro ao registrar trava no banco de dados (${lockErr.message || JSON.stringify(lockErr)}).`);
        return; // INTERROMPE E NÃO ABRE O MODAL
      }

      setOperators(prev => prev.map(o => o.id === op.id ? {
        ...o,
        locked_by_monitor_id: validMonitorId,
        locked_by_monitor_name: lockedName,
        locked_at: new Date().toISOString()
      } : o));

      setSelectedOperatorForAudit(op);
      setSelectedAuditForView(null);
    } catch (err) {
      console.error('Erro inesperado em handleStartAudit:', err);
      alert('Erro inesperado ao iniciar auditoria: ' + (err.message || ''));
    }
  };

  const handleCloseAuditModal = async () => {
    const opToUnlock = selectedOperatorForAudit;
    setSelectedOperatorForAudit(null);
    setSelectedAuditForView(null);

    if (opToUnlock) {
      try {
        await supabase.from('q_operators').update({
          locked_by_monitor_id: null,
          locked_by_monitor_name: null,
          locked_at: null
        }).eq('id', opToUnlock.id);

        setOperators(prev => prev.map(o => o.id === opToUnlock.id ? {
          ...o,
          locked_by_monitor_id: null,
          locked_by_monitor_name: null,
          locked_at: null
        } : o));

        fetchData();
      } catch (e) {
        console.warn('Erro ao liberar trava da auditoria:', e);
      }
    }
  };

  const handleSaveAudit = async (payload) => {
    try {
      if (payload.id) {
        const { error } = await supabase
          .from('q_audits')
          .update(payload)
          .eq('id', payload.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('q_audits')
          .insert([payload]);
        if (error) throw error;
      }

      if (selectedOperatorForAudit) {
        try {
          await supabase.from('q_operators').update({
            locked_by_monitor_id: null,
            locked_by_monitor_name: null,
            locked_at: null
          }).eq('id', selectedOperatorForAudit.id);
        } catch (e) {
          console.warn('Erro ao destravar pós auditoria:', e);
        }
      }

      setSelectedOperatorForAudit(null);
      setSelectedAuditForView(null);
      fetchData();
    } catch (err) {
      console.error('Erro ao salvar auditoria:', err);
      alert('Erro ao salvar auditoria no Supabase: ' + (err.message || ''));
    }
  };

  // Excluir auditoria formativa
  const handleDeleteAudit = async (auditId) => {
    try {
      const { error } = await supabase
        .from('q_audits')
        .delete()
        .eq('id', auditId);
      if (error) throw error;
      setAudits(prev => prev.filter(a => a.id !== auditId));
      alert('Auditoria excluída com sucesso.');
    } catch (err) {
      console.error('Erro ao excluir auditoria:', err);
      alert('Erro ao excluir auditoria no banco de dados: ' + (err.message || ''));
    }
  };

  // Forçar liberação de trava (Desbloqueio manual de emergência)
  const handleForceUnlockOperator = async (opId) => {
    try {
      await supabase.from('q_operators').update({
        locked_by_monitor_id: null,
        locked_by_monitor_name: null,
        locked_at: null
      }).eq('id', opId);

      setOperators(prev => prev.map(o => o.id === opId ? {
        ...o,
        locked_by_monitor_id: null,
        locked_by_monitor_name: null,
        locked_at: null
      } : o));

      fetchData();
    } catch (e) {
      console.error('Erro ao liberar trava do operador:', e);
    }
  };

  // Salvar monitoria (criar ou editar)
  const handleSaveMonitoring = async (payload) => {
    if (!payload.cycle_id) {
      alert('Erro: Nenhum ciclo ativo foi encontrado. Crie um ciclo na aba "Configurações" antes de realizar monitorias.');
      return;
    }
    if (!payload.monitor_id || payload.monitor_id === '00000000-0000-0000-0000-000000000000') {
      alert('Erro: Nenhuma monitora cadastrada ou selecionada para assinar esta avaliação. Cadastre uma monitora na aba "Monitoras & Supervisores" ou selecione uma no cabeçalho antes de salvar.');
      return;
    }

    try {
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

        // Atualizar status do operador para Aguardando Feedback e registrar última monitoria
        try {
          await supabase
            .from('q_operators')
            .update({
              status_feedback: 'Aguardando Feedback',
              last_monitoring_at: dbPayload.monitoring_date || new Date().toISOString()
            })
            .eq('id', dbPayload.operator_id);
        } catch (opUpdErr) {
          console.warn('Aviso ao atualizar operador para Aguardando Feedback:', opUpdErr);
        }
      }
      
      // Liberar trava do operador no Supabase
      if (selectedOperatorForMonitoring) {
        try {
          await supabase.from('q_operators').update({
            locked_by_monitor_id: null,
            locked_by_monitor_name: null,
            locked_at: null
          }).eq('id', selectedOperatorForMonitoring.id);
        } catch (e) {
          console.warn('Aviso ao liberar lock pós salvamento:', e);
        }
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
      const nowIso = payload.feedback_date || new Date().toISOString();
      const updateMonitoringPayload = {
        status: 'Feedback Concluído',
        feedback_date: nowIso,
        feedback_notes: payload.feedback_notes
      };

      // Tenta gravar campos estendidos na monitoria (se colunas existirem no DB)
      try {
        const { error: monError } = await supabase
          .from('q_monitorings')
          .update({
            ...updateMonitoringPayload,
            feedback_parecer: payload.feedback_parecer,
            feedback_given_by_name: payload.feedback_given_by_name
          })
          .eq('id', payload.monitoring_id);

        if (monError) {
          // Fallback para colunas básicas se as novas colunas ainda não existirem
          console.warn('Aviso colunas estendidas q_monitorings, aplicando fallback:', monError);
          const { error: fbErr } = await supabase
            .from('q_monitorings')
            .update(updateMonitoringPayload)
            .eq('id', payload.monitoring_id);
          if (fbErr) throw fbErr;
        }
      } catch (colErr) {
        console.warn('Fallback para update básico q_monitorings:', colErr);
        await supabase
          .from('q_monitorings')
          .update(updateMonitoringPayload)
          .eq('id', payload.monitoring_id);
      }

      // Desbloquear o operador para futuras monitorias (status_feedback: 'Liberado')
      const targetOpId = payload.operator_id || selectedOperatorForFeedback?.id;
      if (targetOpId) {
        const { error: opError } = await supabase
          .from('q_operators')
          .update({
            status_feedback: 'Liberado',
            last_feedback_at: nowIso
          })
          .eq('id', targetOpId);

        if (opError) {
          console.warn('Aviso ao atualizar status_feedback no operador:', opError);
        }
      }

      setSelectedOperatorForFeedback(null);
      await fetchData();
      alert('Feedback e parecer confirmados com sucesso! Operador liberado para novas avaliações.');
    } catch (err) {
      console.error('Erro ao salvar feedback:', err);
      alert('Erro ao confirmar feedback: ' + (err.message || ''));
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setSession(null);
      setCurrentUser(null);
      setUserRole('admin');
    } catch (err) {
      console.error('Erro ao sair do sistema:', err);
    }
  };

  // 10. Filtragens RBAC baseadas no cargo logado
  const isSupervisor = userRole === 'supervisor';
  const isMonitor = userRole === 'monitor';
  const isOperator = userRole === 'operador';

  // Resolução exata do supervisor logado (ID e nome)
  const activeSupervisorRecord = useMemo(() => {
    if (!isSupervisor || !currentUser) return null;
    const cleanUserName = (currentUser.name || '').replace(/\s*\(supervisor\)/i, '').trim().toLowerCase();
    return supervisors.find(s => 
      (currentUser.supervisor_id && s.id === currentUser.supervisor_id) ||
      (currentUser.id && s.id === currentUser.id) ||
      (s.name && cleanUserName && s.name.trim().toLowerCase() === cleanUserName) ||
      (s.name && cleanUserName && (s.name.toLowerCase().includes(cleanUserName) || cleanUserName.includes(s.name.toLowerCase())))
    ) || null;
  }, [isSupervisor, currentUser, supervisors]);

  const effectiveSupervisorId = activeSupervisorRecord?.id || currentUser?.supervisor_id || null;
  const effectiveSupervisorName = activeSupervisorRecord?.name || currentUser?.name?.replace(/\s*\(supervisor\)/i, '') || '';

  // Identificar operador logado de forma abrangente e infalível
  const loggedOperator = useMemo(() => {
    if (!isOperator) return null;

    const currentMatricula = currentUser?.matricula ? String(currentUser.matricula).trim().toLowerCase() : '';
    const currentEmail = currentUser?.email ? currentUser.email.toLowerCase().trim() : '';
    const currentName = currentUser?.name ? currentUser.name.toLowerCase().trim() : '';

    const found = 
      // 1. Por operator_id explicitamente gravado
      (currentUser?.operator_id && operators.find(o => o.id === currentUser.operator_id)) ||
      // 2. Por matrícula (removendo prefixos e normalizando)
      (currentMatricula && operators.find(o => o.matricula && String(o.matricula).trim().toLowerCase() === currentMatricula)) ||
      // 3. Por e-mail se existir campo email no operador
      (currentEmail && operators.find(o => o.email && o.email.toLowerCase().trim() === currentEmail)) ||
      // 4. Se o e-mail for op_<matricula>@156poa.com.br, extrai matrícula
      (currentEmail.startsWith('op_') && operators.find(o => {
        const extracted = currentEmail.replace(/^op_/, '').split('@')[0];
        return o.matricula && String(o.matricula).trim().toLowerCase() === extracted.toLowerCase();
      })) ||
      // 5. Por nome exato
      (currentName && !currentName.startsWith('operador (') && operators.find(o => o.name && o.name.toLowerCase().trim() === currentName)) ||
      // 6. Por nome aproximado
      (currentName && !currentName.startsWith('operador (') && operators.find(o => o.name && (o.name.toLowerCase().includes(currentName) || currentName.includes(o.name.toLowerCase())))) ||
      null;

    if (found) {
      // Se o operador não tiver supervisor_name mas tiver supervisor_id, hidrata o nome do supervisor
      const sup = supervisors.find(s => s.id === found.supervisor_id);
      const resolvedSupervisorName = found.supervisor_name || (sup ? sup.name : 'Supervisor Geral');
      return {
        ...found,
        supervisor_name: resolvedSupervisorName
      };
    }

    return null;
  }, [isOperator, operators, currentUser, supervisors]);

  // Filtrar operadores por supervisor se for supervisor logado
  const filteredOperators = useMemo(() => {
    if (!isSupervisor) return operators;
    return operators.filter(o => {
      const matchId = effectiveSupervisorId && o.supervisor_id === effectiveSupervisorId;
      const matchName = effectiveSupervisorName && o.supervisor_name && 
        (o.supervisor_name.toLowerCase().includes(effectiveSupervisorName.toLowerCase()) || 
         effectiveSupervisorName.toLowerCase().includes(o.supervisor_name.toLowerCase()));
      return matchId || matchName;
    });
  }, [operators, isSupervisor, effectiveSupervisorId, effectiveSupervisorName]);

  // Filtrar monitorias por supervisor se for supervisor logado
  const filteredMonitorings = useMemo(() => {
    if (!isSupervisor) return monitorings;
    const supervisorOpIds = new Set(filteredOperators.map(o => o.id));
    return monitorings.filter(m => supervisorOpIds.has(m.operator_id));
  }, [monitorings, filteredOperators, isSupervisor]);

  // Filtrar fila inteligente se for monitora vinculada
  const queueOperators = useMemo(() => {
    if (!isMonitor || !currentUser?.monitor_id) return filteredOperators;
    return filteredOperators.filter(o => 
      o.assigned_monitor_id === null || 
      o.assigned_monitor_id === currentUser.monitor_id
    );
  }, [filteredOperators, currentUser, isMonitor]);

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
        userRole={userRole}
      />

      {/* Main Panel */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Header */}
        <Header 
          currentUser={currentUser}
          userRole={userRole}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          alertsCount={0}
          activeTab={activeTab}
          onLogout={handleLogout}
        />

        {/* Content Wrapper */}
        <main className="flex-1 p-6 overflow-y-auto">
          {isLoading && operators.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <span className="text-sm text-zinc-500 dark:text-zinc-400">Carregando sistema...</span>
            </div>
          ) : (
            <>
              {/* Portal Exclusivo do Operador */}
              {(isOperator || activeTab === 'portal') && (
                <OperatorPortal 
                  currentUser={currentUser}
                  operator={loggedOperator}
                  monitorings={monitorings}
                  audits={audits}
                  pdis={pdis}
                />
              )}

              {/* Dashboard */}
              {!isOperator && activeTab === 'dashboard' && (
                <Dashboard 
                  operators={filteredOperators} 
                  allOperators={operators}
                  monitorings={filteredMonitorings} 
                  allMonitorings={monitorings}
                  audits={audits}
                  monitors={monitors}
                  supervisors={supervisors}
                  activeCycle={activeCycle}
                  darkMode={darkMode} 
                  userRole={userRole}
                />
              )}

              {/* Fila Inteligente (com Trava de Concorrência) */}
              {!isOperator && activeTab === 'queue' && (
                <SmartQueue 
                  operators={queueOperators}
                  monitorings={filteredMonitorings}
                  activeCycle={activeCycle}
                  onStartMonitoring={handleStartMonitoring}
                  onStartAudit={handleStartAudit}
                  onOpenFeedback={(op, mon) => {
                    const pendingMon = mon || monitorings.find(m => m.operator_id === op.id && m.status === 'Aguardando Feedback');
                    setSelectedOperatorForFeedback({ ...op, targetMonitoring: pendingMon || null });
                  }}
                  onForceUnlock={handleForceUnlockOperator}
                  currentMonitor={activeMonitorObj}
                  currentUser={currentUser}
                  isLoading={isLoading}
                />
              )}

              {/* Gestão de Colaboradores */}
              {!isOperator && activeTab === 'operators' && (
                <Operators 
                  operators={filteredOperators}
                  supervisors={supervisors}
                  onAddOperator={() => {
                    setEditingOperator(null);
                    setOpFormFields({
                      name: '',
                      matricula: '',
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

              {/* Histórico Geral de Monitorias */}
              {!isOperator && activeTab === 'monitorings_history' && (
                <MonitoringsHistory 
                  operators={filteredOperators}
                  monitorings={filteredMonitorings}
                  monitors={monitors}
                  supervisors={supervisors}
                  onEditMonitoring={handleEditMonitoringClick}
                  onDeleteMonitoring={handleDeleteMonitoring}
                  onOpenFeedback={(op, mon) => setSelectedOperatorForFeedback({ ...op, targetMonitoring: mon })}
                  activeProfile={{ 
                    ...currentUser, 
                    role: userRole,
                    supervisor_id: effectiveSupervisorId,
                    name: effectiveSupervisorName || currentUser?.name 
                  }}
                  darkMode={darkMode}
                />
              )}

              {/* Nova Aba: Auditorias de Desenvolvimento (Sem Nota) */}
              {!isOperator && activeTab === 'audits' && (
                <Audits 
                  audits={audits}
                  operators={filteredOperators}
                  supervisors={supervisors}
                  currentUser={currentUser}
                  onStartAudit={handleStartAudit}
                  onForceUnlock={handleForceUnlockOperator}
                  onDeleteAudit={handleDeleteAudit}
                  onViewAudit={(audit) => {
                    const op = operators.find(o => o.id === audit.operator_id) || audit.q_operators || { id: audit.operator_id, name: audit.operator_name };
                    setSelectedOperatorForAudit(op);
                    setSelectedAuditForView(audit);
                  }}
                  onRefresh={fetchData}
                  isLoading={isLoading}
                  auditTopics={auditTopics}
                  onOpenManageTopics={() => setShowAuditTopicsModal(true)}
                />
              )}

              {/* Nova Aba: Diagnóstico & PDI (Monitorias + Auditorias) */}
              {!isOperator && activeTab === 'pdi' && (
                <PdiManagement
                  operators={filteredOperators}
                  monitorings={filteredMonitorings}
                  audits={audits}
                  pdis={pdis}
                  supervisors={supervisors}
                  currentUser={currentUser}
                  onOpenPdi={(op, pdi) => {
                    setSelectedOperatorForPdi(op);
                    setSelectedPdiForEdit(pdi || null);
                  }}
                  onDeletePdi={handleDeletePdi}
                  onRefresh={fetchData}
                  isLoading={isLoading}
                />
              )}

              {/* Monitoras & Supervisores */}
              {!isOperator && activeTab === 'monitors' && (
                <MonitorsSupervisors 
                  operators={filteredOperators}
                  monitorings={filteredMonitorings}
                  audits={audits}
                  monitors={monitors}
                  supervisors={supervisors}
                  users={users}
                  activeCycle={activeCycle}
                  onSaveMonitor={handleSaveMonitor}
                  onDeleteMonitor={handleDeleteMonitor}
                  onSaveSupervisor={handleSaveSupervisor}
                  onDeleteSupervisor={handleDeleteSupervisor}
                />
              )}

              {/* Inteligência Analítica */}
              {!isOperator && activeTab === 'intelligence' && (
                <AnalyticalIntelligence 
                  operators={filteredOperators}
                  monitorings={filteredMonitorings}
                  activeCycle={activeCycle}
                  darkMode={darkMode} 
                />
              )}

              {/* Central de Relatórios */}
              {!isOperator && activeTab === 'reports' && (
                <Reports 
                  operators={filteredOperators}
                  monitorings={filteredMonitorings}
                  monitors={monitors}
                  supervisors={supervisors}
                />
              )}

              {/* Configuração de Checklist e Temas */}
              {!isOperator && activeTab === 'config' && (
                <ConfigChecklist 
                  checklistItems={checklistItems}
                  onAddChecklistItem={handleAddChecklistItem}
                  onDeleteChecklistItem={handleDeleteChecklistItem}
                  isLoading={isLoading}
                  auditTopics={auditTopics}
                  onAddAuditTopic={handleAddAuditTopic}
                  onUpdateAuditTopic={handleUpdateAuditTopic}
                  onDeleteAuditTopic={handleDeleteAuditTopic}
                  audits={audits}
                />
              )}

              {/* Gestão de Acessos & Usuários (Exclusivo Admin) */}
              {!isOperator && activeTab === 'users' && userRole === 'admin' && (
                <UserManagement 
                  users={users}
                  operators={operators}
                  supervisors={supervisors}
                  monitors={monitors}
                  onRefreshUsers={fetchUsers}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* ================= MODAIS DE AVALIAÇÃO E FICHA ================= */}

      {/* Modal: Realizar/Editar Monitoria (com Liberação de Trava ao fechar) */}
      {selectedOperatorForMonitoring && (
        <MonitoringModal
          operator={selectedOperatorForMonitoring}
          monitor={activeMonitorObj}
          activeCycle={activeCycle}
          defaultChecklistItems={checklistItems}
          onClose={handleCloseMonitoringModal}
          onSave={handleSaveMonitoring}
          monitoring={editingMonitoring}
        />
      )}

      {/* Modal: Realizar/Visualizar Auditoria Formativa (Sem Nota) */}
      {selectedOperatorForAudit && (
        <AuditModal
          operator={selectedOperatorForAudit}
          auditor={currentUser}
          onClose={handleCloseAuditModal}
          onSave={handleSaveAudit}
          audit={selectedAuditForView}
          auditTopics={auditTopics}
          onAddTopic={handleAddAuditTopic}
          onUpdateTopic={handleUpdateAuditTopic}
          onDeleteTopic={handleDeleteAuditTopic}
          audits={audits}
        />
      )}

      {/* Modal: Gestão de Temas Principais da Auditoria */}
      {showAuditTopicsModal && (
        <AuditTopicsModal
          topics={auditTopics}
          audits={audits}
          onClose={() => setShowAuditTopicsModal(false)}
          onAddTopic={handleAddAuditTopic}
          onUpdateTopic={handleUpdateAuditTopic}
          onDeleteTopic={handleDeleteAuditTopic}
        />
      )}

      {/* Modal: Registrar Feedback */}
      {selectedOperatorForFeedback && (
        <FeedbackModal
          operator={selectedOperatorForFeedback}
          currentUser={currentUser}
          targetMonitoring={selectedOperatorForFeedback.targetMonitoring || null}
          onClose={() => setSelectedOperatorForFeedback(null)}
          onSave={handleSaveFeedback}
        />
      )}

      {/* Modal: Ficha Completa do Operador */}
      {selectedOperatorForProfile && (
        <OperatorProfileModal
          operator={selectedOperatorForProfile}
          onClose={() => setSelectedOperatorForProfile(null)}
          onEditMonitoring={handleEditMonitoringClick}
          onDeleteMonitoring={handleDeleteMonitoring}
          darkMode={darkMode}
          onOpenPdi={(op) => {
            setSelectedOperatorForPdi(op);
            const existing = pdis.find(p => p.operator_id === op.id);
            setSelectedPdiForEdit(existing || null);
          }}
        />
      )}

      {/* Modal: Ficha e Gerador de PDI (Monitorias + Auditorias) */}
      {selectedOperatorForPdi && (
        <PdiModal
          operator={selectedOperatorForPdi}
          pdi={selectedPdiForEdit}
          monitorings={monitorings}
          audits={audits}
          currentUser={currentUser}
          onClose={() => {
            setSelectedOperatorForPdi(null);
            setSelectedPdiForEdit(null);
          }}
          onSavePdi={handleSavePdi}
          onDeletePdi={handleDeletePdi}
          darkMode={darkMode}
        />
      )}

      {/* Modal: Adicionar/Editar Operador (Manual) */}
      {showOpForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#0c0c0f] w-full max-w-md rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-900/10">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                {editingOperator ? 'Editar Colaborador' : 'Adicionar Colaborador'}
              </h3>
              <button onClick={() => setShowOpForm(false)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveOperator} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-1.5">
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
                  <label className="font-semibold text-zinc-500">Matrícula</label>
                  <input
                    type="text"
                    placeholder="Ex: 156001"
                    value={opFormFields.matricula || ''}
                    onChange={(e) => setOpFormFields({ ...opFormFields, matricula: e.target.value })}
                    className="w-full bg-[#ffffff] dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-zinc-950 dark:text-zinc-100"
                  />
                </div>
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
