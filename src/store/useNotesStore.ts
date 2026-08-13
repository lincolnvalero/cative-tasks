import { useState, useEffect } from "react"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
import type { Note, NoteColor } from "@/types/note"

function mapNote(row: Record<string, unknown>): Note {
  return {
    id: row.id as string,
    title: row.title as string,
    content: row.content as string,
    color: row.color as NoteColor,
    pinned: row.pinned as boolean,
    tags: (row.tags as string[]) ?? [],
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

export function useNotesStore() {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const { data } = await supabase.from("lt_notes").select("*").order("pinned", { ascending: false }).order("updated_at", { ascending: false })
        setNotes((data ?? []).map(mapNote))
      } finally { setLoading(false) }
    }
    load()
  }, [])

  async function createNote(template?: string, initialTags?: string[]): Promise<Note | undefined> {
    const { data, error } = await supabase.from("lt_notes").insert({
      title: "", content: template ?? "", color: "default", pinned: false, tags: initialTags ?? []
    }).select().single()
    if (error || !data) {
      toast.error("Erro ao criar nota")
      return
    }
    const note = mapNote(data)
    setNotes(prev => [note, ...prev])
    return note
  }

  async function updateNote(id: string, patch: Partial<Pick<Note, "title" | "content" | "color" | "pinned" | "tags">>): Promise<boolean> {
    const dbPatch: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (patch.title !== undefined) dbPatch.title = patch.title
    if (patch.content !== undefined) dbPatch.content = patch.content
    if (patch.color !== undefined) dbPatch.color = patch.color
    if (patch.pinned !== undefined) dbPatch.pinned = patch.pinned
    if (patch.tags !== undefined) dbPatch.tags = patch.tags
    const { error } = await supabase.from("lt_notes").update(dbPatch).eq("id", id)
    if (error) {
      toast.error("Erro ao salvar nota")
      return false
    }
    setNotes(prev => prev.map(n => n.id === id ? { ...n, ...patch, updatedAt: dbPatch.updated_at as string } : n))
    return true
  }

  async function deleteNote(id: string): Promise<boolean> {
    const { error } = await supabase.from("lt_notes").delete().eq("id", id)
    if (error) {
      toast.error("Erro ao excluir nota")
      return false
    }
    setNotes(prev => prev.filter(n => n.id !== id))
    return true
  }

  async function togglePin(id: string) {
    const note = notes.find(n => n.id === id)
    if (!note) return
    const ok = await updateNote(id, { pinned: !note.pinned })
    if (!ok) return
    setNotes(prev => {
      const updated = prev.map(n => n.id === id ? { ...n, pinned: !n.pinned } : n)
      return [...updated.filter(n => n.pinned), ...updated.filter(n => !n.pinned)]
    })
  }

  // All unique tags across notes
  const allTags = Array.from(new Set(notes.flatMap(n => n.tags))).sort()

  return { notes, loading, allTags, createNote, updateNote, deleteNote, togglePin }
}
