import { useState } from "react"
import { useApp } from "@/context/AppContext"
import type { Project } from "@/types/task"
import { PROJECT_COLORS } from "@/types/task"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { ProjectIcon, PROJECT_ICONS } from "@/components/ProjectIcon"
import { Plus, Pencil, Trash2, CheckCircle2, Clock } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

const emptyForm = { name: "", emoji: "target", color: PROJECT_COLORS[0] }

export function ProjectsPage() {
  const { projects, tasks, addProject, updateProject, deleteProject } = useApp()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [form, setForm] = useState(emptyForm)

  function openNew() {
    setEditingProject(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  function openEdit(project: Project) {
    setEditingProject(project)
    setForm({ name: project.name, emoji: project.emoji, color: project.color })
    setDialogOpen(true)
  }

  function handleSave() {
    if (!form.name.trim()) return
    if (editingProject) {
      updateProject(editingProject.id, form)
      toast.success("Projeto atualizado")
    } else {
      addProject(form)
      toast.success("Projeto criado!")
    }
    setDialogOpen(false)
  }

  function handleDelete(project: Project) {
    const count = tasks.filter(t => t.projectId === project.id).length
    const msg = count > 0
      ? `Excluir "${project.name}"? Isso também excluirá ${count} tarefa${count > 1 ? "s" : ""} vinculada${count > 1 ? "s" : ""}.`
      : `Excluir "${project.name}"?`
    if (confirm(msg)) {
      deleteProject(project.id)
      toast.success("Projeto excluído")
    }
  }

  return (
    <>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Projetos</h1>
            <p className="text-muted-foreground text-sm">Gerencie as áreas de trabalho da agência</p>
          </div>
          <Button onClick={openNew}>
            <Plus className="size-4" data-icon="inline-start" />
            Novo projeto
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map(project => {
            const projectTasks = tasks.filter(t => t.projectId === project.id)
            const done = projectTasks.filter(t => t.status === "done").length
            const active = projectTasks.filter(t => t.status !== "done").length
            const pct = projectTasks.length > 0 ? Math.round((done / projectTasks.length) * 100) : 0

            return (
              <Card key={project.id} className="group hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="size-10 rounded-xl flex items-center justify-center"
                        style={{ background: project.color + "22", border: `1px solid ${project.color}44` }}
                      >
                        <ProjectIcon iconKey={project.emoji} size={20} style={{ color: project.color }} />
                      </div>
                      <div>
                        <CardTitle className="text-base">{project.name}</CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {projectTasks.length} tarefa{projectTasks.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="size-7" onClick={() => openEdit(project)}>
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 hover:text-destructive"
                        onClick={() => handleDelete(project)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Progresso</span>
                      <span>{pct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, background: project.color }}
                      />
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="size-3" />
                      <span>{active} ativas</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-green-600">
                      <CheckCircle2 className="size-3" />
                      <span>{done} concluídas</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <div className="size-3 rounded-full" style={{ background: project.color }} />
                    <span className="text-xs text-muted-foreground font-mono">{project.color}</span>
                  </div>
                </CardContent>
              </Card>
            )
          })}

          <button
            onClick={openNew}
            className="rounded-xl border-2 border-dashed border-muted-foreground/20 hover:border-primary/40 hover:bg-muted/30 transition-all flex flex-col items-center justify-center gap-2 p-6 min-h-[160px] text-muted-foreground hover:text-foreground"
          >
            <div className="size-10 rounded-xl bg-muted flex items-center justify-center">
              <Plus className="size-5" />
            </div>
            <span className="text-sm font-medium">Novo projeto</span>
          </button>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={v => !v && setDialogOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingProject ? "Editar projeto" : "Novo projeto"}</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            {/* Preview */}
            <div className="flex items-center gap-3 p-3 rounded-lg border">
              <div
                className="size-12 rounded-xl flex items-center justify-center"
                style={{ background: form.color + "22", border: `1px solid ${form.color}44` }}
              >
                <ProjectIcon iconKey={form.emoji} size={24} style={{ color: form.color }} />
              </div>
              <div>
                <p className="font-semibold">{form.name || "Nome do projeto"}</p>
                <p className="text-xs text-muted-foreground">Prévia</p>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Nome *</label>
              <Input
                placeholder="Nome do projeto"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                onKeyDown={e => e.key === "Enter" && handleSave()}
                autoFocus
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Ícone</label>
              <div className="grid grid-cols-5 gap-1.5">
                {PROJECT_ICONS.map(({ key, Icon, label }) => (
                  <button
                    key={key}
                    title={label}
                    onClick={() => setForm(f => ({ ...f, emoji: key }))}
                    className={cn(
                      "size-10 rounded-lg flex items-center justify-center hover:bg-muted transition-colors",
                      form.emoji === key
                        ? "ring-2 ring-offset-1 ring-primary bg-muted"
                        : "text-muted-foreground"
                    )}
                    style={form.emoji === key ? { color: form.color } : {}}
                  >
                    <Icon className="size-4" />
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Cor</label>
              <div className="flex flex-wrap gap-2">
                {PROJECT_COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() => setForm(f => ({ ...f, color }))}
                    className={cn(
                      "size-8 rounded-full transition-transform hover:scale-110",
                      form.color === color && "ring-2 ring-offset-2 ring-primary scale-110"
                    )}
                    style={{ background: color }}
                  />
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!form.name.trim()}>
              {editingProject ? "Salvar" : "Criar projeto"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
