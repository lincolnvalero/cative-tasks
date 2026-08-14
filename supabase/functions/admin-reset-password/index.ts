/**
 * Edge Function: admin-reset-password
 *
 * Define uma senha nova pra uma conta existente. Só admin pode chamar.
 * Não existe "ver a senha" — nenhuma senha fica em texto puro em lugar
 * nenhum, isso é assim em qualquer sistema de login de verdade.
 *
 * Deploy: supabase functions deploy admin-reset-password --project-ref bplpowejgqukfsqxfhoj
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

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
      return new Response(JSON.stringify({ error: "Só administradores podem resetar senha" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    const { userId, newPassword } = await req.json() as { userId: string; newPassword: string }
    if (!userId || !newPassword || newPassword.length < 6) {
      return new Response(JSON.stringify({ error: "Senha precisa ter 6+ caracteres" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    const { error } = await adminClient.auth.admin.updateUserById(userId, { password: newPassword })
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (err) {
    console.error("Erro:", err)
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } })
  }
})
