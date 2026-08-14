import { createClient } from "@supabase/supabase-js"
import { processLock } from "@supabase/auth-js"

const url = import.meta.env.VITE_SUPABASE_URL as string
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string

// processLock (em vez do padrão navigatorLock) evita que uma aba travada
// (ex: sessão presa em navigator.locks) prenda pra sempre a sessão de
// qualquer outra aba/janela aberta na mesma origem — cada aba passa a
// gerenciar seu próprio refresh de token de forma independente.
export const supabase = createClient(url, key, {
  auth: { lock: processLock },
})
