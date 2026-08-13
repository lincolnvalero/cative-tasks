export type Role = "admin" | "editor" | "viewer"

export const ROLE_CONFIG: Record<Role, { label: string; color: string }> = {
  admin:  { label: "Admin",     color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  editor: { label: "Editor",    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  viewer: { label: "Visualizador", color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" },
}

export function getMemberMeta(id: string): { role: Role; active: boolean } {
  try {
    const raw = localStorage.getItem(`lincoln-member-${id}`)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return { role: "editor", active: true }
}

export function setMemberMeta(id: string, meta: { role: Role; active: boolean }) {
  localStorage.setItem(`lincoln-member-${id}`, JSON.stringify(meta))
}

const CURRENT_MEMBER_KEY = "lincoln-current-member-id"

export function getCurrentMemberId(): string | null {
  return localStorage.getItem(CURRENT_MEMBER_KEY)
}

export function setCurrentMemberId(id: string | null) {
  if (id) localStorage.setItem(CURRENT_MEMBER_KEY, id)
  else localStorage.removeItem(CURRENT_MEMBER_KEY)
}
