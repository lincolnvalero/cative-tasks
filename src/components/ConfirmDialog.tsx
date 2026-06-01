import { useState } from "react"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface ConfirmOptions {
  title: string
  description?: string
  confirmLabel?: string
  variant?: "default" | "destructive"
}

interface ConfirmState extends ConfirmOptions {
  open: boolean
  resolve: (value: boolean) => void
}

let _setState: ((s: ConfirmState | null) => void) | null = null

/** Use instead of window.confirm() — returns a Promise<boolean> */
export function showConfirm(opts: ConfirmOptions): Promise<boolean> {
  return new Promise(resolve => {
    _setState?.({ ...opts, open: true, resolve })
  })
}

/** Mount once inside App root */
export function ConfirmDialogProvider() {
  const [state, setState] = useState<ConfirmState | null>(null)
  _setState = setState

  function close(result: boolean) {
    state?.resolve(result)
    setState(null)
  }

  if (!state) return null

  return (
    <AlertDialog open={state.open} onOpenChange={open => !open && close(false)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{state.title}</AlertDialogTitle>
          {state.description && (
            <AlertDialogDescription>{state.description}</AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => close(false)}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => close(true)}
            className={cn(state.variant === "destructive" && buttonVariants({ variant: "destructive" }))}
          >
            {state.confirmLabel ?? "Confirmar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
