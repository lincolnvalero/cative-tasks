import { useState, useEffect } from "react"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
import type { InboxItem, InboxPlatform, InboxStatus, InboxChatMessage } from "@/types/inbox"

function mapItem(row: Record<string, unknown>): InboxItem {
  return {
    id: row.id as string,
    platform: row.platform as InboxPlatform,
    url: row.url as string,
    caption: (row.caption as string) ?? "",
    transcript: (row.transcript as string) ?? null,
    suggestedProjectId: (row.suggested_project_id as string) ?? null,
    status: row.status as InboxStatus,
    chatHistory: (row.chat_history as InboxChatMessage[]) ?? [],
    createdAt: row.created_at as string,
  }
}

export function useInboxStore() {
  const [items, setItems] = useState<InboxItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const { data } = await supabase.from("lt_inbox_items").select("*").order("created_at", { ascending: false })
        setItems((data ?? []).map(mapItem))

        const sub = supabase
          .channel("lt_inbox_items_changes")
          .on("postgres_changes", { event: "*", schema: "public", table: "lt_inbox_items" }, payload => {
            if (payload.eventType === "INSERT") {
              setItems(prev => [mapItem(payload.new), ...prev])
            } else if (payload.eventType === "UPDATE") {
              setItems(prev => prev.map(i => i.id === payload.new.id ? mapItem(payload.new) : i))
            } else if (payload.eventType === "DELETE") {
              setItems(prev => prev.filter(i => i.id !== payload.old.id))
            }
          })
          .subscribe()

        return () => { sub.unsubscribe() }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function updateItem(id: string, patch: Partial<Pick<InboxItem, "status" | "transcript" | "suggestedProjectId" | "chatHistory">>) {
    const dbPatch: Record<string, unknown> = {}
    if (patch.status !== undefined) dbPatch.status = patch.status
    if (patch.transcript !== undefined) dbPatch.transcript = patch.transcript
    if (patch.suggestedProjectId !== undefined) dbPatch.suggested_project_id = patch.suggestedProjectId
    if (patch.chatHistory !== undefined) dbPatch.chat_history = patch.chatHistory
    const { error } = await supabase.from("lt_inbox_items").update(dbPatch).eq("id", id)
    if (error) { toast.error("Erro ao atualizar item do inbox"); return }
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...patch } : i))
  }

  async function appendChatMessage(id: string, message: InboxChatMessage) {
    const item = items.find(i => i.id === id)
    if (!item) return
    const chatHistory = [...item.chatHistory, message]
    await updateItem(id, { chatHistory, status: "discussing" })
  }

  async function deleteItem(id: string) {
    const { error } = await supabase.from("lt_inbox_items").delete().eq("id", id)
    if (error) { toast.error("Erro ao excluir item do inbox"); return }
    setItems(prev => prev.filter(i => i.id !== id))
  }

  return { items, loading, updateItem, appendChatMessage, deleteItem }
}
