/**
 * Edge Function: inbox-chat
 *
 * Chat de triagem de um item do Inbox (vídeo capturado do WhatsApp) com o
 * Gemini. O modelo conversa em português sobre o vídeo (legenda + transcrição,
 * quando houver) e, quando a conversa chegar numa conclusão clara, chama a
 * function "create_task" — que esta function executa de fato, gravando em
 * lt_tasks e marcando o item do inbox como "promoted".
 *
 * SETUP:
 * 1. Gere uma API key gratuita em aistudio.google.com/apikey
 * 2. supabase secrets set GEMINI_API_KEY=<sua chave> --project-ref hjaqbyxjjpodiqinksbk
 * 3. Deploy: supabase functions deploy inbox-chat --project-ref hjaqbyxjjpodiqinksbk
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!
const GEMINI_MODEL = "gemini-2.5-flash"

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

const CREATE_TASK_TOOL = {
  name: "create_task",
  description: "Cria a tarefa real a partir da conclusão da conversa sobre este vídeo do inbox.",
  parameters: {
    type: "object",
    properties: {
      title: { type: "string", description: "Título curto e acionável da tarefa" },
      description: { type: "string", description: "Descrição/contexto da tarefa, incluindo o que foi decidido na conversa" },
      projectId: { type: "string", description: "ID do projeto onde a tarefa deve ser criada, escolhido dentre os projetos informados" },
    },
    required: ["title", "projectId"],
  },
}

interface ChatMessage { role: "user" | "model"; text: string }

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 })
  }

  try {
    const { itemId, projects } = await req.json() as {
      itemId: string
      projects: { id: string; name: string }[]
    }

    const { data: item, error: itemError } = await supabase
      .from("lt_inbox_items")
      .select("*")
      .eq("id", itemId)
      .single()

    if (itemError || !item) {
      return new Response(JSON.stringify({ error: "Item não encontrado" }), { status: 404 })
    }

    const chatHistory = (item.chat_history ?? []) as ChatMessage[]
    const projectList = projects.map(p => `- ${p.name} (id: ${p.id})`).join("\n")

    const systemInstruction = {
      parts: [{
        text: `Você é um assistente que ajuda o usuário a decidir se e como transformar um vídeo salvo do WhatsApp numa tarefa dentro do app de gestão de tarefas dele. Responda sempre em português, de forma direta e curta.

Vídeo em discussão:
- Plataforma: ${item.platform}
- Link: ${item.url}
- Legenda original: ${item.caption || "(sem legenda)"}
${item.transcript ? `- Transcrição: ${item.transcript}` : ""}

Projetos existentes do usuário:
${projectList || "(nenhum projeto cadastrado)"}

Converse com o usuário pra entender o que ele quer fazer com esse vídeo. Quando ficar claro o que deve virar tarefa e em qual projeto, chame a function create_task. Não chame a function antes de ter um título e um projeto claros — pergunte antes se estiver em dúvida.`,
      }],
    }

    const contents = [
      ...chatHistory.map(m => ({
        role: m.role,
        parts: [{ text: m.text }],
      })),
    ]

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction,
          contents,
          tools: [{ functionDeclarations: [CREATE_TASK_TOOL] }],
        }),
      }
    )

    if (!geminiRes.ok) {
      const errText = await geminiRes.text()
      console.error("Erro na API do Gemini:", errText)
      return new Response(JSON.stringify({ error: "Erro ao chamar o Gemini" }), { status: 502 })
    }

    const geminiData = await geminiRes.json()
    const parts = geminiData.candidates?.[0]?.content?.parts ?? []
    const functionCallPart = parts.find((p: { functionCall?: unknown }) => p.functionCall)
    const textPart = parts.find((p: { text?: string }) => p.text)

    if (functionCallPart) {
      const args = functionCallPart.functionCall.args as { title: string; description?: string; projectId: string }

      const { data: newTask, error: taskError } = await supabase.from("lt_tasks").insert({
        title: args.title,
        description: args.description ?? "",
        status: "todo",
        priority: "none",
        project_id: args.projectId,
        due_date: null,
        tags: [item.platform],
        recurring: null,
        position: 0,
        assignee: null,
        workspace: "cative",
      }).select().single()

      if (taskError || !newTask) {
        console.error("Erro ao criar tarefa:", taskError)
        return new Response(JSON.stringify({ error: "Erro ao criar tarefa" }), { status: 500 })
      }

      await supabase.from("lt_task_links").insert({
        task_id: newTask.id,
        label: `Vídeo (${item.platform})`,
        url: item.url,
      })

      const confirmationText = `Combinado! Criei a tarefa "${args.title}".`
      const updatedHistory = [
        ...chatHistory,
        { role: "model", text: confirmationText },
      ]

      await supabase.from("lt_inbox_items").update({
        chat_history: updatedHistory,
        status: "promoted",
      }).eq("id", itemId)

      return new Response(JSON.stringify({ taskCreated: true, message: confirmationText }), {
        headers: { "Content-Type": "application/json" },
      })
    }

    const modelText = textPart?.text ?? "Não consegui entender, pode reformular?"
    const updatedHistory = [...chatHistory, { role: "model", text: modelText }]

    await supabase.from("lt_inbox_items").update({
      chat_history: updatedHistory,
      status: "discussing",
    }).eq("id", itemId)

    return new Response(JSON.stringify({ taskCreated: false, message: modelText }), {
      headers: { "Content-Type": "application/json" },
    })
  } catch (err) {
    console.error("Erro:", err)
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500 })
  }
})
