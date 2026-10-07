import { useState, useEffect, useRef } from 'react'

const LOGO_BASE = 'https://image.tmdb.org/t/p/w45'
const THUMB_BASE = 'https://image.tmdb.org/t/p/w92'

function timeAgo(ts) {
  const mins = Math.round((Date.now() - ts) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.round(hrs / 24)}d ago`
}

// Bell button + dropdown listing watchlist alerts
export default function AlertsPanel({ alerts, onOpenTitle }) {
  const [open, setOpen] = useState(false)
  const [fresh, setFresh] = useState(new Set()) // alerts that were new when the panel opened
  const [permission, setPermission] = useState(() => ('Notification' in window ? Notification.permission : 'unsupported'))
  const ref = useRef(null)

  // click outside or Esc closes
  useEffect(() => {
    if (!open) return
    const onDown = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    const onKey = e => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  function toggle() {
    if (!open) {
      // opening counts as seeing them; keep them highlighted until the panel closes
      setFresh(new Set(alerts.alerts.filter(a => !a.read).map(a => a.id)))
      alerts.markAllRead()
    }
    setOpen(o => !o)
  }

  async function enableDesktop() {
    try { setPermission(await Notification.requestPermission()) } catch { /* ignored */ }
  }

  return (
    <div className="alerts" ref={ref}>
      <button className={`nav-btn bell${open ? ' active' : ''}`} onClick={toggle} aria-label={`Alerts${alerts.unread ? ` (${alerts.unread} new)` : ''}`}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {alerts.unread > 0 && <span className="nav-count">{alerts.unread}</span>}
      </button>

      {open && (
        <div className="alerts-panel">
          <div className="alerts-head">
            <strong>Alerts</strong>
            {alerts.alerts.length > 0 && <button className="link-btn" onClick={alerts.clear}>Clear all</button>}
          </div>

          {alerts.alerts.length === 0 ? (
            <p className="alerts-empty">No alerts yet. When something on your watchlist starts streaming, goes free, or lands on one of your services, it shows up here.</p>
          ) : (
            <div className="alerts-list">
              {alerts.alerts.map(a => (
                <button key={a.id} className={`alert-item${fresh.has(a.id) ? ' unread' : ''}`} onClick={() => { setOpen(false); onOpenTitle(a.item) }}>
                  {a.item.poster_path
                    ? <img src={`${THUMB_BASE}${a.item.poster_path}`} alt="" className="suggestion-thumb" />
                    : <div className="suggestion-no-img" />}
                  <div className="alert-body">
                    <span className="alert-text">{a.text}</span>
                    <span className="alert-meta">
                      {a.logos.map(l => <img key={l} src={`${LOGO_BASE}${l}`} alt="" className="alert-logo" />)}
                      {timeAgo(a.createdAt)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {permission === 'default' && (
            <button className="desktop-btn" onClick={enableDesktop}>Also send desktop notifications</button>
          )}
          {permission === 'denied' && <p className="alerts-foot">Desktop notifications are blocked in your browser settings.</p>}
          <p className="alerts-foot">Watchlist titles are checked whenever where2watch is open.</p>
        </div>
      )}
    </div>
  )
}
