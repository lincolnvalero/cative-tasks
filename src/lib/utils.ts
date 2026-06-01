import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { differenceInDays, parseISO } from "date-fns"
import type { Task } from "@/types/task"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function isTaskStale(task: Task): boolean {
  if (task.status === "done" || task.status === "todo") return false
  const lastActivity = task.activity?.[task.activity.length - 1]
  if (!lastActivity) return false
  return differenceInDays(new Date(), parseISO(lastActivity.createdAt)) > 5
}
