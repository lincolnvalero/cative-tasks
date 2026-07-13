import { useState, useMemo } from "react"
import { useApp } from "@/context/AppContext"
import { MemberAvatar } from "@/components/MemberAvatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { showConfirm } from "@/components/ConfirmDialog"
import { MEMBER_COLORS } from "@/store/useMembersStore"
import { isPast, parseISO, isToday } from "date-fns"
import { Plus, Trash2, Pencil, Check, X, ChevronDown, ChevronUp } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

type Role = "admin" | "editor" | "viewer"

const ROLE_CONFIG: Record<Role, { label: string; color: string }> = {
  admin:  { label: "Admin",     color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  editor: { label: "Editor",    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  viewer: { label: "Visualizador", color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" },
}

function getMemberMeta(id: string): { role: Role; active: boolean } {
  try {
    const raw = localStorage.getItem(`lincoln-member-${id}`)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return { role: "editor", active: true }
}

function setMemberMeta(id: string, meta: { role: Role; active: boolean }) {
  localStorage.setItem(`lincoln-member-${id}`, JSON.stringify(meta))
}

interface MemberCardProps {
  memberId: string
}

function MemberCard({ memberId }: MemberCardProps) {
  const { members, tasks, updateMember, removeMember } = useApp()
  const member = members.find(m => m.id === memberId)!
  const [meta, setMeta] = useState(() => getMemberMeta(memberId))
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(member.name)
  const [editColor, setEditColor] = useState(member.color)
  const [expanded, setExpanded] = useState(false)
  const [saving, setSaving] = useState(false)

  const stats = useMemo(() => {
    const mine = tasks.filter(t => t.assignee === member.name)
    const done = mine.filter(t => t.status === "done").length
    const inProgress = mine.filter(t => t.status === "in-progress").length
    const overdue = mine.filter(t =>
      t.status !== "done" && t.dueDate &&
      (isPast(parseISO(t.dueDate)) && !isToday(parseISO(t.dueDate)))
    ).length
    return { total: mine.length, done, inProgress, overdue }
  }, [tasks, member.name])

  function updateMeta(patch: Partial<typeof meta>) {
    const next = { ...meta, ...patch }
    setMeta(next)
    setMemberMeta(memberId, next)
  }

  async function handleSaveEdit() {
    if (!editName.trim()) return
    setSaving(true)
    await updateMember(memberId, { name: editName.trim(), color: editColor })
    setSaving(false)
    setEditing(false)
    toast.success("Colaborador atualizado")
  }

  function handleCancelEdit() {
    setEditName(member.name)
    setEditColor(member.color)
    setEditing(false)
  }

  async function handleRemove() {
    const ok = await showConfirm({
      title: `Remover "${member.name}"?`,
      description: "O colaborador será removido. Tarefas atribuídas não serão alteradas.",
      confirmLabel: "Remover",
      variant: "destructive",
    })
    if (ok) await removeMember(memberId)
  }

  return (
    <Card className={cn("transition-opacity", !meta.active && "opacity-60")}>
      <CardContent className="py-3 px-4 flex flex-col gap-3">
        {/* Main row */}
        <div className="flex items-center gap-3">
          <MemberAvatar member={{ ...member, color: editColor }} size="md" />

          <div className="flex-1 min-w-0">
            {editing ? (
              <Input
                value={editName}
                onChange={e => setEditName(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleSaveEdit(); if (e.key === "Escape") handleCancelEdit() }}
                className="h-7 text-sm font-medium"
                autoFocus
              />
            ) : (
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-medium truncate">{member.name}</span>
                <Badge
                  variant="outline"
                  className={cn("text-[10px] px-1.5 py-0 border-0 shrink-0", ROLE_CONFIG[meta.role].color)}
                >
                  {ROLE_CONFIG[meta.role].label}
                </Badge>
                {!meta.active && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-0 bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 shrink-0">
                    Inativo
                  </Badge>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {editing ? (
              <>
                <Button variant="ghost" size="icon" className="size-7 text-green-600 hover:text-green-700" onClick={handleSaveEdit} disabled={saving}>
                  <Check className="size-4" />
                </Button>
                <Button variant="ghost" size="icon" className="size-7" onClick={handleCancelEdit}>
                  <X className="size-4" />
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-foreground" onClick={() => { setEditing(true); setExpanded(true) }}>
                  <Pencil className="size-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="size-7 text-muted-foreground" onClick={() => setExpanded(v => !v)}>
                  {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Stats row (always visible) */}
        <div className="grid grid-cols-4 gap-2 text-center">
          {[
            { label: "Total", value: stats.total, color: "text-foreground" },
            { label: "Feitas", value: stats.done, color: "text-green-600" },
            { label: "Andamento", value: stats.inProgress, color: "text-yellow-600" },
            { label: "Vencidas", value: stats.overdue, color: stats.overdue > 0 ? "text-red-600 font-semibold" : "text-muted-foreground" },
          ].map(s => (
            <div key={s.label} className="flex flex-col items-center rounded-lg bg-muted/40 py-1.5">
              <span className={cn("text-base font-bold leading-none", s.color)}>{s.value}</span>
              <span className="text-[10px] text-muted-foreground mt-0.5">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Expanded panel */}
        {expanded && (
          <div className="flex flex-col gap-3 pt-1 border-t">
            {/* Color picker */}
            {editing && (
              <div className="flex flex-col gap-1.5">
                <span className="text-xs text-muted-foreground">Cor do avatar</span>
                <div className="flex flex-wrap gap-2">
                  {MEMBER_COLORS.map(c => (
                    <button
                      key={c}
                      className={cn("size-6 rounded-full border-2 transition-transform hover:scale-110", editColor === c ? "border-foreground scale-110" : "border-transparent")}
                      style={{ background: c }}
                      onClick={() => setEditColor(c)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Role */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-muted-foreground">Papel</span>
              <div className="flex gap-1.5">
                {(Object.keys(ROLE_CONFIG) as Role[]).map(role => (
                  <button
                    key={role}
                    onClick={() => updateMeta({ role })}
                    className={cn(
                      "flex-1 text-xs py-1.5 rounded-md border transition-colors",
                      meta.role === role
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border hover:bg-muted"
                    )}
                  >
                    {ROLE_CONFIG[role].label}
                  </button>
                ))}
              </div>
            </div>

            {/* Active toggle */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Status</span>
              <button
                onClick={() => updateMeta({ active: !meta.active })}
                className={cn(
                  "flex items-center gap-2 text-xs px-3 py-1.5 rounded-md border transition-colors",
                  meta.active
                    ? "border-green-300 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800"
                    : "border-yellow-300 bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800"
                )}
              >
                <span className={cn("size-2 rounded-full", meta.active ? "bg-green-500" : "bg-yellow-500")} />
                {meta.active ? "Ativo" : "Inativo"}
              </button>
            </div>

            {/* Delete */}
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5"
              onClick={handleRemove}
            >
              <Trash2 className="size-3.5" />
              Remover colaborador
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function CollaboratorsPage() {
  const { members, addMember } = useApp()
  const [newName, setNewName] = useState("")
  const [saving, setSaving] = useState(false)

  async function handleAdd() {
    const name = newName.trim()
    if (!name) return
    setSaving(true)
    await addMember(name)
    setNewName("")
    setSaving(false)
    toast.success("Colaborador adicionado")
  }

  const active = members.filter(m => getMemberMeta(m.id).active)
  const inactive = members.filter(m => !getMemberMeta(m.id).active)

  return (
    <div className="flex flex-col gap-6 max-w-lg">
      <div>
        <h1 className="text-2xl font-bold">Colaboradores</h1>
        <p className="text-muted-foreground text-sm">{members.length} membro{members.length !== 1 ? "s" : ""} na equipe</p>
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Nome do colaborador"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !saving && handleAdd()}
        />
        <Button onClick={handleAdd} disabled={saving || !newName.trim()} className="shrink-0 gap-1.5">
          <Plus className="size-4" />
          Adicionar
        </Button>
      </div>

      {members.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">Nenhum colaborador cadastrado</p>
      )}

      {active.length > 0 && (
        <div className="flex flex-col gap-2">
          {active.map(m => <MemberCard key={m.id} memberId={m.id} />)}
        </div>
      )}

      {inactive.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Inativos</p>
          {inactive.map(m => <MemberCard key={m.id} memberId={m.id} />)}
        </div>
      )}
    </div>
  )
}
