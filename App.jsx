import React, { useState, useEffect } from 'react'
import Login from './Login'
import MoodTracker from './MoodTracker'
import AdminDashboard from './AdminDashboard'

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if user is already logged in
    const savedUser = localStorage.getItem('user')
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser))
      } catch (err) {
        localStorage.removeItem('user')
      }
    }
    setLoading(false)
  }, [])

  const handleLogin = (userData) => {
    setUser(userData)
  }

  const handleLogout = () => {
    setUser(null)
    localStorage.removeItem('user')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Cargando...</div>
      </div>
    )
  }

  if (!user) {
    return <Login onLogin={handleLogin} />
  }

  // Show admin dashboard for admin users
  if (user.role === 'admin') {
    return <AdminDashboard onLogout={handleLogout} />
  }

  // Show mood tracker for regular users
  return <MoodTracker user={user} onLogout={handleLogout} />
}
