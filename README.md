# Tasks System

Aplicação construída com React, TypeScript, Vite e shadcn/ui — gestão de tarefas e projetos compartilhados entre uma equipe, com notas e acompanhamento das aulas de canto. Anteriormente chamado de Lincoln-tasks / Lincoln General System.

## Stack

- React + TypeScript + Vite + shadcn/ui (frontend)
- Supabase (Postgres + Auth + Edge Functions + Realtime) — login real por e-mail/senha, RLS habilitada por projeto
- Deploy: Netlify ([lincoln-tasks.netlify.app](https://lincoln-tasks.netlify.app))

## Autenticação e acesso

Login real via Supabase Auth (e-mail + senha). **Não existe auto-cadastro** — contas são criadas só por um admin, pela tela **Usuários** dentro do app.

- `profiles` — uma linha por conta (id = auth.users.id), com `is_admin`
- `lt_project_members` — quem tem acesso a qual projeto (`lt_projects.id` × `profiles.id`)
- Qualquer usuário logado pode criar um projeto (vira dono/`created_by`) e convidar outros pelo botão "Convidar" no card do projeto
- Admin gerencia acesso de todo mundo a todo projeto pela tela **Configurações**
- Senha nunca é visível — só resetável (tela Usuários → "Resetar senha")
- `lt_notes`, `lt_vocal_*` e `lt_inbox_items` continuam abertas pra qualquer conta logada (não são por projeto)

Migration completa: `lincoln-general-system-schema.sql` (schema base) + a migration de auth entregue ao usuário via chat (cria `profiles`, `lt_project_members`, funções `is_admin()`/`has_project_access()` e as policies de RLS).

Duas Edge Functions rodam com a service-role key (não podem ser chamadas do navegador com a chave anônima):
- `admin-create-user` — cria conta (Auth + profile)
- `admin-reset-password` — redefine senha de uma conta existente

Ambas exigem que quem chama já seja admin (checado dentro da function). Deploy: `supabase functions deploy <nome> --project-ref bplpowejgqukfsqxfhoj` (ou colando o código em Edge Functions → Code no Dashboard, se o CLI não tiver acesso à conta certa).

## Banco de dados (Supabase)

**Projeto atual:** `bplpowejgqukfsqxfhoj` — https://bplpowejgqukfsqxfhoj.supabase.co

As credenciais ficam em `.env.local` (não versionado):

```
VITE_SUPABASE_URL=https://bplpowejgqukfsqxfhoj.supabase.co
VITE_SUPABASE_ANON_KEY=<publishable key do projeto>
```

Tabelas esperadas pelo código, por área:
- **Núcleo:** `lt_projects`, `lt_tasks`, `lt_task_comments`, `lt_task_checklist`, `lt_task_activity`, `lt_task_links`
- **Acesso:** `profiles`, `lt_project_members`
- **Notas:** `lt_notes`
- **Canto:** `lt_vocal_videos`, `lt_vocal_references`, `lt_vocal_class_notes`, `lt_vocal_skills`, `lt_vocal_profile`
- **Inbox (WhatsApp):** `lt_inbox_items`

`lt_members` (colaboradores fake, versão antiga) ficou desativada — não é mais lida pelo app, mantida só por histórico.

`lt_tasks` e `lt_inbox_items` precisam estar na publication `supabase_realtime` (os stores escutam mudanças ao vivo via `postgres_changes`).

## Estado atual / trabalho em andamento

Ver `HANDOFF.md` para o estado exato de onde o trabalho parou, incluindo um bug não resolvido na criação de usuários.

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
