export type InboxPlatform = "instagram" | "tiktok" | "youtube"
export type InboxStatus = "pending" | "discussing" | "promoted" | "dismissed"

export interface InboxChatMessage {
  role: "user" | "model"
  text: string
}

export interface InboxItem {
  id: string
  platform: InboxPlatform
  url: string
  caption: string
  transcript: string | null
  suggestedProjectId: string | null
  status: InboxStatus
  chatHistory: InboxChatMessage[]
  createdAt: string
}

export const INBOX_PLATFORM_CONFIG: Record<InboxPlatform, { label: string }> = {
  instagram: { label: "Instagram" },
  tiktok: { label: "TikTok" },
  youtube: { label: "YouTube" },
}

export const INBOX_STATUS_CONFIG: Record<InboxStatus, { label: string }> = {
  pending: { label: "Pendente" },
  discussing: { label: "Em discussão" },
  promoted: { label: "Virou tarefa" },
  dismissed: { label: "Dispensado" },
}
