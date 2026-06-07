import { create } from "zustand"
import { supabase } from "@/lib/supabase"
import type { Member } from "@/types/task"

const MEMBER_COLORS = [
  "#6366f1", "#f59e0b", "#10b981", "#3b82f6",
  "#ec4899", "#ef4444", "#8b5cf6", "#14b8a6",
]

function toInitials(name: string) {
  return name.trim().split(/\s+/).map(w => w[0]).join("").toUpperCase().slice(0, 2)
}

interface MembersState {
  members: Member[]
  loading: boolean
  fetchMembers: () => Promise<void>
  addMember: (name: string) => Promise<Member | undefined>
  removeMember: (id: string) => Promise<void>
}

export const useMembersStore = create<MembersState>((set, get) => ({
  members: [],
  loading: false,

  async fetchMembers() {
    set({ loading: true })
    const { data } = await supabase.from("ct_members").select("*").order("name")
    set({ members: (data as Member[]) ?? [], loading: false })
  },

  async addMember(name: string) {
    const trimmed = name.trim()
    if (!trimmed) return undefined
    const existing = get().members
    if (existing.some(m => m.name.toLowerCase() === trimmed.toLowerCase())) return undefined
    const color = MEMBER_COLORS[existing.length % MEMBER_COLORS.length]
    const initials = toInitials(trimmed)
    const { data, error } = await supabase
      .from("ct_members")
      .insert({ name: trimmed, color, initials })
      .select()
      .single()
    if (error) { console.error(error); return undefined }
    const member = data as Member
    set(s => ({ members: [...s.members, member].sort((a, b) => a.name.localeCompare(b.name)) }))
    return member
  },

  async removeMember(id: string) {
    await supabase.from("ct_members").delete().eq("id", id)
    set(s => ({ members: s.members.filter(m => m.id !== id) }))
  },
}))
