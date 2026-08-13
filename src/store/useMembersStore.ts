import { useState } from "react"
import { toast } from "sonner"
import type { Member } from "@/types/task"
import { supabase } from "@/lib/supabase"

export const MEMBER_COLORS = [
  "#3b82f6", "#10b981", "#ec4899", "#f59e0b", "#8b5cf6",
  "#ef4444", "#14b8a6", "#f97316", "#84cc16", "#6366f1",
]

const DEFAULT_MEMBERS: Member[] = [
  { id: "m1", name: "Lincoln", color: "#3b82f6", initials: "LI" },
  { id: "m2", name: "Gustavo", color: "#10b981", initials: "GU" },
  { id: "m3", name: "Ingrid",  color: "#ec4899", initials: "IN" },
]

function toInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function mapMember(row: Record<string, unknown>): Member {
  return {
    id: row.id as string,
    name: row.name as string,
    color: row.color as string,
    initials: row.initials as string,
  }
}

export function useMembersStore() {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(false)

  async function fetchMembers() {
    setLoading(true)
    try {
      const { data, error } = await supabase.from("lt_members").select("*").order("created_at")
      if (error || !data || data.length === 0) {
        setMembers(DEFAULT_MEMBERS)
        return
      }
      setMembers(data.map(mapMember))
    } finally {
      setLoading(false)
    }
  }

  async function addMember(name: string): Promise<Member | undefined> {
    const usedColors = members.map(m => m.color)
    const color = MEMBER_COLORS.find(c => !usedColors.includes(c)) ?? MEMBER_COLORS[members.length % MEMBER_COLORS.length]
    const initials = toInitials(name)

    const { data, error } = await supabase.from("lt_members").insert({ name, color, initials }).select().single()
    if (error || !data) {
      toast.error("Erro ao adicionar colaborador")
      return
    }
    const member = mapMember(data)
    setMembers(prev => [...prev, member])
    return member
  }

  async function removeMember(id: string): Promise<void> {
    // Membros padrão (Lincoln/Gustavo/Ingrid) só existem no estado local — nunca
    // foram salvos no banco, então não há nada pra deletar lá.
    if (DEFAULT_MEMBERS.some(m => m.id === id)) {
      setMembers(prev => prev.filter(m => m.id !== id))
      return
    }
    const { error } = await supabase.from("lt_members").delete().eq("id", id)
    if (error) {
      toast.error("Erro ao remover colaborador")
      return
    }
    setMembers(prev => prev.filter(m => m.id !== id))
  }

  async function updateMember(id: string, patch: Partial<Pick<Member, "name" | "color" | "initials">>): Promise<boolean> {
    const update: typeof patch = { ...patch }
    if (patch.name && !patch.initials) update.initials = toInitials(patch.name)

    // Editar um membro padrão promove ele pra um registro real no banco,
    // em vez de tentar atualizar uma linha que nunca existiu lá.
    if (DEFAULT_MEMBERS.some(m => m.id === id)) {
      const current = members.find(m => m.id === id)
      const { data, error } = await supabase.from("lt_members").insert({
        name: update.name ?? current?.name ?? "",
        color: update.color ?? current?.color ?? MEMBER_COLORS[0],
        initials: update.initials ?? current?.initials ?? "",
      }).select().single()
      if (error || !data) {
        toast.error("Erro ao atualizar colaborador")
        return false
      }
      const member = mapMember(data)
      setMembers(prev => prev.map(m => m.id === id ? member : m))
      return true
    }

    const { error } = await supabase.from("lt_members").update(update).eq("id", id)
    if (error) {
      toast.error("Erro ao atualizar colaborador")
      return false
    }
    setMembers(prev => prev.map(m => m.id === id ? { ...m, ...update } : m))
    return true
  }

  return { members, loading, fetchMembers, addMember, removeMember, updateMember }
}
