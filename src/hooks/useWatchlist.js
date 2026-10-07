import { useState, useEffect } from 'react'

const STORAGE_KEY = 'where2watch:watchlist'

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
    return Array.isArray(saved) ? saved : []
  } catch {
    return []
  }
}

// Same TMDB id can be both a movie and a show, so key on both
const keyOf = item => `${item.media_type}:${item.id}`

// Watchlist saved in the browser — no accounts, persists per device
export default function useWatchlist() {
  const [items, setItems] = useState(load)

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)) } catch { /* storage blocked */ }
  }, [items])

  const has = item => items.some(i => keyOf(i) === keyOf(item))

  function toggle(item) {
    if (has(item)) {
      setItems(prev => prev.filter(i => keyOf(i) !== keyOf(item)))
    } else {
      // keep only what the cards + detail view need
      const { id, media_type, title, name, poster_path, release_date, first_air_date, overview } = item
      setItems(prev => [{ id, media_type, title, name, poster_path, release_date, first_air_date, overview }, ...prev])
    }
  }

  return { items, has, toggle }
}
