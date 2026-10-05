// src/lib/api/apiClient.js
// Centralized API client — all backend calls go through here

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5003/api'

function getToken() {
  return localStorage.getItem('rackos_token')
}

async function request(method, path, body) {
  const token = getToken()
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  // Handle 401 — token expired or invalid
  if (res.status === 401) {
    localStorage.removeItem('rackos_token')
    localStorage.removeItem('rackos_user')
    window.dispatchEvent(new Event('auth:logout'))
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || 'Session expired. Please log in again.')
  }

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.error || `Request failed with status ${res.status}`)
  }
  return data
}

export const api = {
  get:    (path)        => request('GET',    path),
  post:   (path, body)  => request('POST',   path, body),
  put:    (path, body)  => request('PUT',    path, body),
  patch:  (path, body)  => request('PATCH',  path, body),
  delete: (path)        => request('DELETE', path),
}
