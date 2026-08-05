import { createContext, useContext, useState, useEffect } from 'react'
import { login as loginApi, signup as signupApi, getMe as getMeApi, logout as logoutApi } from '../services/authService'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchMe = async () => {
      try {
        const user = await getMeApi()
        setUser(user)
        localStorage.setItem('bizpilot_user', JSON.stringify(user))
      } catch (err) {
        localStorage.removeItem('bizpilot_user')
        setUser(null)
      } finally {
        setLoading(false)
      }
    }
    fetchMe()
  }, [])

  async function login(email, password) {
    const user = await loginApi(email, password)
    localStorage.setItem('bizpilot_user', JSON.stringify(user))
    setUser(user)
    return user
  }

  async function signup(payload) {
    const user = await signupApi(payload)
    localStorage.setItem('bizpilot_user', JSON.stringify(user))
    setUser(user)
    return user
  }

  async function logout() {
    try {
      await logoutApi()
    } catch(e) {}
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
