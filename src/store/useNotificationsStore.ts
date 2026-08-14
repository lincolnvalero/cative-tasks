import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
import type { AppNotification } from "@/types/notification"

function mapNotification(row: Record<string, unknown>): AppNotification {
  return {
    id: row.id as string,
    recipientId: row.recipient_id as string,
    actorId: (row.actor_id as string) ?? null,
    type: row.type as AppNotification["type"],
    projectId: (row.project_id as string) ?? null,
    taskId: (row.task_id as string) ?? null,
    status: row.status as AppNotification["status"],
    createdAt: row.created_at as string,
  }
}

export function useNotificationsStore(userId: string | null) {
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!userId) { setNotifications([]); setLoading(false); return }
    const { data } = await supabase.from("lt_notifications").select("*")
      .eq("recipient_id", userId).eq("status", "pending").order("created_at", { ascending: false })
    setNotifications((data ?? []).map(mapNotification))
    setLoading(false)
  }, [userId])

  useEffect(() => {
    load()
    if (!userId) return
    const channel = supabase
      .channel(`notifications_${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "lt_notifications", filter: `recipient_id=eq.${userId}` }, () => {
        load()
      })
      .subscribe()
    return () => { channel.unsubscribe() }
  }, [userId, load])

  async function sendProjectInvite(recipientId: string, projectId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false
    const { data: existing } = await supabase.from("lt_notifications").select("id")
      .eq("recipient_id", recipientId).eq("project_id", projectId)
      .eq("type", "project_invite").eq("status", "pending").maybeSingle()
    if (existing) return true
    const { error } = await supabase.from("lt_notifications").insert({
      recipient_id: recipientId, actor_id: user.id, type: "project_invite", project_id: projectId,
    })
    if (error) { toast.error("Erro ao enviar convite"); return false }
    return true
  }

  async function cancelInvite(recipientId: string, projectId: string): Promise<boolean> {
    const { error } = await supabase.from("lt_notifications").delete()
      .eq("recipient_id", recipientId).eq("project_id", projectId)
      .eq("type", "project_invite").eq("status", "pending")
    if (error) { toast.error("Erro ao cancelar convite"); return false }
    return true
  }

  async function acceptInvite(notification: AppNotification): Promise<boolean> {
    if (!notification.projectId) return false
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false
    const { error: joinError } = await supabase.from("lt_project_members").insert({
      project_id: notification.projectId, user_id: user.id,
    })
    if (joinError) { toast.error("Erro ao entrar no projeto"); return false }
    const { error } = await supabase.from("lt_notifications")
      .update({ status: "accepted", responded_at: new Date().toISOString() })
      .eq("id", notification.id)
    if (error) { toast.error("Erro ao atualizar notificação"); return false }
    setNotifications(prev => prev.filter(n => n.id !== notification.id))
    toast.success("Você entrou no projeto!")
    return true
  }

  async function dismissNotification(id: string): Promise<boolean> {
    const { error } = await supabase.from("lt_notifications")
      .update({ status: "dismissed", responded_at: new Date().toISOString() })
      .eq("id", id)
    if (error) { toast.error("Erro ao descartar notificação"); return false }
    setNotifications(prev => prev.filter(n => n.id !== id))
    return true
  }

  return { notifications, notificationsLoading: loading, sendProjectInvite, cancelInvite, acceptInvite, dismissNotification }
}
