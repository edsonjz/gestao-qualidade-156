# 156+POA Qualidade - Gestão Inteligente de Qualidade e Monitorias

Sistema completo para gestão de qualidade, monitoria de atendimentos, feedback e inteligência analítica para operações de atendimento 156.

---

## 🚀 Funcionalidades Principais

* **Dashboard em Tempo Real**: Indicadores de média geral, conformidade, NCGs, índice de feedback e meta do ciclo.
* **Fila Inteligente de Monitorias**: Distribuição equilibrada e priorização automática de atendentes.
* **Histórico e Ficha Completa do Operador**: Visualização detalhada de avaliações, checklists e evolução temporal.
* **Importação e Exportação de Colaboradores**:
  * Compatível com planilhas Excel (`.xlsx`, `.xls`, `.csv`).
  * Colunas essenciais: **Supervisor**, **Matrícula** e **Nome**.
  * Botão de download de planilha modelo e exportação com filtros.
* **Configuração Dinâmica de Checklist**: Criação e ajuste de pesos dos critérios de qualidade.
* **Inteligência Analítica**: Gráficos analíticos e comparativos de desempenho por supervisor e critérios.
* **Autenticação Segura via Supabase**: Controle de acesso integrado com proteção de dados.

---

## 🛠️ Tecnologias Utilizadas

* **Frontend**: React 19, Vite 8, Tailwind CSS v4
* **Gráficos e Visualizações**: Apache ECharts (`echarts-for-react`)
* **Ícones**: Lucide React
* **Planilhas**: SheetJS (`xlsx`)
* **Backend & Banco de Dados**: Supabase (PostgreSQL, Auth, RLS)

---

## ⚙️ Variáveis de Ambiente

Crie um arquivo `.env.local` na raiz com:

```env
VITE_SUPABASE_URL=https://[seu-projeto].supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

---

## 🗄️ Estrutura do Banco de Dados (Supabase)

Para inicializar ou atualizar a base de dados, execute o script no **SQL Editor** do seu projeto Supabase:

```sql
-- 1. Ciclos
CREATE TABLE IF NOT EXISTS public.q_cycles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cycle_number INT NOT NULL,
    status TEXT DEFAULT 'Ativo',
    started_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ,
    total_operators INT DEFAULT 0,
    completed_operators INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Supervisores
CREATE TABLE IF NOT EXISTS public.q_supervisors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Monitores
CREATE TABLE IF NOT EXISTS public.q_monitors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    daily_target INT DEFAULT 5,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Checklist
CREATE TABLE IF NOT EXISTS public.q_checklist_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    label TEXT NOT NULL,
    weight NUMERIC NOT NULL DEFAULT 1,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Operadores / Colaboradores
CREATE TABLE IF NOT EXISTS public.q_operators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    matricula TEXT,
    supervisor_id UUID REFERENCES public.q_supervisors(id) ON DELETE SET NULL,
    supervisor_name TEXT,
    schedule TEXT,
    allocation TEXT,
    skill TEXT,
    escala TEXT,
    active BOOLEAN DEFAULT true,
    status_feedback TEXT DEFAULT 'Pendente',
    last_monitoring_at TIMESTAMPTZ,
    last_feedback_at TIMESTAMPTZ,
    assigned_monitor_id UUID REFERENCES public.q_monitors(id) ON DELETE SET NULL,
    assigned_monitor_name TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Se a tabela já existir, adicione as colunas de matrícula e trava de concorrência:
ALTER TABLE public.q_operators 
ADD COLUMN IF NOT EXISTS matricula TEXT,
ADD COLUMN IF NOT EXISTS locked_by_monitor_id UUID REFERENCES public.q_monitors(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS locked_by_monitor_name TEXT,
ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ;

-- 6. Gestão de Usuários e Permissões (RBAC)
CREATE TABLE IF NOT EXISTS public.q_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'monitor', 'supervisor', 'operador')),
    operator_id UUID REFERENCES public.q_operators(id) ON DELETE SET NULL,
    supervisor_id UUID REFERENCES public.q_supervisors(id) ON DELETE SET NULL,
    monitor_id UUID REFERENCES public.q_monitors(id) ON DELETE SET NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.q_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso q_users" ON public.q_users FOR ALL USING (true) WITH CHECK (true);

-- 6. Monitorias
CREATE TABLE IF NOT EXISTS public.q_monitorings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operator_id UUID REFERENCES public.q_operators(id) ON DELETE CASCADE,
    monitor_id UUID REFERENCES public.q_monitors(id) ON DELETE SET NULL,
    cycle_id UUID REFERENCES public.q_cycles(id) ON DELETE SET NULL,
    score NUMERIC DEFAULT 0,
    monitoring_date TIMESTAMPTZ DEFAULT now(),
    call_date TIMESTAMPTZ,
    call_duration TEXT,
    status TEXT DEFAULT 'Pendente',
    feedback_date TIMESTAMPTZ,
    feedback_notes TEXT,
    checklist JSONB DEFAULT '[]'::jsonb,
    is_ncg BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Auditorias de Desenvolvimento (Formativas, Sem Nota)
CREATE TABLE IF NOT EXISTS public.q_audits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operator_id UUID NOT NULL REFERENCES public.q_operators(id) ON DELETE CASCADE,
    auditor_id UUID,
    auditor_name TEXT NOT NULL,
    auditor_role TEXT NOT NULL CHECK (auditor_role IN ('monitor', 'supervisor', 'admin')),
    audit_date TIMESTAMPTZ DEFAULT now(),
    call_date TIMESTAMPTZ,
    call_duration TEXT,
    call_protocol TEXT,
    topic TEXT DEFAULT 'Atendimento e Postura',
    strengths TEXT,
    improvements TEXT,
    action_plan TEXT,
    general_notes TEXT,
    status TEXT DEFAULT 'Realizada',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Temas Principais da Auditoria Formativa
CREATE TABLE IF NOT EXISTS public.q_audit_topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    color TEXT DEFAULT 'blue',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS & Políticas de Segurança
ALTER TABLE public.q_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.q_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.q_supervisors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.q_monitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.q_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.q_operators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.q_monitorings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.q_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.q_audit_topics ENABLE ROW LEVEL SECURITY;

-- Políticas Seguras: Apenas usuários autenticados têm acesso operacional
CREATE POLICY "Leitura q_users para autenticados" ON public.q_users 
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Gerenciamento q_users apenas admin" ON public.q_users 
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.q_users 
            WHERE email = auth.jwt()->>'email' AND role = 'admin'
        ) OR auth.jwt()->>'email' = 'edson_jz@hotmail.com'
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.q_users 
            WHERE email = auth.jwt()->>'email' AND role = 'admin'
        ) OR auth.jwt()->>'email' = 'edson_jz@hotmail.com'
    );

CREATE POLICY "Acesso q_cycles autenticados" ON public.q_cycles FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Acesso q_supervisors autenticados" ON public.q_supervisors FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Acesso q_monitors autenticados" ON public.q_monitors FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Acesso q_checklist_items autenticados" ON public.q_checklist_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Acesso q_operators autenticados" ON public.q_operators FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Acesso q_monitorings autenticados" ON public.q_monitorings FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Acesso q_audits autenticados" ON public.q_audits FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Acesso q_audit_topics autenticados" ON public.q_audit_topics FOR ALL TO authenticated USING (true) WITH CHECK (true);

INSERT INTO public.q_cycles (cycle_number, status, started_at) VALUES (1, 'Ativo', now()) ON CONFLICT DO NOTHING;

-- =========================================================================
-- 🔐 CORREÇÃO CRÍTICA DO ERRO "EMAIL NOT CONFIRMED" NO SUPABASE AUTH
-- =========================================================================
-- 1. Confirmar imediatamente todos os usuários existentes que estão bloqueados:
UPDATE auth.users 
SET email_confirmed_at = now() 
WHERE email_confirmed_at IS NULL;

-- 2. Trigger automático para auto-confirmar todos os novos logins criados:
CREATE OR REPLACE FUNCTION public.handle_new_user_autoconfirm()
RETURNS trigger AS $$
BEGIN
  NEW.email_confirmed_at = COALESCE(NEW.email_confirmed_at, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_autoconfirm ON auth.users;
CREATE TRIGGER on_auth_user_created_autoconfirm
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_autoconfirm();
```

---

## 🔒 Configurações de Segurança e Acesso no Painel do Supabase

### 1. Desativar Exigência de Confirmação por Link de E-mail
1. Acesse o [Supabase Dashboard](https://supabase.com/dashboard).
2. Vá em **Authentication** > **Providers** > **Email**.
3. Desmarque a opção **"Confirm email"**.
4. Clique em **Save**.
*Com isso, qualquer login criado pelo Administrador Master ou tela de gestão poderá acessar imediatamente com sua senha, sem depender de SMTP ou clicar em e-mails externos.*

### 2. Executar o Script de Confirmação e Gatilho
Vá em **SQL Editor** no painel do Supabase e execute o bloco de código acima. Ele:
* Desbloqueia os usuários que receberam o erro `Email not confirmed` (ex: `ana.remiao@...`, `ivete.santos@...`).
* Garante que qualquer cadastro futuro seja confirmado automaticamente.
* Protege as tabelas contra acessos anônimos não autorizados via RLS.


---

## 🚀 Deploy na Vercel

1. Importe o repositório `edsonjz/gestao-qualidade-156` na [Vercel](https://vercel.com).
2. Adicione as **Environment Variables**:
   * `VITE_SUPABASE_URL`
   * `VITE_SUPABASE_ANON_KEY`
3. O build command padrão (`npm run build`) e output directory (`dist`) funcionarão automaticamente.
