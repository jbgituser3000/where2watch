import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

// Current signed-in user (null when signed out), plus whether we're mid password-reset
export default function useAuth() {
  const [user, setUser] = useState(null)
  const [recovering, setRecovering] = useState(false)

  useEffect(() => {
    if (!supabase) return
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
      if (event === 'PASSWORD_RECOVERY') setRecovering(true)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  return {
    enabled: !!supabase,
    user,
    recovering,
    doneRecovering: () => setRecovering(false),
  }
}
