import useStoredState from './useStoredState'

// Same TMDB id can be both a movie and a show, so key on both
export const keyOf = item => `${item.media_type}:${item.id}`

// Watchlist saved in the browser — no accounts, persists per device
export default function useWatchlist() {
  const [stored, setItems] = useStoredState('where2watch:watchlist', [])
  const items = Array.isArray(stored) ? stored : []

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
