// TMDB lists the same service many ways ("Netflix basic with Ads", "Peacock Premium",
// "HBO Max" vs "Max"), so everything is matched on a normalized key. Amazon/Apple/Roku
// channel add-ons stay separate: they're billed separately, so having HBO Max doesn't get you them.
export function serviceKey(name) {
  let k = name.toLowerCase().replace(/\+/g, ' plus')
  if (k.startsWith('youtube premium')) return 'youtube premium'
  k = k
    .replace(/\b(with ads|premium plus|basic|standard|premium|essential|kids)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (k === 'hbo max') k = 'max'
  return k
}

// Rent/buy storefronts — they never count as "having" a service, so the picker hides them
const STOREFRONTS = new Set(['amazon video', 'apple tv store', 'google play movies', 'fandango at home', 'microsoft store', 'justwatch tv', 'vudu'])

// The big services go first: TMDB's own rankings are spotty (HBO Max is 151st in the US)
const MAJOR = ['netflix', 'amazon prime video', 'disney plus', 'max', 'hulu', 'apple tv', 'paramount plus', 'peacock', 'youtube premium', 'crunchyroll']

// Picker list: one entry per service, majors first, then by TMDB's US ranking, then everything else
export function groupServices(providerList) {
  const rank = p => {
    const major = MAJOR.indexOf(serviceKey(p.provider_name))
    if (major >= 0) return major
    const ranks = Object.values(p.display_priorities || {})
    return p.display_priorities?.US ?? 1000 + (ranks.length ? Math.min(...ranks) : 999)
  }
  const groups = new Map()
  for (const p of [...providerList].sort((a, b) => rank(a) - rank(b))) {
    const key = serviceKey(p.provider_name)
    if (STOREFRONTS.has(key)) continue
    if (/\b(amazon|apple tv|roku premium) channel\b/i.test(p.provider_name)) continue // add-ons like "HBO Max Amazon Channel"
    const current = groups.get(key)
    // label each group with its plainest name: "Peacock" over "Peacock Premium"
    if (!current || p.provider_name.length < current.name.length) {
      groups.set(key, { key, name: p.provider_name, logo_path: p.logo_path, order: current?.order ?? groups.size })
    }
  }
  return [...groups.values()].sort((a, b) => a.order - b.order).map(({ key, name, logo_path }) => ({ key, name, logo_path }))
}

// Ways to watch that count as "streaming" (not rent/buy)
const STREAM_TYPES = ['flatrate', 'free', 'ads']

// Every service a title streams on, across all countries: key -> { name, logo_path, countries }
export function streamingServices(providers) {
  const found = new Map()
  for (const [code, d] of Object.entries(providers || {})) {
    for (const type of STREAM_TYPES) {
      for (const s of d[type] || []) {
        const key = serviceKey(s.provider_name)
        if (!found.has(key)) found.set(key, { key, name: s.provider_name, logo_path: s.logo_path, countries: [] })
        const entry = found.get(key)
        if (!entry.countries.includes(code)) entry.countries.push(code)
      }
    }
  }
  return found
}

export const isFreeAnywhere = providers =>
  Object.values(providers || {}).some(d => d.free?.length || d.ads?.length)
