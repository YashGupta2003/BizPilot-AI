import axios from 'axios'

const API_BASE_URL = 'http://localhost:8000/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
})

// If the token is invalid/expired, log the user out automatically
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('bizpilot_user')
      
      // Do not hard redirect if we are already fetching auth status or already on the login page
      // This prevents infinite reload loops.
      const isAuthEndpoint = error.config.url === '/auth/me' || error.config.url === 'auth/me'
      if (!isAuthEndpoint && window.location.pathname !== '/login' && window.location.pathname !== '/signup') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api
