import api from './api'

export const getCashFlowForecast = async (months = 3) =>
  (await api.get('/forecast/cash-flow', { params: { months } })).data