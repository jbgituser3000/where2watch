import { useEffect, useRef } from 'react'
import useStoredState from './useStoredState'
import { keyOf } from './useWatchlist'
import { getDetails } from '../api/tmdb'

// Genres/runtime/rating for each watchlist title, fetched once and cached in the browser
export default function useTitleDetails(items) {
  const [stored, setDetails] = useStoredState('where2watch:details', {})
  const details = stored && typeof stored === 'object' ? stored : {}
  const pending = useRef(new Set())

  useEffect(() => {
    const missing = items.filter(i => !details[keyOf(i)] && !pending.current.has(keyOf(i)))
    for (const item of missing) {
      const key = keyOf(item)
      pending.current.add(key)
      getDetails(item.id, item.media_type)
        .then(d => setDetails(prev => ({ ...prev, [key]: d })))
        .catch(() => { /* try again next time the list changes */ })
        .finally(() => pending.current.delete(key))
    }
  }, [items]) // eslint-disable-line react-hooks/exhaustive-deps

  const loading = items.some(i => !details[keyOf(i)])
  return { get: item => details[keyOf(item)], loading }
}
