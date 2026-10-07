import { useState, useEffect } from 'react'

function load(key, fallback) {
  try {
    const saved = JSON.parse(localStorage.getItem(key))
    return saved ?? fallback
  } catch {
    return fallback
  }
}

// useState that persists to localStorage (per browser, no accounts)
export default function useStoredState(key, fallback) {
  const [value, setValue] = useState(() => load(key, fallback))

  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* storage blocked */ }
  }, [key, value])

  return [value, setValue]
}
