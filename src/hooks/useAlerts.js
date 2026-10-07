import { useEffect, useRef } from 'react'
import useStoredState from './useStoredState'
import { keyOf } from './useWatchlist'
import { getWatchProviders } from '../api/tmdb'
import { streamingServices, isFreeAnywhere } from '../services'

const STALE_MS = 6 * 60 * 60 * 1000 // re-check each watchlist title every 6 hours
const RECHECK_MS = 30 * 60 * 1000   // while the site is open, look for stale titles every 30 min
const MAX_ALERTS = 50

const titleOf = item => item.title || item.name
const listNames = names => names.length <= 2 ? names.join(' and ') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`

function notifyDesktop(text, item) {
  try {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('where2watch', {
        body: text,
        icon: item.poster_path ? `https://image.tmdb.org/t/p/w92${item.poster_path}` : '/favicon.svg',
      })
    }
  } catch { /* some browsers only allow notifications from a service worker */ }
}

// Watches the watchlist for titles that start streaming, go free, or land on one of the
// viewer's services. Runs only while the site is open — there's no server to check in the background.
export default function useAlerts(items, myKeys) {
  const [snapshots, setSnapshots] = useStoredState('where2watch:availability', {})
  const [alerts, setAlerts] = useStoredState('where2watch:alerts', [])
  const snapsRef = useRef(snapshots)
  const myKeysRef = useRef(myKeys)
  myKeysRef.current = myKeys

  function pushAlert(item, text, services) {
    const alert = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      item,
      text,
      logos: services.map(s => s.logo_path).filter(Boolean).slice(0, 4),
      createdAt: Date.now(),
      read: false,
    }
    setAlerts(prev => [alert, ...(Array.isArray(prev) ? prev : [])].slice(0, MAX_ALERTS))
    notifyDesktop(text, item)
  }

  function saveSnapshot(key, snap) {
    snapsRef.current = { ...snapsRef.current, [key]: snap }
    setSnapshots(snapsRef.current)
  }

  // Compare fresh availability with what we saw last time
  function record(item, fresh) {
    const key = keyOf(item)
    const prev = snapsRef.current[key]
    const mine = fresh.keys.filter(k => myKeysRef.current.has(k))
    saveSnapshot(key, { ...fresh, notifiedMine: mine })
    if (!prev) return // first look at this title: badges show what's already there, no alert

    const newMine = mine.filter(k => !prev.notifiedMine?.includes(k))
    if (newMine.length) {
      const services = newMine.map(k => fresh.services[k])
      pushAlert(item, `${titleOf(item)} is now streaming on ${listNames(services.map(s => s.name))}`, services)
    } else if (!prev.streamable && fresh.streamable) {
      const services = Object.values(fresh.services)
      pushAlert(item, `${titleOf(item)} is now streaming on ${listNames(services.slice(0, 3).map(s => s.name))}${services.length > 3 ? ' and more' : ''}`, services)
    }
    if (!prev.free && fresh.free) {
      pushAlert(item, `${titleOf(item)} is now free to watch with a VPN`, [])
    }
  }

  // Fetch availability for watchlist titles we haven't checked recently
  const itemsKey = items.map(keyOf).join(',')
  useEffect(() => {
    let cancelled = false
    async function run() {
      for (const item of items) {
        const snap = snapsRef.current[keyOf(item)]
        if (snap && Date.now() - snap.checkedAt < STALE_MS) continue
        try {
          const providers = await getWatchProviders(item.id, item.media_type)
          if (cancelled) return
          const found = streamingServices(providers)
          const services = Object.fromEntries([...found].map(([k, s]) => [k, { name: s.name, logo_path: s.logo_path, countries: s.countries.length }]))
          record(item, { keys: [...found.keys()], services, streamable: found.size > 0, free: isFreeAnywhere(providers), checkedAt: Date.now() })
        } catch { /* network hiccup — try again next round */ }
      }
    }
    run()
    const id = setInterval(run, RECHECK_MS)
    return () => { cancelled = true; clearInterval(id) }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-run only when the set of titles changes
  }, [itemsKey])

  // When the viewer adds a service, flag watchlist titles that are already on it
  const myKeysKey = [...myKeys].sort().join(',')
  useEffect(() => {
    for (const item of items) {
      const key = keyOf(item)
      const snap = snapsRef.current[key]
      if (!snap) continue
      const mine = snap.keys.filter(k => myKeys.has(k))
      const newMine = mine.filter(k => !snap.notifiedMine?.includes(k))
      if (mine.length !== (snap.notifiedMine || []).length || newMine.length) saveSnapshot(key, { ...snap, notifiedMine: mine })
      if (newMine.length) {
        const services = newMine.map(k => snap.services[k])
        pushAlert(item, `${titleOf(item)} is on ${listNames(services.map(s => s.name))}, one of your services`, services)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-run only when the chosen services change
  }, [myKeysKey])

  const list = Array.isArray(alerts) ? alerts : []

  return {
    alerts: list,
    unread: list.filter(a => !a.read).length,
    markAllRead: () => setAlerts(prev => prev.map(a => ({ ...a, read: true }))),
    clear: () => setAlerts([]),
    // the viewer's services a watchlist title streams on, from the last check
    mineFor: item => {
      const snap = snapshots[keyOf(item)]
      return snap ? snap.keys.filter(k => myKeys.has(k)).map(k => snap.services[k]) : []
    },
  }
}
