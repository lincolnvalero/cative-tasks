import type { Member } from "@/types/task"
import { cn } from "@/lib/utils"

interface Props {
  member: Member
  size?: "xs" | "sm" | "md"
  className?: string
}

const SIZE = {
  xs: "size-5 text-[9px]",
  sm: "size-6 text-[10px]",
  md: "size-8 text-xs",
}

export function MemberAvatar({ member, size = "sm", className }: Props) {
  return (
    <span
      className={cn("rounded-full flex items-center justify-center font-semibold text-white shrink-0", SIZE[size], className)}
      style={{ background: member.color }}
      title={member.name}
    >
      {member.initials}
    </span>
  )
}
