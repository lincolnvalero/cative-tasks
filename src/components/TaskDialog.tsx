import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { useApp } from "@/context/AppContext"
import type { Task, Status, Priority } from "@/types/task"
import { STATUS_CONFIG, PRIORITY_CONFIG } from "@/types/task"
import { X } from "lucide-react"
import { ProjectIcon } from "@/components/ProjectIcon"
import { toast } from "sonner"

interface TaskDialogProps {
  open: boolean
  onClose: () => void
  task?: Task | null
  defaultStatus?: Status
}

const emptyForm = {
  title: "",
  description: "",
  status: "todo" as Status,
  priority: "none" as Priority,
  projectId: "",
  dueDate: "",
  tags: [] as string[],
}

export function TaskDialog({ open, onClose, task, defaultStatus }: TaskDialogProps) {
  const { addTask, updateTask, projects, activeProjectId } = useApp()
  const [form, setForm] = useState(emptyForm)
  const [tagInput, setTagInput] = useState("")

  useEffect(() => {
    if (task) {
      setForm({
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        projectId: task.projectId,
        dueDate: task.dueDate ?? "",
        tags: task.tags,
      })
    } else {
      const defaultProject = activeProjectId ?? projects[0]?.id ?? ""
      setForm({ ...emptyForm, status: defaultStatus ?? "todo", projectId: defaultProject })
    }
    setTagInput("")
  }, [task, open, defaultStatus, projects, activeProjectId])

  function handleSave() {
    if (!form.title.trim()) return
    const payload = {
      ...form,
      dueDate: form.dueDate || null,
      projectId: form.projectId || (projects[0]?.id ?? ""),
    }
    if (task) {
      updateTask(task.id, payload)
      toast.success("Tarefa atualizada")
    } else {
      addTask(payload)
      toast.success("Tarefa criada!")
    }
    onClose()
  }

  function addTag() {
    const tag = tagInput.trim().toLowerCase()
    if (tag && !form.tags.includes(tag)) {
      setForm(f => ({ ...f, tags: [...f.tags, tag] }))
    }
    setTagInput("")
  }

  function removeTag(tag: string) {
    setForm(f => ({ ...f, tags: f.tags.filter(t => t !== tag) }))
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{task ? "Editar tarefa" : "Nova tarefa"}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <Input
            placeholder="Título da tarefa *"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            onKeyDown={e => e.key === "Enter" && handleSave()}
            autoFocus
          />

          <Textarea
            placeholder="Descrição (opcional)"
            rows={3}
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          />

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Status</label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as Status }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.entries(STATUS_CONFIG) as [Status, typeof STATUS_CONFIG[Status]][]).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Prioridade</label>
              <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v as Priority }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.entries(PRIORITY_CONFIG) as [Priority, typeof PRIORITY_CONFIG[Priority]][]).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Projeto</label>
              <Select value={form.projectId} onValueChange={v => setForm(f => ({ ...f, projectId: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      <span className="flex items-center gap-2">
                        <ProjectIcon iconKey={p.emoji} className="size-3.5" style={{ color: p.color }} />
                        {p.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Data de entrega</label>
              <Input
                type="date"
                value={form.dueDate}
                onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">Tags</label>
            <div className="flex gap-2">
              <Input
                placeholder="Adicionar tag e pressionar Enter..."
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag() } }}
                className="flex-1"
              />
            </div>
            {form.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1">
                {form.tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="gap-1 cursor-pointer" onClick={() => removeTag(tag)}>
                    {tag} <X className="size-3" />
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!form.title.trim()}>
            {task ? "Salvar" : "Criar tarefa"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
