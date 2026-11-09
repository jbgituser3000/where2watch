// All TMDB requests go through our own /api/tmdb proxy, which holds the API
// token on the server (see api/tmdb.js). Nothing secret ships to the browser.
function tmdb(path, params = {}) {
  const q = new URLSearchParams({ path, ...params })
  return fetch(`/api/tmdb?${q}`)
}

// Search movies and TV shows simultaneously
export async function searchMulti(query) {
  const res = await tmdb('search/multi', { query })
  const data = await res.json()
  // exclude "person" results (actors/directors), only keep movies and shows
  return (data.results || []).filter(r => r.media_type === 'movie' || r.media_type === 'tv')
}

// Get streaming availability for every country
export async function getWatchProviders(id, mediaType) {
  const res = await tmdb(`${mediaType}/${id}/watch/providers`)
  const data = await res.json()
  return data.results || {}
}

// Every streaming service TMDB knows about (movie + TV lists, deduped by id)
export async function getProviderList() {
  const lists = await Promise.all(['movie', 'tv'].map(async type => {
    const res = await tmdb(`watch/providers/${type}`, { language: 'en-US' })
    const data = await res.json()
    return data.results || []
  }))
  const byId = new Map()
  for (const p of lists.flat()) if (!byId.has(p.provider_id)) byId.set(p.provider_id, p)
  return [...byId.values()]
}

// Bump to refetch cached details (v1 cached rate-limit errors as empty details)
export const DETAILS_VERSION = 2

// Genres, runtime and rating for one title (used by the watchlist filters)
export async function getDetails(id, mediaType) {
  const res = await tmdb(`${mediaType}/${id}`, { language: 'en-US' })
  if (!res.ok) throw new Error(`TMDB ${res.status}`) // e.g. 429 when rate limited — don't cache as empty
  const d = await res.json()
  return {
    v: DETAILS_VERSION,
    genres: (d.genres || []).map(g => g.name),
    // shows: length of an episode
    runtime: d.runtime || d.episode_run_time?.[0] || d.last_episode_to_air?.runtime || null,
    rating: d.vote_count ? d.vote_average : null,
  }
}
