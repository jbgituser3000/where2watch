import { useState, useEffect } from 'react'
import { getProviderList } from '../api/tmdb'
import { groupServices } from '../services'

const LOGO_BASE = 'https://image.tmdb.org/t/p/w92'
const POPULAR_COUNT = 30

export default function ServicesPicker({ myServices, onClose }) {
  const [all, setAll] = useState(null)
  const [failed, setFailed] = useState(false)
  const [filter, setFilter] = useState('')

  useEffect(() => {
    getProviderList().then(list => setAll(groupServices(list))).catch(() => setFailed(true))
  }, [])

  // Esc closes
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const f = filter.trim().toLowerCase()
  const shown = all
    ? (f ? all.filter(s => s.name.toLowerCase().includes(f)) : all.slice(0, POPULAR_COUNT)).slice(0, 60)
    : []
  // keep picked services visible even when they aren't in the popular list
  const extras = !f ? myServices.services.filter(s => !shown.some(x => x.key === s.key)) : []

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal" onMouseDown={e => e.stopPropagation()} role="dialog" aria-label="Your streaming services">
        <div className="modal-head">
          <div>
            <h2 className="section-title">Your streaming services</h2>
            <p className="hint">Pick the ones you pay for. They'll be highlighted on every title, and your watchlist will tell you when something lands on them.</p>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <input
          className="search-input picker-filter"
          placeholder="Find a service..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
          autoFocus
        />

        {failed && <p className="error">Couldn't load the list of services. Try again in a moment.</p>}
        {!all && !failed && <p className="status-msg">Loading services...</p>}

        <div className="picker-grid">
          {[...extras, ...shown].map(s => {
            const on = myServices.keys.has(s.key)
            return (
              <button key={s.key} className={`picker-item${on ? ' on' : ''}`} onClick={() => myServices.toggle(s)} aria-pressed={on}>
                {s.logo_path ? <img src={`${LOGO_BASE}${s.logo_path}`} alt="" /> : <span className="picker-no-logo" />}
                <span className="picker-name">{s.name}</span>
                <span className="picker-check">{on ? '✓' : '+'}</span>
              </button>
            )
          })}
          {all && f && shown.length === 0 && <p className="empty-state">No service called "{filter}"</p>}
        </div>

        <div className="modal-foot">
          <span className="hint">{myServices.services.length ? `${myServices.services.length} selected` : 'None selected yet'}</span>
          <button className="search-btn" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  )
}
