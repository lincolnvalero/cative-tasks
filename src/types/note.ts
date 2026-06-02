export type NoteColor = "default" | "yellow" | "blue" | "green" | "pink" | "purple" | "orange"

export const NOTE_COLORS: Record<NoteColor, { bg: string; border: string; label: string }> = {
  default: { bg: "bg-card",              border: "border-border",        label: "Padrão" },
  yellow:  { bg: "bg-yellow-50 dark:bg-yellow-950/30",  border: "border-yellow-200 dark:border-yellow-800",  label: "Amarelo" },
  blue:    { bg: "bg-blue-50 dark:bg-blue-950/30",      border: "border-blue-200 dark:border-blue-800",      label: "Azul" },
  green:   { bg: "bg-green-50 dark:bg-green-950/30",    border: "border-green-200 dark:border-green-800",    label: "Verde" },
  pink:    { bg: "bg-pink-50 dark:bg-pink-950/30",      border: "border-pink-200 dark:border-pink-800",      label: "Rosa" },
  purple:  { bg: "bg-purple-50 dark:bg-purple-950/30",  border: "border-purple-200 dark:border-purple-800",  label: "Roxo" },
  orange:  { bg: "bg-orange-50 dark:bg-orange-950/30",  border: "border-orange-200 dark:border-orange-800",  label: "Laranja" },
}

export interface Note {
  id: string
  title: string
  content: string
  color: NoteColor
  pinned: boolean
  createdAt: string
  updatedAt: string
}

export const NOTE_TEMPLATES = [
  { icon: "📋", label: "Pauta de reunião",   content: "# Pauta\n\n## Participantes\n- \n\n## Tópicos\n1. \n2. \n3. \n\n## Decisões\n- \n\n## Próximos passos\n- " },
  { icon: "💡", label: "Brainstorm",         content: "# 💡 Ideias\n\n- \n- \n- \n- \n- " },
  { icon: "✅", label: "Lista rápida",        content: "- [ ] \n- [ ] \n- [ ] \n- [ ] " },
  { icon: "📞", label: "Notas de ligação",   content: "**Com:** \n**Data:** \n\n**Pontos discutidos:**\n- \n\n**Ações:**\n- " },
]
