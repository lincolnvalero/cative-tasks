import { useState, useRef, useEffect } from "react"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Progress } from "@/components/ui/progress"
import { useApp } from "@/context/AppContext"
import { useAuth } from "@/context/AuthContext"
import type { Task, Status, Priority, Recurring } from "@/types/task"
import { STATUS_CONFIG, PRIORITY_CONFIG, RECURRING_CONFIG } from "@/types/task"
import { ProjectIcon } from "@/components/ProjectIcon"
import { MemberAvatar } from "@/components/MemberAvatar"
import { ChecklistEditor } from "@/components/ChecklistEditor"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { showConfirm } from "@/components/ConfirmDialog"
import {
  Trash2, Flag, CheckSquare, MessageSquare,
  Activity, Plus, X, Send, RefreshCw, Copy, Link2,
} from "lucide-react"
import { parseISO, formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"

interface Props {
  task: Task | null
  onClose: () => void
}

// Wrapper — keeps the Sheet animation alive even when task becomes null
export function TaskDetailSheet({ task, onClose }: Props) {
  return (
    <Sheet open={!!task} onOpenChange={v => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-[580px] p-0 flex flex-col gap-0" side="right" data-vaul-drawer-direction="right">
        <SheetTitle className="sr-only">Detalhes da tarefa</SheetTitle>
        {task && <TaskDetailContent task={task} onClose={onClose} />}
      </SheetContent>
    </Sheet>
  )
}

// Inner component — task is always Task (never null) here
function TaskDetailContent({ task, onClose }: { task: Task; onClose: () => void }) {
  const {
    projects, updateTask, deleteTask, moveTask,
    addComment, deleteComment,
    addChecklistItem, toggleChecklistItem, updateChecklistItem, deleteChecklistItem, reorderChecklist,
    addTaskLink, deleteTaskLink, duplicateTask,
    members,
  } = useApp()
  const { profile, isAdmin } = useAuth()

  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description)
  const [commentText, setCommentText] = useState("")
  const [newChecklistText, setNewChecklistText] = useState("")
  const [tab, setTab] = useState<"checklist" | "comments" | "activity" | "links">("comments")
  const [newLinkTitle, setNewLinkTitle] = useState("")
  const [newLinkUrl, setNewLinkUrl] = useState("")
  const commentInputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setTitle(task.title)
    setDescription(task.description)
    setCommentText("")
  }, [task.id, task.title, task.description])

  const checklist = task.checklist ?? []
  const comments = task.comments ?? []
  const activity = task.activity ?? []
  const checklistDone = checklist.filter(i => i.done).length
  const checklistPct = checklist.length > 0 ? Math.round((checklistDone / checklist.length) * 100) : 0

  async function saveTitle() {
    if (title.trim() && title !== task.title) {
      const ok = await updateTask(task.id, { title: title.trim() }, "Título alterado")
      if (ok) toast.success("Título atualizado")
    }
  }

  function saveDescription() {
    if (description !== task.description) updateTask(task.id, { description })
  }

  async function handleStatusChange(status: Status) {
    const ok = await moveTask(task.id, status)
    if (ok) toast.success(`Status: ${STATUS_CONFIG[status].label}`)
  }

  function handlePriorityChange(priority: Priority) {
    updateTask(task.id, { priority }, `Prioridade alterada para ${PRIORITY_CONFIG[priority].label}`)
  }

  function handleProjectChange(projectId: string) {
    const p = projects.find(pr => pr.id === projectId)
    updateTask(task.id, { projectId }, `Projeto alterado para ${p?.name ?? ""}`)
  }

  function handleDueDateChange(dueDate: string) {
    updateTask(task.id, { dueDate: dueDate || null }, dueDate ? "Data de entrega definida" : "Data de entrega removida")
  }

  function handleRecurringChange(val: string) {
    const recurring = val === "none" ? null : val as Recurring
    updateTask(task.id, { recurring }, recurring ? `Recorrência: ${RECURRING_CONFIG[recurring as NonNullable<Recurring>]}` : "Recorrência removida")
  }

  async function handleSendComment() {
    const text = commentText.trim()
    if (!text) return
    const ok = await addComment(task.id, text)
    if (!ok) return
    setCommentText("")
    toast.success("Comentário adicionado")
  }

  function handleAddChecklist() {
    const text = newChecklistText.trim()
    if (!text) return
    addChecklistItem(task.id, text)
    setNewChecklistText("")
  }

  async function handleDelete() {
    const ok = await showConfirm({
      title: `Excluir "${task.title}"?`,
      description: "Esta ação não pode ser desfeita.",
      confirmLabel: "Excluir",
      variant: "destructive",
    })
    if (ok) {
      deleteTask(task.id)
      onClose()
    }
  }

  async function handleDuplicate() {
    const duplicated = await duplicateTask(task.id)
    if (duplicated) toast.success("Tarefa duplicada!")
  }

  function handleAddLink() {
    const tl = newLinkTitle.trim()
    const ur = newLinkUrl.trim()
    if (!tl || !ur) return
    addTaskLink(task.id, tl, ur)
    setNewLinkTitle("")
    setNewLinkUrl("")
  }

  const statusCfg = STATUS_CONFIG[task.status]
  const priorityCfg = PRIORITY_CONFIG[task.priority]

  return (
    <>
      {/* Header — pr-12 garante espaço para o X automático do Sheet */}
      <div className="flex items-center gap-2 flex-wrap px-5 py-3 pr-12 border-b shrink-0">
        <Badge variant="outline" className={cn("text-xs", statusCfg.color, statusCfg.bg)}>
          {statusCfg.label}
        </Badge>
        {task.priority !== "none" && (
          <Badge variant="outline" className={cn("text-xs", priorityCfg.color)}>
            <Flag className="size-3 mr-1" />{priorityCfg.label}
          </Badge>
        )}
        {task.recurring && (
          <Badge variant="secondary" className="text-xs gap-1">
            <RefreshCw className="size-3" />{RECURRING_CONFIG[task.recurring]}
          </Badge>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-1 px-5 py-2 border-b shrink-0">
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={handleDuplicate} title="Duplicar tarefa">
          <Copy className="size-3.5" />
          <span className="hidden sm:inline">Copiar</span>
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-5 px-5 py-4">

          {/* Title + lixeira na mesma linha */}
          <div className="flex items-start gap-2">
          <input
            className="text-xl font-bold bg-transparent border-none outline-none flex-1 leading-snug placeholder:text-muted-foreground"
            value={title}
            onChange={e => setTitle(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={e => e.key === "Enter" && e.currentTarget.blur()}
            placeholder="Título da tarefa"
          />
          <Button variant="ghost" size="icon" className="size-8 shrink-0 hover:text-destructive mt-0.5" onClick={handleDelete} title="Excluir tarefa">
            <Trash2 className="size-4" />
          </Button>
          </div>

          {/* Properties — vertical list, sem truncamento */}
          <div className="rounded-lg border divide-y text-sm">
            <PropRow label="Status">
              <Select value={task.status} onValueChange={v => handleStatusChange(v as Status)}>
                <SelectTrigger className="h-8 text-xs border-0 shadow-none bg-transparent focus:ring-0 w-full justify-start gap-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(STATUS_CONFIG) as [Status, typeof STATUS_CONFIG[Status]][]).map(([k, v]) => (
                    <SelectItem key={k} value={k} className="text-xs">{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </PropRow>

            <PropRow label="Prioridade">
              <Select value={task.priority} onValueChange={v => handlePriorityChange(v as Priority)}>
                <SelectTrigger className="h-8 text-xs border-0 shadow-none bg-transparent focus:ring-0 w-full justify-start gap-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(PRIORITY_CONFIG) as [Priority, typeof PRIORITY_CONFIG[Priority]][]).map(([k, v]) => (
                    <SelectItem key={k} value={k} className="text-xs">{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </PropRow>

            <PropRow label="Projeto">
              <Select value={task.projectId} onValueChange={handleProjectChange}>
                <SelectTrigger className="h-8 text-xs border-0 shadow-none bg-transparent focus:ring-0 w-full justify-start gap-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id} className="text-xs">
                      <span className="flex items-center gap-1.5">
                        <ProjectIcon iconKey={p.emoji} className="size-3" style={{ color: p.color }} />
                        {p.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </PropRow>

            <PropRow label="Entrega">
              <input
                type="date"
                className="h-8 text-xs bg-transparent outline-none w-full px-1"
                value={task.dueDate ?? ""}
                onChange={e => handleDueDateChange(e.target.value)}
              />
            </PropRow>

            <PropRow label="Recorrência">
              <Select value={task.recurring ?? "none"} onValueChange={handleRecurringChange}>
                <SelectTrigger className="h-8 text-xs border-0 shadow-none bg-transparent focus:ring-0 w-full justify-start gap-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" className="text-xs">Não recorrente</SelectItem>
                  {(Object.entries(RECURRING_CONFIG) as [NonNullable<Recurring>, string][]).map(([k, v]) => (
                    <SelectItem key={k} value={k} className="text-xs">
                      <span className="flex items-center gap-1.5"><RefreshCw className="size-3" />{v}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </PropRow>

            <PropRow label="Responsável">
              <div className="flex items-center gap-1 w-full">
                <Select
                  value={task.assignee ?? "none"}
                  onValueChange={v => updateTask(task.id, { assignee: v === "none" ? null : v }, `Responsável: ${v === "none" ? "Ninguém" : v}`)}
                >
                  <SelectTrigger className="h-8 text-xs border-0 shadow-none bg-transparent focus:ring-0 flex-1 justify-start gap-2">
                    <SelectValue>
                      {task.assignee ? (
                        <span className="flex items-center gap-1.5">
                          <MemberAvatar member={members.find(m => m.name === task.assignee)!} size="xs" />
                          {task.assignee}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Ninguém</span>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" className="text-xs">Ninguém</SelectItem>
                    {members.map(m => (
                      <SelectItem key={m.id} value={m.name} className="text-xs">
                        <span className="flex items-center gap-2">
                          <MemberAvatar member={m} size="xs" />
                          {m.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </PropRow>
          </div>

          {task.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {task.tags.map(tag => <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>)}
            </div>
          )}

          <Separator />

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Descrição</label>
            <Textarea
              placeholder="Adicione uma descrição..."
              rows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
              onBlur={saveDescription}
              className="resize-none text-sm"
            />
          </div>

          <Separator />

          {/* Tabs */}
          <div className="flex flex-col gap-3">
            <div className="flex gap-1 border-b overflow-x-auto">
              {(["checklist", "comments", "activity", "links"] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={cn(
                    "flex items-center gap-1.5 text-xs px-3 py-1.5 border-b-2 transition-colors -mb-px shrink-0",
                    tab === t ? "border-primary text-foreground font-medium" : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  {t === "checklist" && <><CheckSquare className="size-3" />Checklist {checklist.length > 0 && `(${checklistDone}/${checklist.length})`}</>}
                  {t === "comments" && <><MessageSquare className="size-3" />Comentários {comments.length > 0 && `(${comments.length})`}</>}
                  {t === "activity" && <><Activity className="size-3" />Atividade</>}
                  {t === "links" && <><Link2 className="size-3" />Links {task.links.length > 0 && `(${task.links.length})`}</>}
                </button>
              ))}
            </div>

            {/* CHECKLIST */}
            {tab === "checklist" && (
              <div className="flex flex-col gap-2">
                {checklist.length > 0 && (
                  <div className="flex items-center gap-2 mb-1">
                    <Progress value={checklistPct} className="h-1.5 flex-1" />
                    <span className="text-xs text-muted-foreground w-10 text-right">{checklistPct}%</span>
                  </div>
                )}
                <ChecklistEditor
                  items={checklist}
                  onToggle={itemId => toggleChecklistItem(task.id, itemId)}
                  onDelete={itemId => deleteChecklistItem(task.id, itemId)}
                  onEdit={(itemId, text) => updateChecklistItem(task.id, itemId, text)}
                  onReorder={orderedIds => reorderChecklist(task.id, orderedIds)}
                />
                <div className="flex gap-2 mt-1">
                  <Input
                    placeholder="Adicionar item..."
                    value={newChecklistText}
                    onChange={e => setNewChecklistText(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && (e.preventDefault(), handleAddChecklist())}
                    className="h-7 text-xs"
                  />
                  <Button size="sm" variant="outline" className="h-7 px-2" onClick={handleAddChecklist}>
                    <Plus className="size-3.5" />
                  </Button>
                </div>
              </div>
            )}

            {/* COMMENTS */}
            {tab === "comments" && (
              <div className="flex flex-col gap-3">
                {comments.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">Nenhum comentário ainda.</p>
                )}
                {comments.map(comment => {
                  const author = members.find(m => m.id === comment.authorId)
                  const canDelete = isAdmin || comment.authorId === profile?.id
                  return (
                    <div key={comment.id} className="flex gap-2.5 group">
                      {author ? (
                        <MemberAvatar member={author} size="sm" className="mt-0.5" />
                      ) : (
                        <div className="size-7 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground shrink-0 mt-0.5">?</div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                          <span className="text-xs font-semibold">{author?.name ?? "Ex-membro"}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(parseISO(comment.createdAt), { addSuffix: true, locale: ptBR })}
                          </span>
                          {canDelete && (
                            <button onClick={() => deleteComment(task.id, comment.id)} className="ml-auto opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all">
                              <X className="size-3" />
                            </button>
                          )}
                        </div>
                        <div className="mt-1 text-sm bg-muted/40 rounded-lg px-3 py-2 leading-relaxed">{comment.text}</div>
                      </div>
                    </div>
                  )
                })}
                <div className="flex gap-2 mt-2">
                  {profile ? <MemberAvatar member={profile} size="sm" className="mt-1" /> : <div className="size-7 rounded-full bg-primary/20 shrink-0 mt-1" />}
                  <div className="flex-1 flex flex-col gap-1.5">
                    <Textarea
                      ref={commentInputRef}
                      placeholder="Escreva um comentário..."
                      rows={2}
                      value={commentText}
                      onChange={e => setCommentText(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendComment() } }}
                      className="resize-none text-sm"
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Enter · Shift+Enter para quebra</span>
                      <Button size="sm" className="h-7 gap-1" onClick={handleSendComment} disabled={!commentText.trim()}>
                        <Send className="size-3" /> Enviar
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ACTIVITY */}
            {tab === "activity" && (
              <div className="flex flex-col gap-2">
                {activity.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Sem atividade.</p>}
                {[...activity].reverse().map(entry => (
                  <div key={entry.id} className="flex items-start gap-2.5">
                    <div className="size-1.5 rounded-full bg-muted-foreground/40 mt-1.5 shrink-0" />
                    <p className="text-xs text-muted-foreground">
                      <span className="text-foreground font-medium">{entry.text}</span>
                      {" · "}
                      {formatDistanceToNow(parseISO(entry.createdAt), { addSuffix: true, locale: ptBR })}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* LINKS */}
            {tab === "links" && (
              <div className="flex flex-col gap-3">
                {task.links.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">Nenhum link ainda.</p>
                )}
                {task.links.map(link => (
                  <div key={link.id} className="flex items-center gap-2 group p-2 rounded border border-border/50 hover:bg-muted/30">
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 min-w-0 flex flex-col gap-0.5"
                    >
                      <span className="text-xs font-medium text-primary underline truncate hover:text-primary/80">{link.title}</span>
                      <span className="text-xs text-muted-foreground truncate">{link.url}</span>
                    </a>
                    <button
                      onClick={() => deleteTaskLink(task.id, link.id)}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all shrink-0"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                ))}
                <div className="flex flex-col gap-2 mt-2 pt-2 border-t">
                  <Input
                    placeholder="Título do link"
                    value={newLinkTitle}
                    onChange={e => setNewLinkTitle(e.target.value)}
                    className="h-8 text-xs"
                  />
                  <Input
                    placeholder="URL (https://...)"
                    value={newLinkUrl}
                    onChange={e => setNewLinkUrl(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleAddLink()}
                    className="h-8 text-xs"
                  />
                  <Button size="sm" variant="outline" className="h-7 px-2" onClick={handleAddLink}>
                    <Plus className="size-3.5" /> Adicionar link
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </>
  )
}

// Layout limpo: label fixo à esquerda, valor ocupa o restante sem truncar
function PropRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center min-h-[36px] px-3">
      <span className="text-xs text-muted-foreground w-24 shrink-0 font-medium">{label}</span>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}
