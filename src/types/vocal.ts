export type VocalPlatform = "instagram" | "tiktok" | "youtube"

export interface VocalVideo {
  id: string
  title: string
  artist: string
  style: string
  platform: VocalPlatform
  url: string
  coverUrl: string
  tags: string[]
  notes: string
  mastery: number // 0-5
  createdAt: string
}

export interface VocalReference {
  id: string
  technique: string
  artist: string
  url: string
  notes: string
  createdAt: string
}

export interface ClassNote {
  id: string
  weekDate: string // yyyy-MM-dd
  content: string
  exercises: string
  songs: string
  createdAt: string
}

export type VocalSkillCategory = "registro" | "ornamento" | "efeito"

export interface VocalSkill {
  id: string
  category: VocalSkillCategory
  name: string
  mastery: number // 0-5
  notes: string
  createdAt: string
}

export interface VocalProfile {
  id: string
  vocalRange: string
  updatedAt: string
}

export const VOCAL_PLATFORM_CONFIG: Record<VocalPlatform, { label: string }> = {
  instagram: { label: "Instagram" },
  tiktok: { label: "TikTok" },
  youtube: { label: "YouTube" },
}

export const VOCAL_SKILL_CATEGORY_CONFIG: Record<VocalSkillCategory, { label: string }> = {
  registro: { label: "Registros e Ajustes Vocais" },
  ornamento: { label: "Ornamentos" },
  efeito: { label: "Efeitos Vocais e Texturas" },
}

// Seed usado quando lt_vocal_skills está vazia — habilidades listadas pelo usuário
export const VOCAL_SKILL_SEED: { category: VocalSkillCategory; name: string }[] = [
  // Registros e Ajustes Vocais (Mecanismos)
  { category: "registro", name: "Voz de Peito" },
  { category: "registro", name: "Voz Mista" },
  { category: "registro", name: "Voz de Cabeça" },
  { category: "registro", name: "Falsete" },
  { category: "registro", name: "Registro de Apito (Whistle)" },
  { category: "registro", name: "Vocal Break (Quebra Vocal Proposital)" },
  { category: "registro", name: "Twang" },
  { category: "registro", name: "Curbing" },
  { category: "registro", name: "Overdrive" },

  // Ornamentos
  { category: "ornamento", name: "Melisma" },
  { category: "ornamento", name: "Riff" },
  { category: "ornamento", name: "Run" },
  { category: "ornamento", name: "Mordente" },
  { category: "ornamento", name: "Apogiatura" },
  { category: "ornamento", name: "Trinado" },
  { category: "ornamento", name: "Grupeto" },
  { category: "ornamento", name: "Glissando" },
  { category: "ornamento", name: "Portamento" },
  { category: "ornamento", name: "Escala Pentatônica" },
  { category: "ornamento", name: "Escala de Blues" },
  { category: "ornamento", name: "Arpejo" },
  { category: "ornamento", name: "Nota de Passagem" },
  { category: "ornamento", name: "Floreio" },
  { category: "ornamento", name: "Bordadura" },

  // Efeitos Vocais e Texturas (Dinâmica e Timbre)
  { category: "efeito", name: "Drive" },
  { category: "efeito", name: "Growl" },
  { category: "efeito", name: "Grunt" },
  { category: "efeito", name: "Vocal Fry" },
  { category: "efeito", name: "Voz Sussurrada (Whisper)" },
  { category: "efeito", name: "Belting" },
  { category: "efeito", name: "Voz Soprosa" },
  { category: "efeito", name: "Crepitação" },
  { category: "efeito", name: "Distorção Harmônica" },
  { category: "efeito", name: "Yodel" },
  { category: "efeito", name: "Soluço Vocal" },
  { category: "efeito", name: "Vibrato Laríngeo" },
  { category: "efeito", name: "Vibrato Diafragmático" },
]
