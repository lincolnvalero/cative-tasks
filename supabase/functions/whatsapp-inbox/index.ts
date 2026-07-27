/**
 * Edge Function: whatsapp-inbox
 *
 * Recebe webhooks da Evolution API e captura links de vídeo (Instagram/TikTok/
 * YouTube) enviados numa conversa específica do WhatsApp, junto com a legenda
 * que acompanhar o link, gravando tudo em lt_inbox_items pra revisão no app.
 *
 * SETUP:
 * 1. Evolution API já rodando e conectada ao seu WhatsApp (ver whatsapp-note/index.ts
 *    para o guia de deploy — é a mesma instância, pode reaproveitar).
 *
 * 2. Descubra o JID da conversa que você quer monitorar: mande uma mensagem de
 *    teste nela e olhe o campo `key.remoteJid` no payload recebido (fica nos logs
 *    da function). Formatos comuns: "5511999999999@s.whatsapp.net" (conversa
 *    individual/"Mensagens para você mesmo") ou "xxxxx@g.us" (grupo).
 *
 * 3. No painel da Evolution API, adicione a URL desta função como webhook
 *    (evento MESSAGES_UPSERT) — pode coexistir com o webhook de whatsapp-note.
 *
 * 4. Deploy: supabase functions deploy whatsapp-inbox --project-ref hjaqbyxjjpodiqinksbk
 *
 * 5. Variáveis de ambiente (supabase secrets set):
 *    SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (mesmas de whatsapp-note)
 *    WHATSAPP_INBOX_JID=<jid da conversa a monitorar>
 *    WEBHOOK_SECRET=<mesma string secreta, se estiver usando>
 *
 * USO NO WHATSAPP: mande o link do vídeo com uma legenda curta, em qualquer
 * ordem, na conversa configurada:
 *   "IA generativa pra criar UI direto do Figma https://youtu.be/abc123"
 *   "https://www.instagram.com/reel/xyz789 golpe de guarda pro Reneg treinar"
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const INBOX_JID = Deno.env.get("WHATSAPP_INBOX_JID")
const WEBHOOK_SECRET = Deno.env.get("WEBHOOK_SECRET")

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

const VIDEO_URL_RE = /(https?:\/\/[^\s]*(?:instagram\.com|tiktok\.com|youtube\.com|youtu\.be)[^\s]*)/i

function detectPlatform(url: string): "instagram" | "tiktok" | "youtube" | null {
  if (/instagram\.com/i.test(url)) return "instagram"
  if (/tiktok\.com/i.test(url)) return "tiktok"
  if (/youtube\.com|youtu\.be/i.test(url)) return "youtube"
  return null
}

async function suggestProjectId(caption: string): Promise<string | null> {
  const { data: projects } = await supabase.from("lt_projects").select("id, name")
  if (!projects) return null
  const lower = caption.toLowerCase()
  const match = projects.find(p => lower.includes((p.name as string).toLowerCase()))
  return match ? (match.id as string) : null
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 })
  }

  if (WEBHOOK_SECRET) {
    const secret = req.headers.get("x-webhook-secret") || req.headers.get("apikey")
    if (secret !== WEBHOOK_SECRET) {
      return new Response("Unauthorized", { status: 401 })
    }
  }

  try {
    const body = await req.json()
    const event = body.event || body.type
    const data = body.data || body

    if (event !== "MESSAGES_UPSERT" && event !== "messages.upsert") {
      return new Response("Ignored", { status: 200 })
    }

    const messages = Array.isArray(data) ? data : [data]

    for (const message of messages) {
      const msg = message.message || message
      const fromMe = msg.key?.fromMe || message.fromMe
      if (fromMe) continue

      const remoteJid = msg.key?.remoteJid || message.from || ""
      console.log("Mensagem recebida de:", remoteJid)

      if (INBOX_JID && remoteJid !== INBOX_JID) continue

      const text = msg.message?.conversation ||
                   msg.message?.extendedTextMessage?.text ||
                   message.body ||
                   ""

      const urlMatch = text.match(VIDEO_URL_RE)
      if (!urlMatch) continue

      const url = urlMatch[1]
      const platform = detectPlatform(url)
      if (!platform) continue

      const caption = text.replace(url, "").trim()
      const suggestedProjectId = await suggestProjectId(caption)

      const { error } = await supabase.from("lt_inbox_items").insert({
        platform,
        url,
        caption,
        suggested_project_id: suggestedProjectId,
        status: "pending",
      })

      if (error) {
        console.error("Erro ao inserir item no inbox:", error)
        return new Response("Database error", { status: 500 })
      }

      console.log(`Item de inbox criado: ${platform} | ${url}`)
    }

    return new Response("OK", { status: 200 })
  } catch (err) {
    console.error("Erro:", err)
    return new Response("Internal error", { status: 500 })
  }
})
