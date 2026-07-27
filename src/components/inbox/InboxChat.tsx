import { useState, useRef, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Send, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import type { InboxItem, InboxChatMessage } from "@/types/inbox"
import type { Project } from "@/types/task"

interface Props {
  item: InboxItem | null
  projects: Project[]
  onClose: () => void
  onSendMessage: (itemId: string, message: InboxChatMessage) => Promise<void>
  onTaskCreated: () => void
}

export function InboxChat({ item, projects, onClose, onSendMessage, onTaskCreated }: Props) {
  const [draft, setDraft] = useState("")
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [item?.chatHistory.length])

  async function handleSend() {
    const text = draft.trim()
    if (!text || !item) return
    setSending(true)
    setDraft("")
    try {
      await onSendMessage(item.id, { role: "user", text })
      const { data, error } = await supabase.functions.invoke("inbox-chat", {
        body: { itemId: item.id, projects: projects.map(p => ({ id: p.id, name: p.name })) },
      })
      if (error) {
        toast.error("Erro ao falar com a IA — confirme se a GEMINI_API_KEY está configurada no Supabase")
        return
      }
      if (data?.taskCreated) {
        toast.success("Tarefa criada pela IA!")
        onTaskCreated()
      }
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={!!item} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg flex flex-col h-[70vh]">
        <DialogHeader>
          <DialogTitle className="text-sm truncate">{item?.caption || item?.url}</DialogTitle>
        </DialogHeader>

        <div ref={scrollRef} className="flex-1 overflow-y-auto flex flex-col gap-3 py-2">
          {(item?.chatHistory ?? []).length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-8">
              Conte pra IA o que você quer fazer com esse vídeo — ela pode sugerir o projeto certo e já criar a tarefa quando vocês chegarem numa conclusão.
            </p>
          )}
          {item?.chatHistory.map((msg, i) => (
            <div key={i} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
              <div className={cn(
                "max-w-[80%] rounded-lg px-3 py-2 text-sm",
                msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
              )}>
                {msg.text}
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2 pt-2 border-t">
          <Textarea
            placeholder="Escreva sua mensagem…"
            rows={2}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            className="resize-none text-sm"
          />
          <Button size="icon" className="shrink-0" onClick={handleSend} disabled={!draft.trim() || sending}>
            {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
