import { useState, useEffect } from 'react'
import { searchMulti, getWatchProviders } from './api/tmdb'
import Globe from './components/Globe'
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
  const [hasSearched, setHasSearched] = useState(false)

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
    setHasSearched(true)
    try {
      const data = await searchMulti(query)
      setResults(data)
    } catch {
      setError('Search failed. Check your connection and try again.')
    }
    setSearching(false)
  }

  async function handleSelect(item) {
    setQuery(item.title || item.name) // fill the search bar with the selected title
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

  function handleBack() {
    setSelected(null)
    setProviders(null)
    setError(null)
  }

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
      .sort((a, b) => b.services.length - a.services.length)
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
      .sort((a, b) => b.services.length - a.services.length)
  }

  const freeOptions = getFreeOptions()
  const subOptions = getSubscriptionOptions()
  const freeCountryCodes = freeOptions.map(o => o.code)
  const subCountryCodes = subOptions.map(o => o.code)

  return (
    <div className="app">
      {/* Hero: brand + search on left, globe on right */}
      <div className="hero">
        <div className="hero-left">
          <div className="brand">
            <h1>where<span className="brand-accent">2</span>watch</h1>
            <p className="tagline">Find any movie or show — free, anywhere in the world.</p>
          </div>

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
        </div>

        <div className="hero-right">
          <Globe freeCountries={freeCountryCodes} subCountries={subCountryCodes} />
        </div>
      </div>

      {/* Content below hero */}
      <div className="content">
        {error && <p className="error">{error}</p>}

        {/* Search results grid */}
        {!selected && results.length > 0 && (
          <div className="results-grid">
            {results.map(item => (
              <button key={item.id} className="result-card" onClick={() => handleSelect(item)}>
                {item.poster_path
                  ? <img src={`${IMAGE_BASE}${item.poster_path}`} alt={item.title || item.name} />
                  : <div className="no-poster">No image</div>
                }
                <div className="result-info">
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

        {!selected && !searching && hasSearched && results.length === 0 && (
          <p className="empty-state">No results found for "{query}"</p>
        )}

        {/* Detail view */}
        {selected && (
          <div className="detail-view">
            <button className="back-btn" onClick={handleBack}>← Back to results</button>

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
              </div>
            </div>

            {loadingProviders && <p className="status-msg">Scanning all countries...</p>}

            {providers && (
              <div className="providers-section">
                {freeOptions.length > 0 ? (
                  <div className="provider-group">
                    <div className="group-header free-header">
                      <span className="group-dot" />
                      Free with VPN
                    </div>
                    <p className="hint">VPN into any of these countries to watch for free. Purple dots on the globe = free countries.</p>
                    <div className="country-list">
                      {freeOptions.map(({ code, name, services, hasAdsOnly }) => (
                        <div key={code} className="country-row">
                          <span className="country-label">
                            <img
                              src={`https://flagcdn.com/w20/${code.toLowerCase()}.png`}
                              alt={name}
                              className="country-flag"
                            />
                            {name}
                            {hasAdsOnly && <span className="badge">ads</span>}
                          </span>
                          <div className="service-logos">
                            {services.map(s => {
                              const url = getServiceUrl(s.provider_name, selected.title || selected.name)
                              const logo = <img src={`${LOGO_BASE}${s.logo_path}`} alt={s.provider_name} title={s.provider_name} className="service-logo" />
                              return url
                                ? <a key={s.provider_id} href={url} target="_blank" rel="noopener noreferrer">{logo}</a>
                                : <span key={s.provider_id}>{logo}</span>
                            })}
                          </div>
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
                        <div key={code} className="country-row">
                          <span className="country-label">
                            <img
                              src={`https://flagcdn.com/w20/${code.toLowerCase()}.png`}
                              alt={name}
                              className="country-flag"
                            />
                            {name}
                          </span>
                          <div className="service-logos">
                            {services.map(s => {
                              const url = getServiceUrl(s.provider_name, selected.title || selected.name)
                              const logo = <img src={`${LOGO_BASE}${s.logo_path}`} alt={s.provider_name} title={s.provider_name} className="service-logo" />
                              return url
                                ? <a key={s.provider_id} href={url} target="_blank" rel="noopener noreferrer">{logo}</a>
                                : <span key={s.provider_id}>{logo}</span>
                            })}
                          </div>
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
      </div>
    </div>
  )
}
