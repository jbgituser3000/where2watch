import useStoredState from './useStoredState'
import { serviceKey } from '../services'

// The streaming services this viewer subscribes to, saved in the browser
export default function useMyServices() {
  const [stored, setServices] = useStoredState('where2watch:services', [])
  const services = Array.isArray(stored) ? stored : []
  const keys = new Set(services.map(s => s.key))

  const has = providerName => keys.has(serviceKey(providerName))

  function toggle(service) {
    setServices(prev => prev.some(s => s.key === service.key)
      ? prev.filter(s => s.key !== service.key)
      : [...prev, { key: service.key, name: service.name, logo_path: service.logo_path }])
  }

  return { services, keys, has, toggle }
}
