export interface ProjectFile {
  id: string
  projectId: string
  taskId: string | null
  name: string
  path: string
  size: number
  mimeType: string
  uploadedBy: string | null
  createdAt: string
}
