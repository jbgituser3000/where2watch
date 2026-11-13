import { useState, useEffect } from 'react'
import { localChanged, STORAGE_EVENT } from '../sync'

function load(key, fallback) {
  try {
    const saved = JSON.parse(localStorage.getItem(key))
    return saved ?? fallback
  } catch {
    return fallback
  }
}

// useState that persists to localStorage, and to the viewer's account when signed in (see sync.js)
export default function useStoredState(key, fallback) {
  const [value, setValue] = useState(() => load(key, fallback))

  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* storage blocked */ }
    localChanged(key)
  }, [key, value])

  // pick up values written by account sync
  useEffect(() => {
    const onSync = e => { if (e.detail === key) setValue(load(key, fallback)) }
    window.addEventListener(STORAGE_EVENT, onSync)
    return () => window.removeEventListener(STORAGE_EVENT, onSync)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fallback is a literal
  }, [key])

  return [value, setValue]
}
