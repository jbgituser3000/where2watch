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
