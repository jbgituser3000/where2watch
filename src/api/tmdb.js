const BASE_URL = 'https://api.themoviedb.org/3'
const TOKEN = import.meta.env.VITE_TMDB_TOKEN

const headers = {
  Authorization: `Bearer ${TOKEN}`,
  'Content-Type': 'application/json',
}

// Search movies and TV shows simultaneously
export async function searchMulti(query) {
  const res = await fetch(
    `${BASE_URL}/search/multi?query=${encodeURIComponent(query)}&include_adult=false`,
    { headers }
  )
  const data = await res.json()
  // exclude "person" results (actors/directors), only keep movies and shows
  return (data.results || []).filter(r => r.media_type === 'movie' || r.media_type === 'tv')
}

// Get streaming availability for every country
export async function getWatchProviders(id, mediaType) {
  const res = await fetch(`${BASE_URL}/${mediaType}/${id}/watch/providers`, { headers })
  const data = await res.json()
  return data.results || {}
}

// Every streaming service TMDB knows about (movie + TV lists, deduped by id)
export async function getProviderList() {
  const lists = await Promise.all(['movie', 'tv'].map(async type => {
    const res = await fetch(`${BASE_URL}/watch/providers/${type}?language=en-US`, { headers })
    const data = await res.json()
    return data.results || []
  }))
  const byId = new Map()
  for (const p of lists.flat()) if (!byId.has(p.provider_id)) byId.set(p.provider_id, p)
  return [...byId.values()]
}

// Genres, runtime and rating for one title (used by the watchlist filters)
export async function getDetails(id, mediaType) {
  const res = await fetch(`${BASE_URL}/${mediaType}/${id}?language=en-US`, { headers })
  const d = await res.json()
  return {
    genres: (d.genres || []).map(g => g.name),
    // shows: length of an episode
    runtime: d.runtime || d.episode_run_time?.[0] || d.last_episode_to_air?.runtime || null,
    rating: d.vote_count ? d.vote_average : null,
  }
}
