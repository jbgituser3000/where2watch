import { supabase } from './lib/supabase'

// Which localStorage keys follow the viewer's account, and their column in public.user_data
const SYNCED = {
  'where2watch:watchlist': 'watchlist',
  'where2watch:services': 'services',
}
export const STORAGE_EVENT = 'where2watch:synced'

const watchKey = i => `${i.media_type}:${i.id}`
const MERGE = {
  watchlist: watchKey,
  services: s => s.key,
}

let userId = null
let ready = false // don't push until we've pulled, or an empty device could wipe the account
let pushTimer = null
let dirty = false // local edits not yet pushed
let freshLogin = false

// Called by the log-in / sign-up form. Only then do we merge this device's saved
// titles into the account; a restored session just takes the account's copy.
// (Supabase also reports restored sessions as SIGNED_IN, so the event alone can't tell.)
export function markFreshLogin() { freshLogin = true }

const readLocal = key => { try { const v = JSON.parse(localStorage.getItem(key)); return Array.isArray(v) ? v : [] } catch { return [] } }
function writeLocal(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* storage blocked */ }
  window.dispatchEvent(new CustomEvent(STORAGE_EVENT, { detail: key }))
}

function union(a, b, idOf) {
  const seen = new Set(a.map(idOf))
  return [...a, ...b.filter(x => !seen.has(idOf(x)))]
}

async function push() {
  if (!supabase || !userId || !ready) return
  dirty = false
  const row = { user_id: userId, updated_at: new Date().toISOString() }
  for (const [key, col] of Object.entries(SYNCED)) row[col] = readLocal(key)
  const { error } = await supabase.from('user_data').upsert(row)
  if (error) { dirty = true; console.warn('where2watch: sync failed', error.message) }
}

export function localChanged(key) {
  if (!(key in SYNCED) || !userId || !ready) return
  dirty = true
  clearTimeout(pushTimer)
  pushTimer = setTimeout(push, 800)
}

// merge=true on a fresh sign-in (keep what this device saved while signed out);
// false on a restored session or refocus, so removals on other devices carry over
async function pull(merge) {
  const id = userId
  const { data, error } = await supabase.from('user_data').select('watchlist, services').eq('user_id', id).maybeSingle()
  if (error || id !== userId) return
  for (const [key, col] of Object.entries(SYNCED)) {
    const local = readLocal(key)
    const cloud = Array.isArray(data?.[col]) ? data[col] : null
    const next = !cloud ? local : merge ? union(cloud, local, MERGE[col]) : cloud
    if (JSON.stringify(next) !== JSON.stringify(local)) writeLocal(key, next)
  }
  ready = true
  if (!data || merge) push()
}

if (supabase) {
  supabase.auth.onAuthStateChange((event, session) => {
    const nextId = session?.user?.id ?? null
    if (event === 'SIGNED_OUT') {
      userId = null
      ready = false
      clearTimeout(pushTimer)
      dirty = false
      // the list lives in the account now; don't leave it on a possibly shared device
      for (const key of Object.keys(SYNCED)) writeLocal(key, [])
      writeLocal('where2watch:alerts', [])
      writeLocal('where2watch:availability', {})
      return
    }
    if (!nextId || nextId === userId) return
    userId = nextId
    ready = false
    // defer: Supabase recommends not awaiting other calls inside this callback
    const merge = freshLogin
    freshLogin = false
    setTimeout(() => pull(merge), 0)
  })

  // bring in changes made on another device when the viewer comes back to this tab
  document.addEventListener('visibilitychange', () => {
    if (!userId || !ready) return
    if (document.visibilityState === 'hidden' && dirty) { clearTimeout(pushTimer); push() }
    else if (document.visibilityState === 'visible' && !dirty) pull(false)
  })
}
