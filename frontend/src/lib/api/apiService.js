// src/lib/api/apiService.js
// All API calls used by the store and components

import { api } from './apiClient.js'

// ── Auth ──────────────────────────────────────────────────────────────────
export const authService = {
  login: (userId, pin)  => api.post('/auth/login', { userId, pin }),
  me:    ()             => api.get('/auth/me'),
  logout: ()            => api.post('/auth/logout'),
}

// ── Racks ─────────────────────────────────────────────────────────────────
export const rackService = {
  getAll:       ()                  => api.get('/racks'),
  create:       (data)              => api.post('/racks', data),
  update:       (id, data)          => api.put(`/racks/${id}`, data),
  toggleStatus: (id)                => api.patch(`/racks/${id}/status`),
  delete:       (id)                => api.delete(`/racks/${id}`),
}

// ── Materials ─────────────────────────────────────────────────────────────
export const materialService = {
  getAll:  ()           => api.get('/materials'),
  create:  (data)       => api.post('/materials', data),
  update:  (id, data)   => api.put(`/materials/${id}`, data),
  delete:  (id)         => api.delete(`/materials/${id}`),
}

// ── Locations ─────────────────────────────────────────────────────────────
export const locationService = {
  getAll:     (rackId)                  => api.get(rackId ? `/locations?rack=${rackId}` : '/locations'),
  create:     (data)                    => api.post('/locations', data),
  assign:     (locationId, materialId)  => api.patch(`/locations/${locationId}/assign`, { materialId }),
  unassign:   (locationId)              => api.patch(`/locations/${locationId}/assign`, { materialId: '' }),
  update:     (locationId, data)        => api.put(`/locations/${locationId}`, data),
  delete:     (locationId)              => api.delete(`/locations/${locationId}`),
}

// ── Movements ─────────────────────────────────────────────────────────────
export const movementService = {
  getAll:   (filters)  => {
    const params = new URLSearchParams()
    if (filters?.materialId) params.set('materialId', filters.materialId)
    if (filters?.locationId) params.set('locationId', filters.locationId)
    if (filters?.type)       params.set('type', filters.type)
    if (filters?.from)       params.set('from', filters.from)
    if (filters?.to)         params.set('to', filters.to)
    const qs = params.toString()
    return api.get(`/movements${qs ? '?' + qs : ''}`)
  },
  create:   (data)     => api.post('/movements', data),
  transfer: (data)     => api.post('/movements/transfer', data),
  swap:     (data)     => api.post('/movements/swap', data),
  delete:   (id)       => api.delete(`/movements/${id}`),
  getStats: ()         => api.get('/movements/stats'),
}
