import { createContext, useContext, useState, useEffect } from 'react'
import { login as loginApi, signup as signupApi } from '../services/authService'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const storedUser = localStorage.getItem('bizpilot_user')
    const token = localStorage.getItem('bizpilot_token')
    if (storedUser && token) {
      setUser(JSON.parse(storedUser))
    }
    setLoading(false)
  }, [])

  async function login(email, password) {
    const data = await loginApi(email, password)
    localStorage.setItem('bizpilot_token', data.access_token)
    localStorage.setItem('bizpilot_user', JSON.stringify(data.user))
    setUser(data.user)
    return data
  }

  async function signup(payload) {
    const data = await signupApi(payload)
    localStorage.setItem('bizpilot_token', data.access_token)
    localStorage.setItem('bizpilot_user', JSON.stringify(data.user))
    setUser(data.user)
    return data
  }

  function logout() {
    localStorage.removeItem('bizpilot_token')
    localStorage.removeItem('bizpilot_user')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
