import { useState } from 'react'

export const NO_FILTERS = { type: 'all', length: 'any', genre: '', decade: '', mine: false, topRated: false }

const LENGTHS = [
  { id: 'any', label: 'Any length' },
  { id: 'short', label: 'Under 90 min', test: m => m < 90 },
  { id: 'mid', label: '90 min – 2 hrs', test: m => m >= 90 && m <= 120 },
  { id: 'long', label: 'Over 2 hrs', test: m => m > 120 },
]

const yearOf = item => Number((item.release_date || item.first_air_date || '').slice(0, 4)) || null
const decadeOf = item => { const y = yearOf(item); return y ? Math.floor(y / 10) * 10 : null }

// Does this watchlist title pass every active filter?
export function matches(item, f, details, mineFor) {
  if (f.type !== 'all' && item.media_type !== f.type) return false
  if (f.decade && decadeOf(item) !== Number(f.decade)) return false
  if (f.mine && !mineFor(item).length) return false
  if (f.length !== 'any' || f.genre || f.topRated) {
    if (!details) return false // details still loading
    const len = LENGTHS.find(l => l.id === f.length)
    if (len.test && !(details.runtime && len.test(details.runtime))) return false
    if (f.genre && !details.genres.includes(f.genre)) return false
    if (f.topRated && !(details.rating >= 7)) return false
  }
  return true
}

function Chip({ on, onClick, children }) {
  return <button type="button" className={`filter-chip${on ? ' on' : ''}`} onClick={onClick}>{children}</button>
}

export default function WatchlistFilters({ items, filters, setFilters, getDetails, hasServices, shown, onSurprise }) {
  const [open, setOpen] = useState(true)
  const set = patch => setFilters(f => ({ ...f, ...patch }))
  const active = Object.keys(NO_FILTERS).filter(k => filters[k] !== NO_FILTERS[k]).length

  // only offer genres and decades that are actually on the list
  const genres = [...new Set(items.flatMap(i => getDetails(i)?.genres || []))].sort()
  const decades = [...new Set(items.map(decadeOf).filter(Boolean))].sort((a, b) => b - a)

  return (
    <div className="filters">
      <div className="filters-top">
        <button type="button" className="filters-toggle" onClick={() => setOpen(o => !o)}>
          {open ? '▾' : '▸'} What should I watch?
          {active > 0 && <span className="nav-count">{active}</span>}
        </button>
        <span className="filters-count">{shown} of {items.length}</span>
        {active > 0 && <button type="button" className="link-btn" onClick={() => setFilters(NO_FILTERS)}>Clear</button>}
        <button type="button" className="surprise-btn" onClick={onSurprise} disabled={!shown}>🎲 Surprise me</button>
      </div>

      {open && (
        <div className="filters-body">
          <div className="filter-row">
            <Chip on={filters.type === 'all'} onClick={() => set({ type: 'all' })}>All</Chip>
            <Chip on={filters.type === 'movie'} onClick={() => set({ type: 'movie' })}>Movies</Chip>
            <Chip on={filters.type === 'tv'} onClick={() => set({ type: 'tv' })}>Shows</Chip>
          </div>
          <div className="filter-row">
            {LENGTHS.map(l => (
              <Chip key={l.id} on={filters.length === l.id} onClick={() => set({ length: l.id })}>{l.label}</Chip>
            ))}
          </div>
          <div className="filter-row">
            <select className="filter-select" value={filters.genre} onChange={e => set({ genre: e.target.value })}>
              <option value="">Any genre</option>
              {genres.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
            <select className="filter-select" value={filters.decade} onChange={e => set({ decade: e.target.value })}>
              <option value="">Any decade</option>
              {decades.map(d => <option key={d} value={d}>{d}s</option>)}
            </select>
            <Chip on={filters.topRated} onClick={() => set({ topRated: !filters.topRated })}>★ Rated 7+</Chip>
            {hasServices && (
              <Chip on={filters.mine} onClick={() => set({ mine: !filters.mine })}>On my services</Chip>
            )}
          </div>
          {filters.length !== 'any' && filters.type !== 'movie' && (
            <p className="hint">For shows, length means one episode.</p>
          )}
        </div>
      )}
    </div>
  )
}
