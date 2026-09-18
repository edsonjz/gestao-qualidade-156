import React, { useState, useEffect, useCallback, useMemo } from 'react';
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

// Modais
import MonitoringModal from './components/MonitoringModal';
import FeedbackModal from './components/FeedbackModal';
import OperatorProfileModal from './components/OperatorProfileModal';
import AuditModal from './components/AuditModal';
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
      const extractedMatricula = currentSession.user.user_metadata?.matricula || (isOpEmail ? email.replace(/^op_/, '').split('@')[0] : null);

      if (data && data.active !== false) {
        setCurrentUser({ ...data, matricula: data.matricula || extractedMatricula });
        setUserRole(data.role || (isOpEmail ? 'operador' : 'monitor'));
        if (data.role === 'operador' || isOpEmail) {
          setActiveTab('portal');
        }
      } else {
        // Fallback para role nos metadados ou operador/monitor
        const roleFromMeta = isOpEmail ? 'operador' : (currentSession.user.user_metadata?.role || 'monitor');
        const profile = {
          id: currentSession.user.id,
          email: email,
          name: currentSession.user.user_metadata?.name || (isOpEmail ? `Operador (${extractedMatricula})` : email.split('@')[0]),
          role: roleFromMeta,
          matricula: extractedMatricula
        };
        setCurrentUser(profile);
        setUserRole(roleFromMeta);
        if (roleFromMeta === 'operador') {
          setActiveTab('portal');
        }
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

      // d. Itens do Checklist
      const { data: checklistData } = await supabase
        .from('q_checklist_items')
        .select('id, label, weight')
        .order('weight', { ascending: false });
      setChecklistItems(checklistData || []);

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
      setOperators(operatorsData || []);

      // e. Monitorias
      const { data: monitoringsData } = await supabase
        .from('q_monitorings')
        .select('id, operator_id, monitor_id, cycle_id, score, monitoring_date, status, feedback_date, feedback_notes, checklist, is_ncg, q_monitors(name), q_operators(name, supervisor_name, schedule, allocation, skill, escala, matricula)')
        .order('monitoring_date', { ascending: false });
      setMonitorings(monitoringsData || []);

      // f. Auditorias de Desenvolvimento (sem nota)
      try {
        const { data: auditsData } = await supabase
          .from('q_audits')
          .select('*, q_operators(name, matricula, supervisor_id, supervisor_name, schedule, allocation, skill, escala)')
          .order('audit_date', { ascending: false });
        setAudits(auditsData || []);
      } catch (aErr) {
        console.warn('Tabela q_audits ainda não criada ou inacessível:', aErr);
      }

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
      fetchUsers();

      // Sincronização periódica leve das travas concorrentes a cada 15 segundos
      const lockInterval = setInterval(async () => {
        try {
          const { data: locks } = await supabase
            .from('q_operators')
            .select('id, locked_by_monitor_id, locked_by_monitor_name, locked_at, status_feedback, last_monitoring_at');
          if (locks && locks.length > 0) {
            setOperators(prev => prev.map(op => {
              const fresh = locks.find(l => l.id === op.id);
              if (!fresh) return op;
              if (
                fresh.locked_by_monitor_id !== op.locked_by_monitor_id || 
                fresh.locked_at !== op.locked_at ||
                fresh.status_feedback !== op.status_feedback
              ) {
                return {
                  ...op,
                  locked_by_monitor_id: fresh.locked_by_monitor_id,
                  locked_by_monitor_name: fresh.locked_by_monitor_name,
                  locked_at: fresh.locked_at,
                  status_feedback: fresh.status_feedback,
                  last_monitoring_at: fresh.last_monitoring_at
                };
              }
              return op;
            }));
          }
        } catch (e) {
          // ignore silent poll failure
        }
      }, 15000);

      return () => clearInterval(lockInterval);
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

  // 5. CRUD Monitores (com metas e credenciais)
  const handleSaveMonitor = async ({ id, name, daily_target, email, password }) => {
    try {
      let monitorId = id;
      if (id) {
        const { error: updErr } = await supabase
          .from('q_monitors')
          .update({ name, daily_target })
          .eq('id', id);
        if (updErr) throw updErr;
      } else {
        const { data: newMon, error: insErr } = await supabase
          .from('q_monitors')
          .insert([{ name, daily_target }])
          .select()
          .single();
        if (insErr) throw insErr;
        monitorId = newMon.id;
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
    // 1. Sempre consultar o banco em tempo real antes de validar para garantir que não pega dado desatualizado do navegador
    try {
      const { data: freshOp } = await supabase
        .from('q_operators')
        .select('id, name, locked_by_monitor_id, locked_by_monitor_name, locked_at')
        .eq('id', op.id)
        .maybeSingle();

      const currentOp = freshOp || op;
      const isLocked = Boolean(
        currentOp.locked_at && 
        (new Date() - new Date(currentOp.locked_at)) < 30 * 60 * 1000
      );
      const activeUserId = currentUser?.id || activeMonitorObj?.id;

      if (isLocked && currentOp.locked_by_monitor_id && currentOp.locked_by_monitor_id !== activeUserId) {
        alert(`Atenção: O operador ${op.name} está em atendimento/avaliação por ${currentOp.locked_by_monitor_name || 'outro usuário'} neste momento.\n\nPara evitar duplicidade, selecione outro operador.`);
        fetchData();
        return;
      }

      // Registrar trava no Supabase
      const lockedName = currentUser?.name || activeMonitorObj?.name || 'Monitora';
      await supabase.from('q_operators').update({
        locked_by_monitor_id: activeUserId,
        locked_by_monitor_name: lockedName,
        locked_at: new Date().toISOString()
      }).eq('id', op.id);

      // Atualizar no estado local
      setOperators(prev => prev.map(o => o.id === op.id ? {
        ...o,
        locked_by_monitor_id: activeUserId,
        locked_by_monitor_name: lockedName,
        locked_at: new Date().toISOString()
      } : o));

      setSelectedOperatorForMonitoring(op);
    } catch (err) {
      console.warn('Aviso ao registrar trava de concorrência:', err);
      setSelectedOperatorForMonitoring(op);
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
      } catch (e) {
        console.warn('Erro ao liberar trava do operador:', e);
      }
    }
  };

  // 9. Concorrência e Handlers de Auditoria Formativa (Sem Nota)
  const handleStartAudit = async (op) => {
    try {
      const { data: freshOp } = await supabase
        .from('q_operators')
        .select('id, name, locked_by_monitor_id, locked_by_monitor_name, locked_at')
        .eq('id', op.id)
        .maybeSingle();

      const currentOp = freshOp || op;
      const isLocked = Boolean(
        currentOp.locked_at && 
        (new Date() - new Date(currentOp.locked_at)) < 30 * 60 * 1000
      );
      const activeUserId = currentUser?.id || activeMonitorObj?.id;

      if (isLocked && currentOp.locked_by_monitor_id && currentOp.locked_by_monitor_id !== activeUserId) {
        alert(`Atenção: O operador ${op.name} já está em processo de avaliação/auditoria por ${currentOp.locked_by_monitor_name || 'outro usuário'}.\n\nPara evitar conflito, selecione outro operador.`);
        fetchData();
        return;
      }

      const lockedName = currentUser?.name || 'Avaliador';
      await supabase.from('q_operators').update({
        locked_by_monitor_id: activeUserId,
        locked_by_monitor_name: lockedName,
        locked_at: new Date().toISOString()
      }).eq('id', op.id);

      setOperators(prev => prev.map(o => o.id === op.id ? {
        ...o,
        locked_by_monitor_id: activeUserId,
        locked_by_monitor_name: lockedName,
        locked_at: new Date().toISOString()
      } : o));

      setSelectedOperatorForAudit(op);
      setSelectedAuditForView(null);
    } catch (err) {
      console.warn('Erro ao iniciar auditoria:', err);
      setSelectedOperatorForAudit(op);
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

  // Identificar operador logado (se for perfil operador)
  const loggedOperator = useMemo(() => {
    if (!isOperator) return null;
    return operators.find(o => o.id === currentUser?.operator_id) ||
           operators.find(o => o.name.toLowerCase() === currentUser?.name?.toLowerCase()) ||
           null;
  }, [isOperator, operators, currentUser]);

  // Filtrar operadores por supervisor se for supervisor logado
  const filteredOperators = useMemo(() => {
    if (!isSupervisor) return operators;
    return operators.filter(o => 
      (currentUser?.supervisor_id && o.supervisor_id === currentUser.supervisor_id) ||
      (currentUser?.name && o.supervisor_name?.toLowerCase().includes(currentUser.name.toLowerCase()))
    );
  }, [operators, currentUser, isSupervisor]);

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
                />
              )}

              {/* Dashboard */}
              {!isOperator && activeTab === 'dashboard' && (
                <Dashboard 
                  operators={filteredOperators} 
                  monitorings={filteredMonitorings} 
                  activeCycle={activeCycle}
                  darkMode={darkMode} 
                />
              )}

              {/* Fila Inteligente (com Trava de Concorrência) */}
              {!isOperator && activeTab === 'queue' && (
                <SmartQueue 
                  operators={queueOperators}
                  monitorings={filteredMonitorings}
                  activeCycle={activeCycle}
                  onStartMonitoring={handleStartMonitoring}
                  onOpenFeedback={(op) => setSelectedOperatorForFeedback(op)}
                  onForceUnlock={handleForceUnlockOperator}
                  currentMonitor={activeMonitorObj}
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
                  activeProfile={{ role: userRole }}
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
                  onViewAudit={(audit) => {
                    const op = operators.find(o => o.id === audit.operator_id) || audit.q_operators || { id: audit.operator_id, name: audit.operator_name };
                    setSelectedOperatorForAudit(op);
                    setSelectedAuditForView(audit);
                  }}
                  onRefresh={fetchData}
                  isLoading={isLoading}
                />
              )}

              {/* Monitoras & Supervisores */}
              {!isOperator && activeTab === 'monitors' && (
                <MonitorsSupervisors 
                  operators={filteredOperators}
                  monitorings={filteredMonitorings}
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

              {/* Configuração de Checklist */}
              {!isOperator && activeTab === 'config' && (
                <ConfigChecklist 
                  checklistItems={checklistItems}
                  onAddChecklistItem={handleAddChecklistItem}
                  onDeleteChecklistItem={handleDeleteChecklistItem}
                  isLoading={isLoading}
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
          onEditMonitoring={handleEditMonitoringClick}
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
