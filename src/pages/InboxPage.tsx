import { useState } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { useInboxStore } from "@/store/useInboxStore"
import { InboxCard } from "@/components/inbox/InboxCard"
import { InboxChat } from "@/components/inbox/InboxChat"
import { useApp } from "@/context/AppContext"
import type { InboxItem } from "@/types/inbox"
import { toast } from "sonner"

export function InboxPage() {
  const { items, loading, updateItem, appendChatMessage, deleteItem } = useInboxStore()
  const { projects, addTask, addTaskLink } = useApp()
  const [discussing, setDiscussing] = useState<InboxItem | null>(null)

  const active = items.filter(i => i.status !== "promoted" && i.status !== "dismissed")
  const archived = items.filter(i => i.status === "promoted" || i.status === "dismissed")

  async function handlePromote(item: InboxItem, projectId: string) {
    const title = item.caption.trim() || `Vídeo do ${item.platform}`
    const newTask = await addTask({
      title,
      description: item.transcript ?? "",
      status: "todo",
      priority: "none",
      projectId,
      dueDate: null,
      tags: [item.platform],
      recurring: null,
      position: 0,
      assignee: null,
      workspace: "cative",
    })
    if (!newTask) {
      toast.error("Erro ao criar tarefa")
      return
    }
    await addTaskLink(newTask.id, `Vídeo (${item.platform})`, item.url)
    await updateItem(item.id, { status: "promoted" })
    toast.success("Tarefa criada!")
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-48" />
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">Inbox</h1>
        <p className="text-sm text-muted-foreground">Vídeos capturados do WhatsApp, aguardando virar tarefa.</p>
      </div>

      {active.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-10">
          Nada pendente. Mande um link de vídeo com uma legenda na conversa configurada do WhatsApp.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {active.map(item => (
            <InboxCard
              key={item.id}
              item={item}
              projects={projects}
              onPromote={projectId => handlePromote(item, projectId)}
              onDismiss={() => updateItem(item.id, { status: "dismissed" })}
              onDelete={() => deleteItem(item.id)}
              onDiscuss={() => setDiscussing(item)}
            />
          ))}
        </div>
      )}

      {archived.length > 0 && (
        <div className="flex flex-col gap-2 pt-4">
          <h2 className="text-sm font-medium text-muted-foreground">Arquivados</h2>
          <div className="flex flex-col gap-3">
            {archived.map(item => (
              <InboxCard
                key={item.id}
                item={item}
                projects={projects}
                onPromote={projectId => handlePromote(item, projectId)}
                onDismiss={() => updateItem(item.id, { status: "dismissed" })}
                onDelete={() => deleteItem(item.id)}
                onDiscuss={() => setDiscussing(item)}
              />
            ))}
          </div>
        </div>
      )}

      <InboxChat
        item={discussing ? items.find(i => i.id === discussing.id) ?? null : null}
        projects={projects}
        onClose={() => setDiscussing(null)}
        onSendMessage={(id, msg) => appendChatMessage(id, msg)}
        onTaskCreated={() => setDiscussing(null)}
      />
    </div>
  )
}
