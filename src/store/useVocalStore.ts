import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import type {
  VocalVideo, VocalReference, ClassNote, VocalSkill, VocalProfile, VocalPlatform, VocalSkillCategory,
} from "@/types/vocal"
import { VOCAL_SKILL_SEED } from "@/types/vocal"

function mapVideo(row: Record<string, unknown>): VocalVideo {
  return {
    id: row.id as string,
    title: row.title as string,
    artist: (row.artist as string) ?? "",
    style: (row.style as string) ?? "",
    platform: row.platform as VocalPlatform,
    url: row.url as string,
    coverUrl: (row.cover_url as string) ?? "",
    tags: (row.tags as string[]) ?? [],
    notes: (row.notes as string) ?? "",
    mastery: (row.mastery as number) ?? 0,
    createdAt: row.created_at as string,
  }
}

function mapReference(row: Record<string, unknown>): VocalReference {
  return {
    id: row.id as string,
    technique: row.technique as string,
    artist: (row.artist as string) ?? "",
    url: (row.url as string) ?? "",
    notes: (row.notes as string) ?? "",
    createdAt: row.created_at as string,
  }
}

function mapClassNote(row: Record<string, unknown>): ClassNote {
  return {
    id: row.id as string,
    weekDate: row.week_date as string,
    content: (row.content as string) ?? "",
    exercises: (row.exercises as string) ?? "",
    songs: (row.songs as string) ?? "",
    createdAt: row.created_at as string,
  }
}

function mapSkill(row: Record<string, unknown>): VocalSkill {
  return {
    id: row.id as string,
    category: row.category as VocalSkillCategory,
    name: row.name as string,
    mastery: (row.mastery as number) ?? 0,
    notes: (row.notes as string) ?? "",
    createdAt: row.created_at as string,
  }
}

function mapProfile(row: Record<string, unknown>): VocalProfile {
  return {
    id: row.id as string,
    vocalRange: (row.vocal_range as string) ?? "",
    updatedAt: row.updated_at as string,
  }
}

export function useVocalStore() {
  const [videos, setVideos] = useState<VocalVideo[]>([])
  const [references, setReferences] = useState<VocalReference[]>([])
  const [classNotes, setClassNotes] = useState<ClassNote[]>([])
  const [skills, setSkills] = useState<VocalSkill[]>([])
  const [profile, setProfile] = useState<VocalProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadAll() {
      try {
        const [
          { data: videoRows },
          { data: refRows },
          { data: noteRows },
          { data: skillRows },
          { data: profileRows },
        ] = await Promise.all([
          supabase.from("lt_vocal_videos").select("*").order("created_at", { ascending: false }),
          supabase.from("lt_vocal_references").select("*").order("created_at", { ascending: false }),
          supabase.from("lt_vocal_class_notes").select("*").order("week_date", { ascending: false }),
          supabase.from("lt_vocal_skills").select("*").order("category").order("name"),
          supabase.from("lt_vocal_profile").select("*").limit(1),
        ])

        setVideos((videoRows ?? []).map(mapVideo))
        setReferences((refRows ?? []).map(mapReference))
        setClassNotes((noteRows ?? []).map(mapClassNote))

        if (!skillRows || skillRows.length === 0) {
          const { data: seeded } = await supabase
            .from("lt_vocal_skills")
            .insert(VOCAL_SKILL_SEED.map(s => ({ category: s.category, name: s.name, mastery: 0, notes: "" })))
            .select()
          setSkills((seeded ?? []).map(mapSkill))
        } else {
          setSkills(skillRows.map(mapSkill))
        }

        if (profileRows && profileRows.length > 0) {
          setProfile(mapProfile(profileRows[0]))
        } else {
          const { data: created } = await supabase.from("lt_vocal_profile").insert({ vocal_range: "" }).select().single()
          if (created) setProfile(mapProfile(created))
        }
      } finally {
        setLoading(false)
      }
    }
    loadAll()
  }, [])

  // ── Videos ─────────────────────────────────────────────────────────────────

  async function addVideo(data: Omit<VocalVideo, "id" | "createdAt">) {
    const { data: row, error } = await supabase.from("lt_vocal_videos").insert({
      title: data.title, artist: data.artist, style: data.style, platform: data.platform,
      url: data.url, cover_url: data.coverUrl, tags: data.tags, notes: data.notes, mastery: data.mastery,
    }).select().single()
    if (error || !row) return
    const video = mapVideo(row)
    setVideos(prev => [video, ...prev])
    return video
  }

  async function updateVideo(id: string, patch: Partial<Omit<VocalVideo, "id" | "createdAt">>) {
    const dbPatch: Record<string, unknown> = {}
    if (patch.title !== undefined) dbPatch.title = patch.title
    if (patch.artist !== undefined) dbPatch.artist = patch.artist
    if (patch.style !== undefined) dbPatch.style = patch.style
    if (patch.platform !== undefined) dbPatch.platform = patch.platform
    if (patch.url !== undefined) dbPatch.url = patch.url
    if (patch.coverUrl !== undefined) dbPatch.cover_url = patch.coverUrl
    if (patch.tags !== undefined) dbPatch.tags = patch.tags
    if (patch.notes !== undefined) dbPatch.notes = patch.notes
    if (patch.mastery !== undefined) dbPatch.mastery = patch.mastery
    const { error } = await supabase.from("lt_vocal_videos").update(dbPatch).eq("id", id)
    if (error) return
    setVideos(prev => prev.map(v => v.id === id ? { ...v, ...patch } : v))
  }

  async function deleteVideo(id: string) {
    const { error } = await supabase.from("lt_vocal_videos").delete().eq("id", id)
    if (error) return
    setVideos(prev => prev.filter(v => v.id !== id))
  }

  // ── References ─────────────────────────────────────────────────────────────

  async function addReference(data: Omit<VocalReference, "id" | "createdAt">) {
    const { data: row, error } = await supabase.from("lt_vocal_references").insert({
      technique: data.technique, artist: data.artist, url: data.url, notes: data.notes,
    }).select().single()
    if (error || !row) return
    const reference = mapReference(row)
    setReferences(prev => [reference, ...prev])
    return reference
  }

  async function updateReference(id: string, patch: Partial<Omit<VocalReference, "id" | "createdAt">>) {
    const { error } = await supabase.from("lt_vocal_references").update(patch).eq("id", id)
    if (error) return
    setReferences(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r))
  }

  async function deleteReference(id: string) {
    const { error } = await supabase.from("lt_vocal_references").delete().eq("id", id)
    if (error) return
    setReferences(prev => prev.filter(r => r.id !== id))
  }

  // ── Class notes ────────────────────────────────────────────────────────────

  async function addClassNote(data: Omit<ClassNote, "id" | "createdAt">) {
    const { data: row, error } = await supabase.from("lt_vocal_class_notes").insert({
      week_date: data.weekDate, content: data.content, exercises: data.exercises, songs: data.songs,
    }).select().single()
    if (error || !row) return
    const note = mapClassNote(row)
    setClassNotes(prev => [note, ...prev])
    return note
  }

  async function updateClassNote(id: string, patch: Partial<Omit<ClassNote, "id" | "createdAt">>) {
    const dbPatch: Record<string, unknown> = {}
    if (patch.weekDate !== undefined) dbPatch.week_date = patch.weekDate
    if (patch.content !== undefined) dbPatch.content = patch.content
    if (patch.exercises !== undefined) dbPatch.exercises = patch.exercises
    if (patch.songs !== undefined) dbPatch.songs = patch.songs
    const { error } = await supabase.from("lt_vocal_class_notes").update(dbPatch).eq("id", id)
    if (error) return
    setClassNotes(prev => prev.map(n => n.id === id ? { ...n, ...patch } : n))
  }

  async function deleteClassNote(id: string) {
    const { error } = await supabase.from("lt_vocal_class_notes").delete().eq("id", id)
    if (error) return
    setClassNotes(prev => prev.filter(n => n.id !== id))
  }

  // ── Skills ─────────────────────────────────────────────────────────────────

  async function updateSkillMastery(id: string, mastery: number) {
    const { error } = await supabase.from("lt_vocal_skills").update({ mastery }).eq("id", id)
    if (error) return
    setSkills(prev => prev.map(s => s.id === id ? { ...s, mastery } : s))
  }

  async function updateSkillNotes(id: string, notes: string) {
    const { error } = await supabase.from("lt_vocal_skills").update({ notes }).eq("id", id)
    if (error) return
    setSkills(prev => prev.map(s => s.id === id ? { ...s, notes } : s))
  }

  // ── Profile ────────────────────────────────────────────────────────────────

  async function updateVocalRange(vocalRange: string) {
    if (!profile) return
    const { error } = await supabase.from("lt_vocal_profile").update({ vocal_range: vocalRange, updated_at: new Date().toISOString() }).eq("id", profile.id)
    if (error) return
    setProfile(prev => prev ? { ...prev, vocalRange } : prev)
  }

  return {
    videos, references, classNotes, skills, profile, loading,
    addVideo, updateVideo, deleteVideo,
    addReference, updateReference, deleteReference,
    addClassNote, updateClassNote, deleteClassNote,
    updateSkillMastery, updateSkillNotes,
    updateVocalRange,
  }
}
