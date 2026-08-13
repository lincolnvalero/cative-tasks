import { useState, useEffect } from "react"
import { useApp } from "@/context/AppContext"
import { useAuth } from "@/context/AuthContext"
import { supabase } from "@/lib/supabase"
import type { Profile } from "@/types/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { MemberAvatar } from "@/components/MemberAvatar"
import { Plus, KeyRound, ShieldCheck, Shield, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

function mapProfile(row: Record<string, unknown>): Profile {
  return {
    id: row.id as string,
    email: row.email as string,
    name: row.name as string,
    color: row.color as string,
    initials: row.initials as string,
    isAdmin: !!row.is_admin,
    createdAt: row.created_at as string,
  }
}

export function UsersPage() {
  const { tasks, refetchMembers } = useApp()
  const { profile: me } = useAuth()
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState({ name: "", email: "", password: "", isAdmin: false })
  const [creating, setCreating] = useState(false)
  const [resetTarget, setResetTarget] = useState<Profile | null>(null)
  const [resetPassword, setResetPassword] = useState("")
  const [resetting, setResetting] = useState(false)

  async function loadUsers() {
    setLoading(true)
    const { data } = await supabase.from("profiles").select("*").order("created_at")
    setUsers((data ?? []).map(mapProfile))
    setLoading(false)
  }

  useEffect(() => { loadUsers() }, [])

  async function handleCreate() {
    if (!createForm.name.trim() || !createForm.email.trim() || createForm.password.length < 6) {
      toast.error("Preencha nome, e-mail e uma senha com 6+ caracteres")
      return
    }
    setCreating(true)
    const { data, error } = await supabase.functions.invoke("admin-create-user", {
      body: { name: createForm.name.trim(), email: createForm.email.trim(), password: createForm.password, isAdmin: createForm.isAdmin },
    })
    setCreating(false)
    if (error || data?.error) {
      toast.error(data?.error ?? "Erro ao criar usuário — confirme se a edge function foi deployada")
      return
    }
    toast.success("Usuário criado!")
    setCreateOpen(false)
    setCreateForm({ name: "", email: "", password: "", isAdmin: false })
    await Promise.all([loadUsers(), refetchMembers()])
  }

  async function handleReset() {
    if (!resetTarget || resetPassword.length < 6) {
      toast.error("Senha precisa ter 6+ caracteres")
      return
    }
    setResetting(true)
    const { data, error } = await supabase.functions.invoke("admin-reset-password", {
      body: { userId: resetTarget.id, newPassword: resetPassword },
    })
    setResetting(false)
    if (error || data?.error) {
      toast.error(data?.error ?? "Erro ao resetar senha")
      return
    }
    toast.success(`Senha de ${resetTarget.name} redefinida`)
    setResetTarget(null)
    setResetPassword("")
  }

  async function toggleAdmin(user: Profile) {
    const { error } = await supabase.from("profiles").update({ is_admin: !user.isAdmin }).eq("id", user.id)
    if (error) {
      toast.error("Erro ao atualizar permissão")
      return
    }
    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, isAdmin: !u.isAdmin } : u))
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Usuários</h1>
          <p className="text-muted-foreground text-sm">Contas de acesso ao sistema</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" /> Novo usuário
        </Button>
      </div>

      {loading ? (
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {users.map(user => {
            const count = tasks.filter(t => t.assignee === user.name).length
            return (
              <Card key={user.id}>
                <CardContent className="pt-6 flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <MemberAvatar member={user} size="md" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{user.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                    {user.isAdmin && (
                      <Badge variant="secondary" className="gap-1 text-[10px]">
                        <ShieldCheck className="size-3" /> Admin
                      </Badge>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground">{count} tarefa{count !== 1 ? "s" : ""} atribuída{count !== 1 ? "s" : ""}</p>

                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1 gap-1.5 text-xs" onClick={() => setResetTarget(user)}>
                      <KeyRound className="size-3.5" /> Resetar senha
                    </Button>
                    {user.id !== me?.id && (
                      <Button
                        size="sm"
                        variant="outline"
                        className={cn("gap-1.5 text-xs", user.isAdmin && "text-destructive")}
                        onClick={() => toggleAdmin(user)}
                      >
                        {user.isAdmin ? <Shield className="size-3.5" /> : <ShieldCheck className="size-3.5" />}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Novo usuário */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Novo usuário</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Nome</label>
              <Input value={createForm.name} onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))} autoFocus />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">E-mail</label>
              <Input type="email" value={createForm.email} onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Senha inicial</label>
              <Input type="text" value={createForm.password} onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))} placeholder="6+ caracteres" />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={createForm.isAdmin} onChange={e => setCreateForm(f => ({ ...f, isAdmin: e.target.checked }))} />
              Esta conta é administradora
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? <Loader2 className="size-4 animate-spin" /> : "Criar usuário"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resetar senha */}
      <Dialog open={!!resetTarget} onOpenChange={v => { if (!v) { setResetTarget(null); setResetPassword("") } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Resetar senha de {resetTarget?.name}</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">Nova senha</label>
            <Input type="text" value={resetPassword} onChange={e => setResetPassword(e.target.value)} placeholder="6+ caracteres" autoFocus />
            <p className="text-xs text-muted-foreground">Repasse essa senha pra pessoa por fora — ela não é enviada automaticamente.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetTarget(null)}>Cancelar</Button>
            <Button onClick={handleReset} disabled={resetting}>
              {resetting ? <Loader2 className="size-4 animate-spin" /> : "Redefinir senha"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
