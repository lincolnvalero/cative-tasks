/**
 * Edge Function: admin-create-user
 *
 * Cria uma conta de login (Supabase Auth) + o profile correspondente.
 * Só quem já é admin pode chamar — cadastro de conta não é self-service,
 * é sempre feito por um administrador (Configurações → Usuários).
 *
 * Deploy: supabase functions deploy admin-create-user --project-ref bplpowejgqukfsqxfhoj
 * Secrets necessárias (mesmas de sempre): SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

function toInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const MEMBER_COLORS = [
  "#3b82f6", "#10b981", "#ec4899", "#f59e0b", "#8b5cf6",
  "#ef4444", "#14b8a6", "#f97316", "#84cc16", "#6366f1",
]

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? ""
    const callerClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user: caller } } = await callerClient.auth.getUser()
    if (!caller) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    const { data: callerProfile } = await adminClient
      .from("profiles").select("is_admin").eq("id", caller.id).single()
    if (!callerProfile?.is_admin) {
      return new Response(JSON.stringify({ error: "Só administradores podem criar contas" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    const { email, name, password, isAdmin } = await req.json() as {
      email: string; name: string; password: string; isAdmin?: boolean
    }
    if (!email?.trim() || !name?.trim() || !password || password.length < 6) {
      return new Response(JSON.stringify({ error: "Preencha e-mail, nome e uma senha com 6+ caracteres" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email: email.trim(),
      password,
      email_confirm: true,
    })
    if (createError || !created.user) {
      return new Response(JSON.stringify({ error: createError?.message ?? "Erro ao criar conta" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    const { data: profileRow, error: profileError } = await adminClient.from("profiles").insert({
      id: created.user.id,
      email: email.trim(),
      name: name.trim(),
      color: MEMBER_COLORS[Math.floor(Math.random() * MEMBER_COLORS.length)],
      initials: toInitials(name),
      is_admin: !!isAdmin,
    }).select().single()

    if (profileError || !profileRow) {
      await adminClient.auth.admin.deleteUser(created.user.id)
      return new Response(JSON.stringify({ error: "Erro ao criar perfil" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    return new Response(JSON.stringify({ profile: profileRow }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (err) {
    console.error("Erro:", err)
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } })
  }
})
