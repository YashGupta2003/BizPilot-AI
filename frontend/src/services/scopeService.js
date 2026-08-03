import api from './api'

export const createScopeProject = async (payload) =>
  (await api.post('/scope/projects', payload)).data

export const listScopeProjects = async () =>
  (await api.get('/scope/projects')).data

export const getScopeProject = async (id) =>
  (await api.get(`/scope/projects/${id}`)).data

export const checkDrift = async (id, current_input) =>
  (await api.post(`/scope/projects/${id}/check`, { current_input })).data

export const relockScope = async (id, scope_text) =>
  (await api.post(`/scope/projects/${id}/lock`, { scope_text })).data

export const deleteScopeProject = async (id) =>
  (await api.delete(`/scope/projects/${id}`)).data