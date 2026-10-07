import { useEffect, useRef } from 'react'
import useStoredState from './useStoredState'
import { keyOf } from './useWatchlist'
import { getDetails, DETAILS_VERSION } from '../api/tmdb'

const CONCURRENCY = 4 // TMDB rate-limits bursts, and a long watchlist would fire 100+ requests at once
const RETRIES = 3

const sleep = ms => new Promise(r => setTimeout(r, ms))

async function fetchWithRetry(item) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await getDetails(item.id, item.media_type)
    } catch (e) {
      if (attempt >= RETRIES) throw e
      await sleep(1000 * 2 ** attempt)
    }
  }
}

// Genres/runtime/rating for each watchlist title, fetched once and cached in the browser
export default function useTitleDetails(items) {
  const [stored, setDetails] = useStoredState('where2watch:details', {})
  const details = stored && typeof stored === 'object' ? stored : {}
  const cached = item => details[keyOf(item)]?.v === DETAILS_VERSION ? details[keyOf(item)] : undefined
  const pending = useRef(new Set())

  useEffect(() => {
    const queue = items.filter(i => !cached(i) && !pending.current.has(keyOf(i)))
    queue.forEach(i => pending.current.add(keyOf(i)))

    async function worker() {
      for (let item; (item = queue.shift());) {
        const key = keyOf(item)
        try {
          const d = await fetchWithRetry(item)
          setDetails(prev => ({ ...prev, [key]: d }))
        } catch { /* gave up for now; tried again next time the list changes */ }
        pending.current.delete(key)
      }
    }
    for (let i = 0; i < Math.min(CONCURRENCY, queue.length); i++) worker()
  }, [items]) // eslint-disable-line react-hooks/exhaustive-deps

  const loading = items.some(i => !cached(i))
  return { get: cached, loading }
}
