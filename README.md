# Tasks System

Aplicação pessoal construída com React, TypeScript, Vite e shadcn/ui — gestão de tarefas, projetos, notas e acompanhamento das aulas de canto. Anteriormente chamado de Lincoln-tasks / Lincoln General System.

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

O schema completo (15 tabelas `lt_*`: núcleo de tarefas/projetos, notas, colaboradores, canto e inbox) precisa ser aplicado via SQL Editor do Supabase — a chave publishable não executa DDL (`CREATE TABLE`/`DROP TABLE`), só leitura/escrita normal. Script de referência: `lincoln-general-system-schema.sql` (gerado em 13/08, entregue ao usuário — recria tudo do zero e remove as tabelas antigas `ct_*` que tinham ficado desse projeto).

Tabelas esperadas pelo código, por área:
- **Núcleo:** `lt_projects`, `lt_tasks`, `lt_task_comments`, `lt_task_checklist`, `lt_task_activity`, `lt_task_links`, `lt_saved_views`
- **Notas:** `lt_notes`
- **Colaboradores:** `lt_members`
- **Canto:** `lt_vocal_videos`, `lt_vocal_references`, `lt_vocal_class_notes`, `lt_vocal_skills`, `lt_vocal_profile`
- **Inbox (WhatsApp):** `lt_inbox_items`

RLS desabilitada em todas. `lt_tasks` e `lt_inbox_items` precisam estar na publication `supabase_realtime` (os stores escutam mudanças ao vivo via `postgres_changes`).

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
