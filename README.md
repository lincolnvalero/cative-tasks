# Lincoln General System

Aplicação pessoal construída com React, TypeScript, Vite e shadcn/ui — gestão de tarefas, projetos, notas e acompanhamento das aulas de canto. Anteriormente chamado de Lincoln-tasks.

## Stack

- React + TypeScript + Vite + shadcn/ui (frontend)
- Supabase (Postgres + Edge Functions + Realtime) — sem autenticação, app de uso pessoal, RLS desabilitada em todas as tabelas
- Deploy: Netlify ([lincoln-tasks.netlify.app](https://lincoln-tasks.netlify.app))

## Banco de dados (Supabase)

**Projeto atual:** `bplpowejgqukfsqxfhoj` — https://bplpowejgqukfsqxfhoj.supabase.co

As credenciais ficam em `.env.local` (não versionado):

```
VITE_SUPABASE_URL=https://bplpowejgqukfsqxfhoj.supabase.co
VITE_SUPABASE_ANON_KEY=<publishable key do projeto>
```

> ⚠️ **Pendência conhecida (13/08):** este projeto já tem 8 tabelas provisionadas, mas com o prefixo antigo `ct_` (`ct_tasks`, `ct_projects`, `ct_task_comments`, `ct_task_checklist`, `ct_task_activity`, `ct_task_links`, `ct_saved_views`, `ct_notes`), todas vazias. O código atual espera o prefixo `lt_`. Além disso faltam as tabelas de Colaboradores, Canto (`lt_vocal_*`) e Inbox (`lt_inbox_items`). Nada funciona nesta base até isso ser resolvido — renomear as 8 tabelas existentes e criar as que faltam, via SQL Editor do Supabase (a chave publishable não executa DDL).

**Projeto anterior:** `hjaqbyxjjpodiqinksbk` — ficou inacessível (fora do ar / possivelmente pausado) e foi substituído por este.

## Adding components

To add components to your app, run the following command:

```bash
npx shadcn@latest add button
```

This will place the ui components in the `src/components` directory.

## Using components

To use the components in your app, import them as follows:

```tsx
import { Button } from "@/components/ui/button"
```
