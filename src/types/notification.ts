export type NotificationType = "project_invite"
export type NotificationStatus = "pending" | "accepted" | "dismissed"

export interface AppNotification {
  id: string
  recipientId: string
  actorId: string | null
  type: NotificationType
  projectId: string | null
  taskId: string | null
  status: NotificationStatus
  createdAt: string
}
