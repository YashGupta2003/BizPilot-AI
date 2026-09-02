import api from './api'

export const createGoal = async (data) => (await api.post('/goals', data)).data

export const getCurrentGoal = async () => (await api.get('/goals/current')).data

export const getHistory = async () => (await api.get('/goals/history')).data

export const deleteGoal = async (id) => (await api.delete(`/goals/${id}`)).data
