import React, { useState } from 'react';
import { 
  ShieldCheck, 
  UserPlus, 
  UserX, 
  Edit, 
  Trash2, 
  KeyRound, 
  Mail, 
  User, 
  UserCheck,
  CheckCircle2, 
  AlertCircle,
  Search,
  X,
  RefreshCw
} from 'lucide-react';
import { supabase, createEphemeralClient } from '../supabaseClient';

export default function UserManagement({ 
  users = [], 
  operators = [], 
  supervisors = [], 
  monitors = [], 
  onRefreshUsers 
}) {
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('todos');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'monitor',
    operator_id: '',
    supervisor_id: '',
    monitor_id: '',
    active: true
  });

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'monitor',
      operator_id: '',
      supervisor_id: '',
      monitor_id: '',
      active: true
    });
    setEditingUser(null);
    setError('');
    setSuccess('');
  };

  const handleOpenCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const handleOpenEdit = (user) => {
    setEditingUser(user);
    setFormData({
      name: user.name || '',
      email: user.email || '',
      password: '', // Senha em branco na edição
      role: user.role || 'monitor',
      operator_id: user.operator_id || '',
      supervisor_id: user.supervisor_id || '',
      monitor_id: user.monitor_id || '',
      active: user.active !== undefined ? user.active : true
    });
    setError('');
    setSuccess('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const emailClean = formData.email.trim().toLowerCase();
      const nameClean = formData.name.trim();

      if (editingUser) {
        // Atualizar usuário existente
        let updatedAuthUserId = editingUser.auth_user_id;

        // Se o usuário ainda não possuía login criado no Supabase Auth e uma senha foi informada
        if (!editingUser.auth_user_id && formData.password && formData.password.length >= 6) {
          const authClient = createEphemeralClient();
          const { data: authData, error: authErr } = await authClient.auth.signUp({
            email: emailClean,
            password: formData.password,
            options: {
              data: {
                name: nameClean,
                role: formData.role
              }
            }
          });
          if (authErr) throw authErr;
          updatedAuthUserId = authData?.user?.id || null;
        }

        const updatePayload = {
          name: nameClean,
          role: formData.role,
          auth_user_id: updatedAuthUserId,
          operator_id: formData.role === 'operador' ? formData.operator_id || null : null,
          supervisor_id: formData.role === 'supervisor' ? formData.supervisor_id || null : null,
          monitor_id: formData.role === 'monitor' ? formData.monitor_id || null : null,
          active: formData.active
        };

        const { error: updErr } = await supabase
          .from('q_users')
          .update(updatePayload)
          .eq('id', editingUser.id);

        if (updErr) throw updErr;

        setSuccess('Usuário atualizado com sucesso!');
        setTimeout(() => {
          setShowModal(false);
          onRefreshUsers();
        }, 800);

      } else {
        // Criar novo usuário
        if (!formData.password || formData.password.length < 6) {
          throw new Error('A senha deve ter pelo menos 6 caracteres.');
        }

        // 1. Criar no Supabase Auth usando cliente efêmero para não desconectar o administrador
        const authClient = createEphemeralClient();
        const { data: authData, error: authErr } = await authClient.auth.signUp({
          email: emailClean,
          password: formData.password,
          options: {
            data: {
              name: nameClean,
              role: formData.role
            }
          }
        });

        if (authErr) throw authErr;

        // 2. Inserir na tabela q_users
        const newRecord = {
          auth_user_id: authData?.user?.id || null,
          email: emailClean,
          name: nameClean,
          role: formData.role,
          operator_id: formData.role === 'operador' ? formData.operator_id || null : null,
          supervisor_id: formData.role === 'supervisor' ? formData.supervisor_id || null : null,
          monitor_id: formData.role === 'monitor' ? formData.monitor_id || null : null,
          active: formData.active
        };

        const { error: insErr } = await supabase
          .from('q_users')
          .insert([newRecord]);

        if (insErr) {
          throw insErr;
        }

        setSuccess('Usuário cadastrado com sucesso!');
        setTimeout(() => {
          setShowModal(false);
          onRefreshUsers();
        }, 800);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Erro ao salvar usuário.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, email) => {
    if (email === 'edson_jz@hotmail.com') {
      alert('O Administrador Master não pode ser excluído.');
      return;
    }
    if (!confirm(`Deseja realmente remover o acesso de ${email}?`)) return;

    try {
      const { error: delErr } = await supabase
        .from('q_users')
        .delete()
        .eq('id', id);

      if (delErr) throw delErr;
      onRefreshUsers();
    } catch (err) {
      console.error(err);
      alert('Erro ao excluir usuário: ' + (err.message || err));
    }
  };

  // Filtragem
  const filteredUsers = users.filter(u => {
    const searchLower = search.toLowerCase();
    const matchesSearch = 
      (u.name && u.name.toLowerCase().includes(searchLower)) ||
      (u.email && u.email.toLowerCase().includes(searchLower));
    const matchesRole = filterRole === 'todos' || u.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin':
        return <span className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 text-xs px-2.5 py-0.5 rounded-full font-bold">Administrador</span>;
      case 'monitor':
        return <span className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 text-xs px-2.5 py-0.5 rounded-full font-bold">Monitor(a)</span>;
      case 'supervisor':
        return <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 text-xs px-2.5 py-0.5 rounded-full font-bold">Supervisor(a)</span>;
      case 'operador':
        return <span className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 text-xs px-2.5 py-0.5 rounded-full font-bold">Operador</span>;
      default:
        return <span className="bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300 text-xs px-2.5 py-0.5 rounded-full font-medium">{role}</span>;
    }
  };

  const getLinkedEntityName = (u) => {
    if (u.role === 'operador' && u.operator_id) {
      const op = operators.find(o => o.id === u.operator_id);
      return op ? `Op: ${op.name} (${op.matricula || 'S/ Matrícula'})` : 'Operador não encontrado';
    }
    if (u.role === 'supervisor' && u.supervisor_id) {
      const sup = supervisors.find(s => s.id === u.supervisor_id);
      return sup ? `Sup: ${sup.name}` : 'Supervisor não encontrado';
    }
    if (u.role === 'monitor' && u.monitor_id) {
      const mon = monitors.find(m => m.id === u.monitor_id);
      return mon ? `Mon: ${mon.name}` : 'Monitor não encontrado';
    }
    return <span className="text-zinc-400 italic">Geral / Sem vínculo</span>;
  };

  const [syncingOperators, setSyncingOperators] = useState(false);
  const [syncProgress, setSyncProgress] = useState(null);

  const handleSyncOperators = async () => {
    const validOperators = operators.filter(o => o.active && o.matricula && String(o.matricula).trim() !== '');
    if (validOperators.length === 0) {
      alert('Nenhum operador ativo com matrícula cadastrada foi encontrado para sincronizar.');
      return;
    }

    if (!confirm(`Deseja criar/sincronizar o login de ${validOperators.length} operadores ativos com a senha padrão "123456"?\n\nEles poderão entrar digitando apenas a matrícula e essa senha.`)) {
      return;
    }

    setSyncingOperators(true);
    setSyncProgress({ current: 0, total: validOperators.length, currentName: '' });

    let countSuccess = 0;
    const authClient = createEphemeralClient();

    for (let i = 0; i < validOperators.length; i++) {
      const op = validOperators[i];
      const matClean = String(op.matricula).trim().toLowerCase();
      const opEmail = `op_${matClean}@156poa.com.br`;

      setSyncProgress({ current: i + 1, total: validOperators.length, currentName: op.name });

      try {
        const existing = users.find(u => u.email === opEmail || u.operator_id === op.id);
        let authId = existing?.auth_user_id || null;

        if (!authId) {
          const { data: authData, error: authErr } = await authClient.auth.signUp({
            email: opEmail,
            password: '123456',
            options: {
              data: {
                name: op.name,
                role: 'operador',
                matricula: op.matricula
              }
            }
          });

          if (!authErr && authData?.user?.id) {
            authId = authData.user.id;
          }
        }

        const userPayload = {
          auth_user_id: authId,
          email: opEmail,
          name: op.name,
          role: 'operador',
          operator_id: op.id,
          active: true
        };

        if (existing?.id) {
          await supabase.from('q_users').update(userPayload).eq('id', existing.id);
        } else {
          await supabase.from('q_users').insert([userPayload]);
        }

        countSuccess++;
      } catch (err) {
        console.warn(`Aviso na sincronização de ${op.name}:`, err);
      }
    }

    setSyncingOperators(false);
    setSyncProgress(null);
    alert(`Sincronização concluída com sucesso! ${countSuccess} operadores configurados para login via Matrícula com a senha padrão "123456".`);
    onRefreshUsers();
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header Card */}
      <div className="bg-white dark:bg-[#0c0c0f] p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Gestão de Acessos & Permissões (RBAC)
            </h3>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Controle exclusivo do Administrador Master para criar, vincular e determinar as permissões de cada perfil.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleSyncOperators}
            disabled={syncingOperators}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2.5 px-3.5 rounded-lg transition-colors shadow-sm cursor-pointer disabled:opacity-50"
            title="Criar logins no Supabase Auth para todos os operadores com matrícula"
          >
            <UserCheck className="w-4 h-4" />
            {syncingOperators ? 'Sincronizando...' : 'Gerar Logins Operadores (123456)'}
          </button>
          <button
            onClick={onRefreshUsers}
            className="p-2 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-lg transition-colors text-xs font-semibold flex items-center gap-1.5 shadow-sm cursor-pointer"
            title="Recarregar Usuários"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Atualizar
          </button>
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2.5 px-4 rounded-lg transition-colors shadow-sm cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            Criar Novo Usuário
          </button>
        </div>
      </div>

      {/* Barra de Progresso de Sincronização em Lote */}
      {syncProgress && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-xl space-y-2 animate-pulse">
          <div className="flex justify-between text-xs font-bold text-emerald-900 dark:text-emerald-300">
            <span>Criando logins dos operadores no Supabase Auth (Senha 123456)...</span>
            <span>{syncProgress.current} / {syncProgress.total}</span>
          </div>
          <div className="w-full bg-emerald-200 dark:bg-emerald-900 rounded-full h-2 overflow-hidden">
            <div 
              className="bg-emerald-600 h-2 transition-all duration-200"
              style={{ width: `${(syncProgress.current / syncProgress.total) * 100}%` }}
            />
          </div>
          <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
            Processando operador: <strong>{syncProgress.currentName}</strong>
          </p>
        </div>
      )}

      {/* Info Card sobre Confirmação de E-mail no Supabase */}
      <div className="p-4 bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/40 rounded-xl flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-900 dark:text-amber-200 space-y-1">
          <p className="font-bold">
            Atenção sobre o Acesso dos Novos Usuários (Supabase Auth)
          </p>
          <p className="text-amber-800/90 dark:text-amber-300/90 leading-relaxed">
            Se algum usuário receber o aviso <strong>"Email not confirmed"</strong> na tela de login, o Supabase está aguardando confirmação por link de e-mail. Para que todos os logins criados acessem imediatamente com a senha, certifique-se de <strong>desativar a opção "Confirm email"</strong> no painel do Supabase em <em>Authentication &gt; Providers &gt; Email</em> ou confirme os e-mails pendentes no <em>SQL Editor</em>.
          </p>
        </div>
      </div>

      {/* Filtros e Busca */}
      <div className="bg-white dark:bg-[#0c0c0f] p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="sm:col-span-2 relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Buscar usuário por nome ou e-mail..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-zinc-950 dark:text-zinc-100"
          />
        </div>

        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="bg-white dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs shadow-sm text-zinc-800 dark:text-zinc-200 outline-none"
        >
          <option value="todos">Todos os Cargos</option>
          <option value="admin">Administrador</option>
          <option value="monitor">Monitor(a)</option>
          <option value="supervisor">Supervisor(a)</option>
          <option value="operador">Operador</option>
        </select>
      </div>

      {/* Tabela de Usuários */}
      <div className="bg-white dark:bg-[#0c0c0f] rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-900/40 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-800">
                <th className="px-6 py-3.5">Nome</th>
                <th className="px-6 py-3.5">E-mail</th>
                <th className="px-6 py-3.5">Cargo / Papel</th>
                <th className="px-6 py-3.5">Vínculo Direto</th>
                <th className="px-6 py-3.5 text-center">Auth / Login</th>
                <th className="px-6 py-3.5 text-center">Status</th>
                <th className="px-6 py-3.5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-sm text-zinc-800 dark:text-zinc-200">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-10 text-zinc-500 text-xs">
                    Nenhum usuário cadastrado ou encontrado para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredUsers.map(u => (
                  <tr key={u.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/30 transition-colors">
                    <td className="px-6 py-3.5 font-bold text-xs flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-zinc-400" />
                      {u.name}
                      {u.email === 'edson_jz@hotmail.com' && (
                        <span className="text-[10px] bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 px-1.5 py-0.2 rounded font-semibold">Master</span>
                      )}
                    </td>
                    <td className="px-6 py-3.5 text-xs text-zinc-600 dark:text-zinc-400 font-mono">
                      {u.email}
                    </td>
                    <td className="px-6 py-3.5">
                      {getRoleBadge(u.role)}
                    </td>
                    <td className="px-6 py-3.5 text-xs">
                      {getLinkedEntityName(u)}
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      {u.email === 'edson_jz@hotmail.com' || u.auth_user_id ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" /> Vinculado
                        </span>
                      ) : (
                        <button
                          onClick={() => handleOpenEdit(u)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 px-2 py-0.5 rounded-full hover:bg-amber-100 transition-colors"
                          title="Clique para definir a senha e criar o login no Supabase Auth"
                        >
                          <AlertCircle className="w-3 h-3" /> Criar Login
                        </button>
                      )}
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                        u.active 
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400' 
                          : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                      }`}>
                        {u.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-right space-x-2">
                      <button
                        onClick={() => handleOpenEdit(u)}
                        className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded text-zinc-600 dark:text-zinc-300 transition-colors"
                        title="Editar Permissões"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      {u.email !== 'edson_jz@hotmail.com' && (
                        <button
                          onClick={() => handleDelete(u.id, u.email)}
                          className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded text-rose-500 hover:text-rose-700 transition-colors"
                          title="Remover Acesso"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Criação / Edição de Usuário */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#0c0c0f] w-full max-w-md rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-900/10">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-500" />
                {editingUser ? 'Editar Acesso de Usuário' : 'Cadastrar Novo Acesso'}
              </h3>
              <button 
                onClick={() => setShowModal(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
              {error && (
                <div className="p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              {success && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 rounded-lg flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{success}</span>
                </div>
              )}

              {/* Nome Completo */}
              <div className="space-y-1.5">
                <label className="font-semibold text-zinc-500 dark:text-zinc-400">Nome Completo</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Ana Silva"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-white dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-zinc-950 dark:text-zinc-100"
                />
              </div>

              {/* E-mail */}
              <div className="space-y-1.5">
                <label className="font-semibold text-zinc-500 dark:text-zinc-400">E-mail de Login</label>
                <input
                  type="email"
                  required
                  disabled={!!editingUser}
                  placeholder="usuario@qualidade156.com.br"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-white dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-zinc-950 dark:text-zinc-100 disabled:opacity-60"
                />
              </div>

              {/* Senha: se for cadastro novo OU se for edição de usuário que ainda não possui login no Auth */}
              {(!editingUser || !editingUser.auth_user_id) ? (
                <div className="space-y-1.5 bg-blue-50/40 dark:bg-blue-950/20 p-3 rounded-lg border border-blue-200 dark:border-blue-900/30">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-blue-900 dark:text-blue-300">
                      {editingUser ? 'Criar Senha de Acesso Inicial (Supabase Auth)' : 'Senha Inicial (mínimo 6 dígitos)'}
                    </label>
                    {editingUser && (
                      <span className="text-[10px] bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 px-1.5 py-0.5 rounded font-bold">
                        Login Pendente
                      </span>
                    )}
                  </div>
                  {editingUser && (
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      Este usuário ainda não possui conta de autenticação criada. Digite uma senha para registrar o login dele agora.
                    </p>
                  )}
                  <input
                    type="password"
                    required={!editingUser}
                    minLength={6}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full bg-white dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-zinc-950 dark:text-zinc-100"
                  />
                </div>
              ) : (
                <div className="p-3 bg-zinc-50 dark:bg-zinc-900/40 rounded-lg border border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-600 dark:text-zinc-400 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    Conta vinculada ao Supabase Auth
                  </span>
                  <span className="font-mono text-[10px] text-zinc-400">
                    ID: {editingUser.auth_user_id ? `${editingUser.auth_user_id.slice(0, 8)}...` : 'Ativo'}
                  </span>
                </div>
              )}

              {/* Cargo / Tipo de Permissão */}
              <div className="space-y-1.5">
                <label className="font-semibold text-zinc-500 dark:text-zinc-400">Tipo de Permissão (Cargo)</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full bg-white dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs shadow-sm text-zinc-850 dark:text-zinc-200 outline-none cursor-pointer"
                >
                  <option value="monitor">Monitor(a) de Qualidade (Realiza avaliações)</option>
                  <option value="supervisor">Supervisor(a) (Acompanha equipe e aplica feedbacks)</option>
                  <option value="operador">Operador (Acesso restrito apenas às suas monitorias)</option>
                  <option value="admin">Administrador (Acesso total + Gestão de Acessos)</option>
                </select>
              </div>

              {/* Vínculo condicional se for Operador */}
              {formData.role === 'operador' && (
                <div className="space-y-1.5 bg-amber-50/50 dark:bg-amber-950/20 p-3 rounded-lg border border-amber-200 dark:border-amber-900/30">
                  <label className="font-bold text-amber-900 dark:text-amber-300">Vincular ao Operador da Base</label>
                  <p className="text-[11px] text-amber-700 dark:text-amber-400">
                    O usuário verá apenas as monitorias e feedbacks deste atendente:
                  </p>
                  <select
                    value={formData.operator_id}
                    onChange={(e) => setFormData({ ...formData, operator_id: e.target.value })}
                    required
                    className="w-full bg-white dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs shadow-sm text-zinc-850 dark:text-zinc-200 outline-none"
                  >
                    <option value="">Selecione o Operador...</option>
                    {operators.map(o => (
                      <option key={o.id} value={o.id}>
                        {o.name} {o.matricula ? `(Matrícula: ${o.matricula})` : ''} - {o.supervisor_name || 'Sem Sup'}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Vínculo condicional se for Supervisor */}
              {formData.role === 'supervisor' && (
                <div className="space-y-1.5 bg-emerald-50/50 dark:bg-emerald-950/20 p-3 rounded-lg border border-emerald-200 dark:border-emerald-900/30">
                  <label className="font-bold text-emerald-900 dark:text-emerald-300">Vincular ao Supervisor</label>
                  <select
                    value={formData.supervisor_id}
                    onChange={(e) => setFormData({ ...formData, supervisor_id: e.target.value })}
                    className="w-full bg-white dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs shadow-sm text-zinc-850 dark:text-zinc-200 outline-none"
                  >
                    <option value="">Selecione o Supervisor correspondente...</option>
                    {supervisors.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Vínculo condicional se for Monitor */}
              {formData.role === 'monitor' && (
                <div className="space-y-1.5 bg-blue-50/50 dark:bg-blue-950/20 p-3 rounded-lg border border-blue-200 dark:border-blue-900/30">
                  <label className="font-bold text-blue-900 dark:text-blue-300">Vincular à Monitora</label>
                  <select
                    value={formData.monitor_id}
                    onChange={(e) => setFormData({ ...formData, monitor_id: e.target.value })}
                    className="w-full bg-white dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs shadow-sm text-zinc-850 dark:text-zinc-200 outline-none"
                  >
                    <option value="">Selecione a Monitora correspondente...</option>
                    {monitors.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Status Ativo / Inativo */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="userActiveCheck"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="w-4 h-4 accent-blue-600 cursor-pointer"
                />
                <label htmlFor="userActiveCheck" className="font-semibold text-zinc-600 dark:text-zinc-400 cursor-pointer">
                  Acesso Ativo no Sistema
                </label>
              </div>

              {/* Ações */}
              <div className="flex justify-end gap-2 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={loading}
                  className="px-4 py-2 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors shadow-sm flex items-center gap-1.5"
                >
                  {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                  {editingUser ? 'Salvar Alterações' : 'Criar Acesso'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
