import api from './api';

export const getSeasonalPlan = async () => {
  return (await api.get('/seasonal/plan')).data;
};

export const getSeasonalInsights = async () => {
  return (await api.get('/seasonal/insights')).data;
};

export const saveSeasonalPlan = async (payload) => {
  return (await api.post('/seasonal/save-plan', payload)).data;
};

export const getSeasonalHistory = async () => {
  return (await api.get('/seasonal/history')).data;
};
