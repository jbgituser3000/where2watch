// Server-side TMDB proxy (Vercel function). The API token lives only in the
// server environment, never in the browser bundle.
//
// Only the handful of read-only requests the site makes are allowed, so this
// can't be used as an open relay into TMDB under our token.
const TMDB = 'https://api.themoviedb.org/3'

const ALLOWED = [
  /^search\/multi$/,
  /^(movie|tv)\/\d{1,9}$/,
  /^(movie|tv)\/\d{1,9}\/watch\/providers$/,
  /^watch\/providers\/(movie|tv)$/,
]

// Query params we pass through (everything else is dropped)
const PARAMS = { query: s => s.slice(0, 200), language: s => (/^[a-z]{2}(-[A-Z]{2})?$/.test(s) ? s : 'en-US'), page: s => String(Math.min(50, Math.max(1, parseInt(s, 10) || 1))) }

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.statusCode = 405
    res.setHeader('Allow', 'GET')
    return res.end('Method not allowed')
  }

  const url = new URL(req.url, 'http://local')
  const path = url.searchParams.get('path') || ''
  if (!ALLOWED.some(re => re.test(path))) {
    res.statusCode = 400
    return res.end('Unsupported request')
  }

  const token = process.env.TMDB_TOKEN || process.env.VITE_TMDB_TOKEN
  if (!token) {
    res.statusCode = 500
    return res.end('TMDB is not configured')
  }

  const out = new URLSearchParams()
  for (const [k, clean] of Object.entries(PARAMS)) {
    const v = url.searchParams.get(k)
    if (v != null) out.set(k, clean(v))
  }
  if (path === 'search/multi') out.set('include_adult', 'false')

  try {
    const upstream = await fetch(`${TMDB}/${path}?${out}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    })
    const body = await upstream.text()
    res.statusCode = upstream.status
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    // Let Vercel's edge cache successful lookups so repeat searches don't hit TMDB
    res.setHeader('Cache-Control', upstream.ok
      ? (path === 'search/multi' ? 'public, s-maxage=600, stale-while-revalidate=3600' : 'public, s-maxage=3600, stale-while-revalidate=86400')
      : 'no-store')
    res.end(body)
  } catch {
    res.statusCode = 502
    res.end('{"error":"TMDB unavailable"}')
  }
}
