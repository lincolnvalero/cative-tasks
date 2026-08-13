import { useCallback, useState } from "react"
import { useApp } from "@/context/AppContext"
import { getCurrentMemberId, getMemberMeta, setCurrentMemberId as persistCurrentMemberId } from "@/lib/memberRole"

export function useCurrentMember() {
  const { members } = useApp()
  const [currentMemberId, setCurrentMemberIdState] = useState<string | null>(() => getCurrentMemberId())

  const setCurrentMemberId = useCallback((id: string | null) => {
    persistCurrentMemberId(id)
    setCurrentMemberIdState(id)
  }, [])

  const currentMember = members.find(m => m.id === currentMemberId) ?? null
  const isAdmin = currentMember ? getMemberMeta(currentMember.id).role === "admin" : false

  return { currentMemberId, currentMember, setCurrentMemberId, isAdmin }
}
