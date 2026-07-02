const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

async function request(path, options) {
  const response = await fetch(`${API_BASE_URL}${path}`, options)
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    const detail = body?.detail
    const message = Array.isArray(detail)
      ? detail.map((d) => d.msg).join('; ')
      : detail || `Request failed with status ${response.status}`
    throw new Error(message)
  }
  return response.json()
}

export function getDashboardSummary() {
  return request('/dashboard/summary')
}

export function getClimateTrends() {
  return request('/climate/trends')
}

export function getRegionalComparison() {
  return request('/climate/regional-comparison')
}

export function getModelPerformance() {
  return request('/model/performance')
}

export function getVineyardIntelligence() {
  return request('/vineyard-intelligence')
}

export function getWeatherForLocation(lat, lon) {
  return request(`/vineyard-intelligence/weather?lat=${lat}&lon=${lon}`)
}

export function predictHarvest(payload) {
  return request('/predict', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}
