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

-- Se a tabela já existir, adicione a coluna matrícula:
ALTER TABLE public.q_operators ADD COLUMN IF NOT EXISTS matricula TEXT;

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

-- RLS & Políticas
ALTER TABLE public.q_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.q_supervisors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.q_monitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.q_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.q_operators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.q_monitorings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso q_cycles" ON public.q_cycles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso q_supervisors" ON public.q_supervisors FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso q_monitors" ON public.q_monitors FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso q_checklist_items" ON public.q_checklist_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso q_operators" ON public.q_operators FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso q_monitorings" ON public.q_monitorings FOR ALL USING (true) WITH CHECK (true);

INSERT INTO public.q_cycles (cycle_number, status, started_at) VALUES (1, 'Ativo', now()) ON CONFLICT DO NOTHING;
```

---

## 🚀 Deploy na Vercel

1. Importe o repositório `edsonjz/gestao-qualidade-156` na [Vercel](https://vercel.com).
2. Adicione as **Environment Variables**:
   * `VITE_SUPABASE_URL`
   * `VITE_SUPABASE_ANON_KEY`
3. O build command padrão (`npm run build`) e output directory (`dist`) funcionarão automaticamente.
