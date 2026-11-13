import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { markFreshLogin } from '../sync'

const site = () => window.location.origin

function friendly(error) {
  const m = error?.message || 'Something went wrong. Try again.'
  if (/invalid login/i.test(m)) return 'Wrong email or password.'
  if (/email not confirmed/i.test(m)) return 'Confirm your email first — check your inbox for the link.'
  if (/already registered/i.test(m)) return 'There\'s already an account with that email. Log in instead.'
  if (/rate limit|too many/i.test(m)) return 'Too many tries. Wait a minute and try again.'
  return m
}

// mode: 'login' | 'signup' | 'forgot' | 'reset' (reset = choosing a new password after the email link)
export default function AccountModal({ auth, onClose }) {
  const [mode, setMode] = useState(auth.recovering ? 'reset' : 'login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function switchTo(next) {
    setMode(next)
    setError(null)
    setNotice(null)
    setPassword('')
  }

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      if (mode === 'login' || mode === 'signup') markFreshLogin()
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        onClose()
      } else if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: site() } })
        if (error) throw error
        // Supabase hides whether an email is taken: an existing address comes back with no identities
        if (data.user && data.user.identities?.length === 0) throw new Error('already registered')
        if (data.session) onClose()
        else setNotice(`Almost done — we sent a confirmation link to ${email}. Click it to finish signing up.`)
      } else if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: site() })
        if (error) throw error
        setNotice(`If there's an account for ${email}, a reset link is on its way.`)
      } else if (mode === 'reset') {
        const { error } = await supabase.auth.updateUser({ password })
        if (error) throw error
        auth.doneRecovering()
        onClose()
      }
    } catch (err) {
      setError(friendly(err))
    } finally {
      setBusy(false)
    }
  }

  async function signOut() {
    setBusy(true)
    await supabase.auth.signOut()
    setBusy(false)
    onClose()
  }

  // ── Signed in ──
  if (auth.user && mode !== 'reset') {
    return (
      <div className="modal-backdrop" onMouseDown={onClose}>
        <div className="modal account-modal" onMouseDown={e => e.stopPropagation()} role="dialog" aria-label="Your account">
          <div className="modal-head">
            <div>
              <h2 className="section-title">Your account</h2>
              <p className="hint">Signed in as <strong className="account-email">{auth.user.email}</strong></p>
            </div>
            <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
          </div>
          <p className="hint">Your watchlist and streaming services are saved to your account, so they follow you to any device you log in on.</p>
          <div className="account-actions">
            <button className="nav-btn" onClick={() => switchTo('reset')}>Change password</button>
            <button className="nav-btn" onClick={signOut} disabled={busy}>Log out</button>
          </div>
        </div>
      </div>
    )
  }

  const titles = {
    login: 'Log in',
    signup: 'Create an account',
    forgot: 'Reset your password',
    reset: 'Choose a new password',
  }
  const blurbs = {
    login: 'Get your watchlist and services on every device.',
    signup: 'Free. Saves your watchlist and services so they follow you to any device.',
    forgot: 'Enter your email and we\'ll send you a link to set a new password.',
    reset: 'Pick a new password for your account.',
  }
  const buttons = { login: 'Log in', signup: 'Sign up', forgot: 'Send reset link', reset: 'Save password' }

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal account-modal" onMouseDown={e => e.stopPropagation()} role="dialog" aria-label={titles[mode]}>
        <div className="modal-head">
          <div>
            <h2 className="section-title">{titles[mode]}</h2>
            <p className="hint">{blurbs[mode]}</p>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        {(mode === 'login' || mode === 'signup') && (
          <div className="account-tabs" role="tablist">
            <button role="tab" aria-selected={mode === 'login'} className={mode === 'login' ? 'on' : ''} onClick={() => switchTo('login')}>Log in</button>
            <button role="tab" aria-selected={mode === 'signup'} className={mode === 'signup' ? 'on' : ''} onClick={() => switchTo('signup')}>Sign up</button>
          </div>
        )}

        <form className="account-form" onSubmit={submit}>
          {mode !== 'reset' && (
            <label>
              <span>Email</span>
              <input className="search-input" type="email" autoComplete="email" required autoFocus value={email} onChange={e => setEmail(e.target.value)} />
            </label>
          )}
          {mode !== 'forgot' && (
            <label>
              <span>{mode === 'reset' ? 'New password' : 'Password'}</span>
              <input
                className="search-input"
                type="password"
                required
                minLength={mode === 'login' ? undefined : 8}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                autoFocus={mode === 'reset'}
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
              {mode !== 'login' && <small className="hint">At least 8 characters.</small>}
            </label>
          )}

          {error && <p className="error account-msg">{error}</p>}
          {notice && <p className="account-notice account-msg">{notice}</p>}

          <button type="submit" className="search-btn" disabled={busy}>{busy ? '...' : buttons[mode]}</button>
        </form>

        <div className="account-links">
          {mode === 'login' && <button className="link-btn" onClick={() => switchTo('forgot')}>Forgot password?</button>}
          {mode === 'forgot' && <button className="link-btn" onClick={() => switchTo('login')}>← Back to log in</button>}
        </div>
      </div>
    </div>
  )
}
