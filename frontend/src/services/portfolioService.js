import api from './api'

export const getPortfolioInsights = async () =>
  (await api.get('/portfolio/insights')).data