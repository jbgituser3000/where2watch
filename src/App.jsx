import { useState, useEffect } from 'react'
import { searchMulti, getWatchProviders } from './api/tmdb'
import Globe from './components/Globe'
import ServicesPicker from './components/ServicesPicker'
import AlertsPanel from './components/AlertsPanel'
import useWatchlist from './hooks/useWatchlist'
import useMyServices from './hooks/useMyServices'
import useAlerts from './hooks/useAlerts'
import { streamingServices } from './services'
import './App.css'

const IMAGE_BASE = 'https://image.tmdb.org/t/p/w200'
const THUMB_BASE = 'https://image.tmdb.org/t/p/w92'
const LOGO_BASE = 'https://image.tmdb.org/t/p/w45'

function getCountryName(code) {
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(code)
  } catch {
    return code
  }
}

// Direct search URLs for each streaming service — avoids linking to JustWatch
function getServiceUrl(providerName, title) {
  const q = encodeURIComponent(title)
  const urls = {
    'Netflix':                    `https://www.netflix.com/search?q=${q}`,
    'Amazon Prime Video':         `https://www.amazon.com/s?k=${q}&i=instant-video`,
    'Amazon Video':               `https://www.amazon.com/s?k=${q}&i=instant-video`,
    'Disney Plus':                `https://www.disneyplus.com/search?q=${q}`,
    'Hulu':                       `https://www.hulu.com/search?q=${q}`,
    'Max':                        `https://play.max.com/search?q=${q}`,
    'HBO Max':                    `https://play.max.com/search?q=${q}`,
    'Tubi TV':                    `https://tubitv.com/search?q=${q}`,
    'Pluto TV':                   `https://pluto.tv/search#${q}`,
    'Peacock':                    `https://www.peacocktv.com/search?q=${q}`,
    'Peacock Premium':            `https://www.peacocktv.com/search?q=${q}`,
    'Paramount Plus':             `https://www.paramountplus.com/search/?q=${q}`,
    'Apple TV Plus':              `https://tv.apple.com/search?term=${q}`,
    'Apple TV':                   `https://tv.apple.com/search?term=${q}`,
    'Crunchyroll':                `https://www.crunchyroll.com/search?q=${q}`,
    'fuboTV':                     `https://www.fubo.tv/welcome/search?q=${q}`,
    'Shudder':                    `https://www.shudder.com/search?q=${q}`,
    'Mubi':                       `https://mubi.com/search/${q}`,
    'Plex':                       `https://watch.plex.tv/search?q=${q}`,
    'Kanopy':                     `https://www.kanopy.com/en/search?q=${q}`,
    'Hoopla':                     `https://www.hoopladigital.com/search?q=${q}`,
    'BritBox':                    `https://www.britbox.com/us/search?q=${q}`,
    'Criterion Channel':          `https://www.criterionchannel.com/search?q=${q}`,
    'MUBI':                       `https://mubi.com/search/${q}`,
  }
  return urls[providerName] || null
}

function PosterCard({ item, saved, mine = [], onSelect, onToggleSave }) {
  return (
    <div className="card-wrap">
      <button className={`result-card${mine.length ? ' on-mine' : ''}`} onClick={() => onSelect(item)}>
        <div className="poster-wrap">
          {item.poster_path
            ? <img src={`${IMAGE_BASE}${item.poster_path}`} alt={item.title || item.name} />
            : <div className="no-poster">No image</div>
          }
          {mine.length > 0 && (
            <span className="mine-badge" title={`On ${mine.map(s => s.name).join(', ')}`}>
              {mine.slice(0, 3).map(s => <img key={s.name} src={`${LOGO_BASE}${s.logo_path}`} alt="" />)}
              On your services
            </span>
          )}
        </div>
        <div className="result-info">
          <strong>{item.title || item.name}</strong>
          <span>
            {item.media_type === 'tv' ? 'TV Show' : 'Movie'}
            {(item.release_date || item.first_air_date) && ` · ${(item.release_date || item.first_air_date).slice(0, 4)}`}
          </span>
        </div>
      </button>
      <button
        className={`save-btn${saved ? ' saved' : ''}`}
        onClick={() => onToggleSave(item)}
        title={saved ? 'Remove from watchlist' : 'Add to watchlist'}
        aria-label={saved ? 'Remove from watchlist' : 'Add to watchlist'}
      >
        {saved ? '✓' : '+'}
      </button>
    </div>
  )
}

function ServiceLogos({ services, title, myServices }) {
  const anyMine = myServices.services.length > 0
  const sorted = anyMine ? [...services].sort((a, b) => myServices.has(b.provider_name) - myServices.has(a.provider_name)) : services
  return (
    <div className="service-logos">
      {sorted.map(s => {
        const mine = myServices.has(s.provider_name)
        const cls = anyMine ? (mine ? ' mine' : ' not-mine') : ''
        const url = getServiceUrl(s.provider_name, title)
        const logo = <img src={`${LOGO_BASE}${s.logo_path}`} alt={s.provider_name} title={mine ? `${s.provider_name} (you have this)` : s.provider_name} className="service-logo" />
        return url
          ? <a key={s.provider_id} href={url} target="_blank" rel="noopener noreferrer" className={`logo-link${cls}`}>{logo}</a>
          : <span key={s.provider_id} className={`logo-link${cls}`}>{logo}</span>
      })}
    </div>
  )
}

export default function App() {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [results, setResults] = useState([])
  const [selected, setSelected] = useState(null)
  const [providers, setProviders] = useState(null)
  const [searching, setSearching] = useState(false)
  const [loadingProviders, setLoadingProviders] = useState(false)
  const [error, setError] = useState(null)
  const [page, setPage] = useState('landing') // 'landing' | 'results' | 'watchlist'
  const [showPicker, setShowPicker] = useState(false)
  const watchlist = useWatchlist()
  const myServices = useMyServices()
  const alerts = useAlerts(watchlist.items, myServices.keys)

  // Debounced autocomplete
  useEffect(() => {
    if (!query.trim()) { setSuggestions([]); return }
    const t = setTimeout(async () => {
      try {
        const data = await searchMulti(query)
        setSuggestions(data.slice(0, 7))
      } catch { /* silent fail for autocomplete */ }
    }, 300)
    return () => clearTimeout(t)
  }, [query])

  async function handleSearch(e) {
    e.preventDefault()
    if (!query.trim()) return
    setShowSuggestions(false)
    setSearching(true)
    setSelected(null)
    setProviders(null)
    setError(null)
    setPage('results')
    try {
      const data = await searchMulti(query)
      setResults(data)
    } catch {
      setError('Search failed. Check your connection and try again.')
    }
    setSearching(false)
  }

  // from = 'watchlist' keeps the watchlist as the page to go back to
  async function handleSelect(item, from = page === 'watchlist' ? 'watchlist' : 'results') {
    if (from === 'watchlist') {
      setPage('watchlist')
    } else {
      setQuery(item.title || item.name) // fill the search bar with the selected title
      setPage('results')
    }
    setError(null)
    setSelected(item)
    setProviders(null)
    setShowSuggestions(false)
    setLoadingProviders(true)
    try {
      const data = await getWatchProviders(item.id, item.media_type)
      setProviders(data)
    } catch {
      setError('Failed to load streaming info.')
    }
    setLoadingProviders(false)
  }

  function toggleWatchlist() {
    // leaving the watchlist returns to search results if there are any, else the landing page
    setPage(p => (p === 'watchlist' ? (results.length ? 'results' : 'landing') : 'watchlist'))
    setSelected(null)
    setProviders(null)
    setError(null)
  }

  function goHome() {
    setPage('landing')
    setResults([])
    setSelected(null)
    setProviders(null)
    setError(null)
    setQuery('')
  }

  function handleBack() {
    setSelected(null)
    setProviders(null)
    setError(null)
  }

  const countMine = services => services.filter(s => myServices.has(s.provider_name)).length
  const byMineThenCount = (a, b) => (countMine(b.services) > 0) - (countMine(a.services) > 0) || b.services.length - a.services.length

  function getFreeOptions() {
    if (!providers) return []
    return Object.entries(providers)
      .filter(([, d]) => d.free?.length || d.ads?.length)
      .map(([code, d]) => ({
        code,
        name: getCountryName(code),
        services: [...(d.free || []), ...(d.ads || [])],
        hasAdsOnly: !d.free?.length,
        link: d.link,
      }))
      .sort(byMineThenCount)
  }

  function getSubscriptionOptions() {
    if (!providers) return []
    return Object.entries(providers)
      .filter(([, d]) => d.flatrate?.length)
      .map(([code, d]) => ({
        code,
        name: getCountryName(code),
        services: d.flatrate,
        link: d.link,
      }))
      .sort(byMineThenCount)
  }

  const freeOptions = getFreeOptions()
  const subOptions = getSubscriptionOptions()
  // the viewer's services this title streams on, with the countries for each
  // (shown with the name/logo the viewer picked, their own country first)
  const homeCountry = (navigator.language.split('-')[1] || '').toUpperCase()
  const onMine = providers
    ? [...streamingServices(providers).values()]
        .filter(s => myServices.keys.has(s.key))
        .map(s => ({
          ...s,
          ...myServices.services.find(m => m.key === s.key),
          countries: s.countries.map(code => ({ code, name: getCountryName(code) }))
            .sort((x, y) => (y.code === homeCountry) - (x.code === homeCountry) || x.name.localeCompare(y.name))
            .map(c => c.name),
        }))
    : []

  // Reusable search bar (appears on both pages)
  const searchBar = (
    <form onSubmit={handleSearch} className="search-form">
      <div className="search-input-wrapper">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          placeholder="Search for a movie or show..."
          className="search-input"
          autoFocus
          autoComplete="off"
        />
        {showSuggestions && suggestions.length > 0 && (
          <div className="suggestions-dropdown">
            {suggestions.map(item => (
              <button
                key={item.id}
                type="button"
                className="suggestion-item"
                onMouseDown={e => e.preventDefault()}
                onClick={() => handleSelect(item)}
              >
                {item.poster_path
                  ? <img src={`${THUMB_BASE}${item.poster_path}`} alt="" className="suggestion-thumb" />
                  : <div className="suggestion-no-img" />
                }
                <div className="suggestion-text">
                  <strong>{item.title || item.name}</strong>
                  <span>
                    {item.media_type === 'tv' ? 'TV Show' : 'Movie'}
                    {(item.release_date || item.first_air_date) && ` · ${(item.release_date || item.first_air_date).slice(0, 4)}`}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
      <button type="submit" className="search-btn" disabled={searching}>
        {searching ? '...' : 'Search'}
      </button>
    </form>
  )

  const navButtons = (
    <nav className="nav-buttons">
      <button className="nav-btn" onClick={() => setShowPicker(true)}>
        My services
        {myServices.services.length > 0 && <span className="nav-count">{myServices.services.length}</span>}
      </button>
      <AlertsPanel alerts={alerts} onOpenTitle={item => handleSelect(item, 'watchlist')} />
      <button
        className={`nav-btn${page === 'watchlist' ? ' active' : ''}`}
        onClick={toggleWatchlist}
      >
        {page === 'watchlist' ? '← Back' : 'Watchlist'}
        {page !== 'watchlist' && watchlist.items.length > 0 && (
          <span className="nav-count">{watchlist.items.length}</span>
        )}
      </button>
    </nav>
  )

  const picker = showPicker && <ServicesPicker myServices={myServices} onClose={() => setShowPicker(false)} />

  // ── Landing page ──
  if (page === 'landing') {
    return (
      <div className="landing">
        {navButtons}
        {picker}
        <div className="landing-content">
          <div className="brand">
            <h1>where<span className="brand-accent">2</span>watch</h1>
            <p className="tagline">Find any movie or show — free, anywhere in the world.</p>
          </div>
          {searchBar}
        </div>
        <div className="globe-wrapper">
          <Globe freeCountries={[]} subCountries={[]} />
        </div>
      </div>
    )
  }

  // ── Results + watchlist page ──
  return (
    <div className="results-page">
      <header className="results-header">
        <button className="home-btn" onClick={goHome}>
          where<span className="brand-accent">2</span>watch
        </button>
        {searchBar}
        {navButtons}
      </header>
      {picker}

      <main className="results-main">
        {error && <p className="error">{error}</p>}

        {/* Search results grid */}
        {page === 'results' && !selected && results.length > 0 && (
          <div className="results-grid">
            {results.map(item => (
              <PosterCard
                key={`${item.media_type}:${item.id}`}
                item={item}
                saved={watchlist.has(item)}
                onSelect={handleSelect}
                onToggleSave={watchlist.toggle}
              />
            ))}
          </div>
        )}

        {/* Watchlist */}
        {page === 'watchlist' && !selected && (
          <div className="watchlist-view">
            <h2 className="section-title">Your watchlist</h2>
            {watchlist.items.length > 0 ? (
              <>
                <p className="hint">
                  Click a title to see where it's streaming.
                  {myServices.services.length === 0 && <> <button className="link-btn" onClick={() => setShowPicker(true)}>Pick your services</button> to see which ones you can already watch.</>}
                </p>
                <div className="results-grid">
                  {watchlist.items.map(item => (
                    <PosterCard
                      key={`${item.media_type}:${item.id}`}
                      item={item}
                      saved
                      mine={alerts.mineFor(item)}
                      onSelect={handleSelect}
                      onToggleSave={watchlist.toggle}
                    />
                  ))}
                </div>
              </>
            ) : (
              <p className="empty-state">Nothing saved yet. Hit + on any title to add it here.</p>
            )}
          </div>
        )}

        {page === 'results' && !selected && !searching && results.length === 0 && (
          <p className="empty-state">No results found for "{query}"</p>
        )}

        {/* Detail view */}
        {selected && (
          <div className="detail-view">
            <button className="back-btn" onClick={handleBack}>
              {page === 'watchlist' ? '← Back to watchlist' : '← Back to results'}
            </button>

            <div className="detail-header">
              {selected.poster_path && (
                <img
                  src={`${IMAGE_BASE}${selected.poster_path}`}
                  alt={selected.title || selected.name}
                  className="detail-poster"
                />
              )}
              <div className="detail-meta">
                <div className="detail-type">{selected.media_type === 'tv' ? 'TV Show' : 'Movie'}</div>
                <h2>{selected.title || selected.name}</h2>
                {selected.overview && <p className="overview">{selected.overview}</p>}
                <button
                  className={`detail-save-btn${watchlist.has(selected) ? ' saved' : ''}`}
                  onClick={() => watchlist.toggle(selected)}
                >
                  {watchlist.has(selected) ? '✓ In watchlist' : '+ Add to watchlist'}
                </button>
              </div>
            </div>

            {loadingProviders && <p className="status-msg">Scanning all countries...</p>}

            {providers && (
              <div className="providers-section">
                {myServices.services.length > 0 ? (
                  onMine.length > 0 ? (
                    <div className="mine-box">
                      <div className="group-header mine-header">
                        <span className="group-dot mine-dot" />
                        On your services
                      </div>
                      <div className="mine-list">
                        {onMine.map(s => (
                          <div key={s.key} className="mine-row">
                            <img src={`${LOGO_BASE}${s.logo_path}`} alt="" className="service-logo" />
                            <div className="mine-info">
                              <strong>{s.name}</strong>
                              <span>
                                {s.countries.length} {s.countries.length === 1 ? 'country' : 'countries'}:{' '}
                                {s.countries.slice(0, 6).join(', ')}
                                {s.countries.length > 6 && ` +${s.countries.length - 6} more`}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="mine-box none">
                      Not streaming on any of your services right now.{' '}
                      {watchlist.has(selected)
                        ? "It's on your watchlist, so you'll get an alert if that changes."
                        : <button className="link-btn" onClick={() => watchlist.toggle(selected)}>Add it to your watchlist</button>}
                      {!watchlist.has(selected) && " to get an alert if that changes."}
                    </div>
                  )
                ) : (
                  <div className="mine-box none">
                    <button className="link-btn" onClick={() => setShowPicker(true)}>Pick your streaming services</button> to see them highlighted here.
                  </div>
                )}

                {freeOptions.length > 0 ? (
                  <div className="provider-group">
                    <div className="group-header free-header">
                      <span className="group-dot" />
                      Free with VPN
                    </div>
                    <p className="hint">VPN into any of these countries to watch for free. Purple dots on the globe = free countries.</p>
                    <div className="country-list">
                      {freeOptions.map(({ code, name, services, hasAdsOnly }) => (
                        <div key={code} className={`country-row${countMine(services) ? ' has-mine' : ''}`}>
                          <span className="country-label">
                            <img
                              src={`https://flagcdn.com/w20/${code.toLowerCase()}.png`}
                              alt={name}
                              className="country-flag"
                            />
                            {name}
                            {hasAdsOnly && <span className="badge">ads</span>}
                          </span>
                          <ServiceLogos services={services} title={selected.title || selected.name} myServices={myServices} />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="no-free">No free streaming options found globally.</div>
                )}

                {subOptions.length > 0 && (
                  <div className="provider-group">
                    <div className="group-header sub-header">
                      <span className="group-dot sub-dot" />
                      Subscription (with VPN)
                    </div>
                    <p className="hint">Needs a paid subscription + VPN. Blue dots on the globe.</p>
                    <div className="country-list">
                      {subOptions.slice(0, 15).map(({ code, name, services }) => (
                        <div key={code} className={`country-row${countMine(services) ? ' has-mine' : ''}`}>
                          <span className="country-label">
                            <img
                              src={`https://flagcdn.com/w20/${code.toLowerCase()}.png`}
                              alt={name}
                              className="country-flag"
                            />
                            {name}
                          </span>
                          <ServiceLogos services={services} title={selected.title || selected.name} myServices={myServices} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {freeOptions.length === 0 && subOptions.length === 0 && (
                  <p className="empty-state">No streaming info found. It may not be on any service yet.</p>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
