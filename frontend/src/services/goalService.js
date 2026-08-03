import api from './api'

const goalService = {
  createGoal: (data) => api.post('/goals', data),
  getCurrentGoal: () => api.get('/goals/current'),
  getHistory: () => api.get('/goals/history'),
  deleteGoal: (id) => api.delete(`/goals/${id}`),
}

export default goalService
