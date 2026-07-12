import { useState } from "react"
import { useApp } from "@/context/AppContext"
import { MemberAvatar } from "@/components/MemberAvatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { showConfirm } from "@/components/ConfirmDialog"
import { Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

export function CollaboratorsPage() {
  const { members, addMember, removeMember } = useApp()
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

  async function handleRemove(id: string, name: string) {
    const ok = await showConfirm({
      title: `Remover "${name}"?`,
      description: "O colaborador será removido da lista. Tarefas atribuídas a ele não serão alteradas.",
      confirmLabel: "Remover",
      variant: "destructive",
    })
    if (ok) await removeMember(id)
  }

  return (
    <div className="flex flex-col gap-6 max-w-lg">
      <div>
        <h1 className="text-2xl font-bold">Colaboradores</h1>
        <p className="text-muted-foreground text-sm">Gerencie os membros da equipe</p>
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Nome do colaborador"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !saving && handleAdd()}
          autoFocus
        />
        <Button onClick={handleAdd} disabled={saving || !newName.trim()} className="shrink-0 gap-1.5">
          <Plus className="size-4" />
          Adicionar
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        {members.map(m => (
          <Card key={m.id}>
            <CardContent className="py-3 px-4 flex items-center gap-3">
              <MemberAvatar member={m} size="md" />
              <span className="flex-1 font-medium">{m.name}</span>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 hover:text-destructive"
                onClick={() => handleRemove(m.id, m.name)}
              >
                <Trash2 className="size-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
        {members.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum colaborador cadastrado</p>
        )}
      </div>
    </div>
  )
}
