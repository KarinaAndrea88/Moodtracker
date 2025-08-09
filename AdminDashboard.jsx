import React, { useState, useEffect, useRef } from 'react'
import { supabase } from './supabase'

// Función para analizar colores en una imagen
function analyzeImageColors(imageDataUrl) {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()
    
    img.onload = () => {
      // Redimensionar para análisis más rápido
      const maxSize = 100
      const scale = Math.min(maxSize / img.width, maxSize / img.height)
      canvas.width = img.width * scale
      canvas.height = img.height * scale
      
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data = imageData.data
      const colorCounts = {}
      const totalPixels = data.length / 4
      
      // Analizar cada píxel
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i]
        const g = data[i + 1]
        const b = data[i + 2]
        const a = data[i + 3]
        
        // Ignorar píxeles transparentes, muy oscuros (fondo) o muy claros (fondo)
        if (a < 128 || 
            (r < 30 && g < 30 && b < 30) || 
            (r > 240 && g > 240 && b > 240) ||
            (Math.abs(r - g) < 10 && Math.abs(g - b) < 10 && Math.abs(r - b) < 10)) continue
        
        // Agrupar colores similares para reducir ruido
        const colorKey = getColorKey(r, g, b)
        if (colorKey) {
          colorCounts[colorKey] = (colorCounts[colorKey] || 0) + 1
        }
      }
      
      // Convertir a porcentajes y ordenar
      const colorPercentages = Object.entries(colorCounts)
        .map(([color, count]) => ({
          color,
          count,
          percentage: Math.round((count / totalPixels) * 100)
        }))
        .filter(item => item.percentage > 2) // Solo colores con más del 2%
        .sort((a, b) => b.percentage - a.percentage)
      
      resolve(colorPercentages)
    }
    
    img.src = imageDataUrl
  })
}

// Función para agrupar colores similares y dar nombres
function getColorKey(r, g, b) {
  // Agrupar colores en rangos para reducir ruido
  const rGroup = Math.floor(r / 32) * 32
  const gGroup = Math.floor(g / 32) * 32
  const bGroup = Math.floor(b / 32) * 32
  
  // Mapear a nombres de colores aproximados con tolerancia
  if (rGroup > 200 && gGroup > 200 && bGroup > 200) return null // Ignorar blanco puro
  if (rGroup < 64 && gGroup < 64 && bGroup < 64) return null // Ignorar negro puro
  
  // Colores cálidos
  if (rGroup > 180 && gGroup < 120 && bGroup < 120) return 'Rojo'
  if (rGroup > 160 && gGroup > 100 && gGroup < 180 && bGroup < 120) return 'Naranja'
  if (rGroup > 180 && gGroup > 160 && bGroup < 120) return 'Amarillo'
  if (rGroup > 150 && gGroup > 120 && bGroup < 100) return 'Amarillo Dorado'
  
  // Colores fríos
  if (rGroup < 120 && gGroup > 180 && bGroup < 120) return 'Verde'
  if (rGroup < 120 && gGroup > 150 && bGroup > 150) return 'Verde Azulado'
  if (rGroup < 120 && gGroup < 120 && bGroup > 180) return 'Azul'
  if (rGroup < 120 && gGroup > 180 && bGroup > 180) return 'Cian'
  
  // Colores especiales
  if (rGroup > 180 && gGroup < 120 && bGroup > 180) return 'Magenta'
  if (rGroup > 180 && gGroup > 180 && bGroup < 120) return 'Amarillo Limón'
  if (rGroup > 150 && gGroup < 100 && bGroup > 150) return 'Rosa'
  if (rGroup < 100 && gGroup > 150 && bGroup > 150) return 'Turquesa'
  if (rGroup > 100 && gGroup > 150 && bGroup < 100) return 'Verde Lima'
  
  // Colores neutros (solo si son suficientemente distintos)
  if (Math.abs(rGroup - gGroup) > 20 || Math.abs(gGroup - bGroup) > 20 || Math.abs(rGroup - bGroup) > 20) {
    if (rGroup > gGroup && rGroup > bGroup) return 'Rojo Suave'
    if (gGroup > rGroup && gGroup > bGroup) return 'Verde Suave'
    if (bGroup > rGroup && bGroup > gGroup) return 'Azul Suave'
  }
  
  return null // Ignorar colores muy similares al fondo
}

// Función para mapear nombres de colores a códigos hex
function getColorForName(colorName) {
  const colorMap = {
    'Rojo': '#ef4444',
    'Naranja': '#f97316',
    'Amarillo': '#eab308',
    'Amarillo Dorado': '#f59e0b',
    'Amarillo Limón': '#84cc16',
    'Verde': '#22c55e',
    'Verde Azulado': '#14b8a6',
    'Verde Lima': '#84cc16',
    'Cian': '#06b6d4',
    'Azul': '#3b82f6',
    'Azul Suave': '#60a5fa',
    'Violeta': '#8b5cf6',
    'Índigo': '#6366f1',
    'Rosa': '#ec4899',
    'Rosa Oscuro': '#f43f5e',
    'Magenta': '#ec4899',
    'Turquesa': '#14b8a6',
    'Rojo Suave': '#fca5a5',
    'Verde Suave': '#86efac'
  }
  return colorMap[colorName] || '#6b7280'
}

// Función para determinar el color del texto según el fondo
function getTextColorForName(colorName) {
  const darkColors = ['Amarillo', 'Amarillo Dorado', 'Amarillo Limón', 'Verde Lima', 'Cian', 'Turquesa']
  return darkColors.includes(colorName) ? '#000000' : '#ffffff'
}

// Componente de dropdown con buscador para selección de usuarios
function UserDropdown({ users, selectedUser, onUserSelect, disabled }) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const dropdownRef = useRef(null)

  // Filtrar usuarios que no sean admin
  const filteredUsers = users.filter(user => user.role !== 'admin')
  
  // Filtrar por término de búsqueda
  const searchResults = filteredUsers.filter(user =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Si no hay usuarios disponibles, mostrar mensaje
  if (filteredUsers.length === 0) {
    return (
      <div className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-slate-400 text-center">
        <svg className="w-5 h-5 mx-auto mb-2 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        No hay usuarios disponibles
      </div>
    )
  }

  // Cerrar dropdown al hacer clic fuera o presionar Escape
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
        setSearchTerm('')
      }
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
        setSearchTerm('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  const handleUserSelect = (user) => {
    onUserSelect(user)
    setIsOpen(false)
    setSearchTerm('')
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className="flex items-center justify-between w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white hover:bg-slate-600 disabled:bg-slate-600 disabled:cursor-not-allowed transition-all duration-200 shadow-sm"
      >
        <span className="flex items-center gap-2">
          <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span className="font-medium truncate">
            {selectedUser ? selectedUser.username : 'Seleccionar usuario'}
          </span>
        </span>
        <svg 
          className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-600 rounded-xl shadow-2xl z-50 max-h-60 overflow-hidden backdrop-blur-sm">
          {/* Barra de búsqueda */}
          <div className="p-4 border-b border-slate-600 bg-slate-750">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="search"
                placeholder="Buscar"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                data-form-type="other"
                data-lpignore="true"
                data-1p-ignore="true"
                autoFocus
              />
            </div>
          </div>

          {/* Lista de usuarios */}
          <div className="max-h-48 overflow-y-auto">
            {searchResults.length === 0 ? (
              <div className="p-6 text-center text-slate-400">
                <svg className="w-8 h-8 mx-auto mb-2 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-3.314 0-6-2.686-6-6s2.686-6 6-6 6 2.686 6 6" />
                </svg>
                <p className="text-sm">
                  {searchTerm ? 'No se encontraron usuarios' : 'No hay usuarios disponibles'}
                </p>
              </div>
            ) : (
              searchResults.map(user => (
                <button
                  key={user.id}
                  onClick={() => handleUserSelect(user)}
                  className={`w-full px-4 py-3 text-left hover:bg-slate-700 transition-all duration-200 border-l-4 border-transparent ${
                    selectedUser?.id === user.id 
                      ? 'bg-blue-600 text-white border-l-blue-400' 
                      : 'text-slate-300 hover:border-l-slate-500'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${
                      selectedUser?.id === user.id 
                        ? 'bg-white' 
                        : 'bg-gradient-to-r from-blue-400 to-purple-500'
                    }`}></div>
                    <span className="font-medium">{user.username}</span>
                    {selectedUser?.id === user.id && (
                      <svg className="w-5 h-5 ml-auto text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function AdminDashboard({ onLogout }) {
  const [users, setUsers] = useState([])
  const [moodData, setMoodData] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState(null)
  const [dateRange, setDateRange] = useState('week') // week, month, year
  const [colorStats, setColorStats] = useState({ colorStats: [], drawingAnalysis: [] })
  const [analyzing, setAnalyzing] = useState(false)
  const [showAnalysisPopup, setShowAnalysisPopup] = useState(false)
  const [currentAnalysis, setCurrentAnalysis] = useState(null)

  useEffect(() => {
    loadData()
  }, [dateRange])

  useEffect(() => {
    if (selectedUser && moodData.length > 0) {
      const analyzeColors = async () => {
        setAnalyzing(true)
        try {
          const stats = await getColorStats(moodData)
          setColorStats(stats)
        } catch (error) {
          console.error('Error analyzing colors:', error)
        } finally {
          setAnalyzing(false)
        }
      }
      analyzeColors()
    }
  }, [selectedUser, moodData])

  useEffect(() => {
    // Si no hay usuario seleccionado y hay usuarios disponibles, seleccionar el primero
    if (!selectedUser && users.length > 0) {
      setSelectedUser(users[0])
    }
  }, [users, selectedUser])

  const loadData = async () => {
    try {
      setLoading(true)
      // Load users
      const { data: usersData } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })

      // Load mood entries
      const { data: moodEntries } = await supabase
        .from('mood_entries')
        .select('*')
        .order('date', { ascending: false })

      setUsers(usersData || [])
      setMoodData(moodEntries || [])
    } catch (error) {
      console.error('Error loading data:', error)
      setAnalyzing(false)
    } finally {
      setLoading(false)
    }
  }

  const getDateRange = () => {
    const now = new Date()
    switch (dateRange) {
      case 'week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      case 'month':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      case 'year':
        return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
      default:
        return new Date(0)
    }
  }

  const getFilteredMoodData = () => {
    if (!selectedUser) return []
    const startDate = getDateRange()
    return moodData.filter(entry => 
      entry.user_id === selectedUser.id && 
      new Date(entry.date) >= startDate
    )
  }

  const getColorStats = async (data = moodData) => {
    if (!selectedUser) return { colorStats: [], drawingAnalysis: [] }
    
    const filtered = data.filter(entry => entry.user_id === selectedUser.id)
    const colorCounts = {}
    const total = filtered.length
    const drawingAnalysis = []

    for (const entry of filtered) {
      if (entry.color && entry.color.startsWith('data:')) {
        // Es una imagen - analizar colores
        try {
          const colorAnalysis = await analyzeImageColors(entry.color)
          const dominantColor = colorAnalysis.length > 0 ? colorAnalysis[0] : null
          
          drawingAnalysis.push({
            entry,
            colors: colorAnalysis,
            dominantColor: dominantColor?.color || 'Sin color'
          })
          
          // Agrupar por colores dominantes
          if (dominantColor) {
            colorCounts[dominantColor.color] = (colorCounts[dominantColor.color] || 0) + 1
          }
        } catch (err) {
          console.error('Error analyzing image:', err)
        }
      } else if (entry.color) {
        // Es un color simple
        colorCounts[entry.color] = (colorCounts[entry.color] || 0) + 1
      }
    }

    return {
      colorStats: Object.entries(colorCounts).map(([color, count]) => ({
        color,
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0
      })).sort((a, b) => b.count - a.count),
      drawingAnalysis
    }
  }

  const colorNames = {
    '#22c55e': 'Verde (Feliz)',
    '#3b82f6': 'Azul (Tranquilo)',
    '#06b6d4': 'Cian (Energético)',
    '#6366f1': 'Índigo (Creativo)',
    '#ef4444': 'Rojo (Enojado)',
    '#f59e0b': 'Naranja (Emocionado)',
    '#fb7185': 'Rosa (Amoroso)',
    '#a855f7': 'Púrpura (Misterioso)',
    '#10b981': 'Esmeralda (Equilibrado)',
    '#eab308': 'Amarillo (Alegre)',
    '#111827': 'Negro (Triste)',
    '#ffffff': 'Blanco (Neutral)',
    'drawing': 'Dibujo personalizado'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-xl">Cargando dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <div className="bg-slate-800 p-6 rounded-xl mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold mb-2">Dashboard de Admin</h1>
            <p className="text-slate-400">Gestiona usuarios y visualiza datos de mood</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={async () => {
                setAnalyzing(true)
                const stats = await getColorStats()
                setColorStats(stats)
                setAnalyzing(false)
              }}
              disabled={analyzing}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg"
            >
              {analyzing ? 'Analizando...' : '🔄 Refrescar Análisis'}
            </button>
            <button
              onClick={onLogout}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* User Selection and Controls */}
        <div className="bg-slate-800 p-6 rounded-xl mb-6">
          <h2 className="text-xl font-bold mb-4">Seleccionar Usuario y Período</h2>
          {!selectedUser ? (
            <div className="text-center py-8">
              <p className="text-slate-400 mb-4">Selecciona un usuario para ver sus datos</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {users.filter(user => user.role !== 'admin').map(user => (
                  <button
                    key={user.id}
                    onClick={() => setSelectedUser(user)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg"
                  >
                    {user.username}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="w-64">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Usuario
                </label>
                <UserDropdown
                  users={users}
                  selectedUser={selectedUser}
                  onUserSelect={setSelectedUser}
                  disabled={analyzing}
                />
                {analyzing && (
                  <div className="mt-2 text-xs text-slate-400 text-center">
                    ⏳ Analizando colores...
                  </div>
                )}
              </div>
              
              <div className="w-64">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Período
                </label>
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white w-full"
                >
                  <option value="week">Última semana</option>
                  <option value="month">Último mes</option>
                  <option value="year">Último año</option>
                </select>
              </div>
              
              {analyzing && (
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
                  <span>Analizando colores...</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-slate-800 p-6 rounded-xl">
            <h3 className="text-lg font-semibold mb-2">Total de Entradas</h3>
            <p className="text-3xl font-bold text-blue-400">
              {getFilteredMoodData().length}
            </p>
          </div>
          
          <div className="bg-slate-800 p-6 rounded-xl">
            <h3 className="text-lg font-semibold mb-2">Usuarios Activos</h3>
            <p className="text-3xl font-bold text-green-400">
              {users.filter(u => u.role !== 'admin').length}
            </p>
          </div>
          
          <div className="bg-slate-800 p-6 rounded-xl">
            <h3 className="text-lg font-semibold mb-2">Período</h3>
            <p className="text-xl text-purple-400">
              {dateRange === 'week' ? 'Última semana' : 
               dateRange === 'month' ? 'Último mes' : 'Último año'}
            </p>
          </div>
        </div>

        {/* Estadísticas por Tipo */}
        <div className="bg-slate-800 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Análisis de Colores</h2>
            <button
              onClick={async () => {
                if (selectedUser) {
                  setAnalyzing(true)
                  const stats = await getColorStats(moodData)
                  setColorStats(stats)
                  setAnalyzing(false)
                }
              }}
              disabled={analyzing || !selectedUser}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 rounded-lg text-sm font-medium"
            >
              {analyzing ? 'Analizando...' : 'Refrescar Análisis'}
            </button>
          </div>
                    {analyzing ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-2"></div>
              <p className="text-slate-400">Analizando colores en los dibujos...</p>
            </div>
          ) : colorStats.colorStats.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-400">
                {selectedUser 
                  ? 'No hay datos de colores analizados para este usuario. Haz clic en "Refrescar Análisis" para comenzar.'
                  : 'Selecciona un usuario para ver el análisis de colores'
                }
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {colorStats.colorStats.map(({ color, count, percentage }) => (
                  <div key={color} className="flex items-center gap-3 p-3 bg-slate-700 rounded-lg">
                    <div 
                      className="w-8 h-8 rounded-full border-2 border-white/20 flex items-center justify-center text-xs font-bold"
                      style={{ 
                        backgroundColor: getColorForName(color),
                        color: getTextColorForName(color)
                      }}
                    >
                      {color.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{color}</p>
                      <p className="text-sm text-slate-400">
                        {count} entradas ({percentage}%)
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* All Entries Table */}
        <div className="bg-slate-800 p-6 rounded-xl">
          <h2 className="text-xl font-bold mb-4">Todas las Entradas</h2>
          {!selectedUser ? (
            <div className="text-center py-8">
              <p className="text-slate-400">Selecciona un usuario para ver sus entradas</p>
            </div>
          ) : (
            <>
              <div className="mb-4 p-4 bg-slate-700/50 rounded-lg">
                <p className="text-slate-300">
                  <span className="font-medium text-white">{getFilteredMoodData().length}</span> entradas encontradas
                  {dateRange !== 'all' && (
                    <span className="text-slate-400 ml-2">
                      (filtrado por rango de fechas)
                    </span>
                  )}
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left p-3">Fecha</th>
                      <th className="text-left p-3">Vista Previa</th>
                      <th className="text-left p-3">Color Predominante</th>
                      <th className="text-left p-3">Análisis de Colores</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getFilteredMoodData()
                      .sort((a, b) => new Date(b.date) - new Date(a.date))
                      .map(entry => {
                        const isDrawing = entry.color && entry.color.startsWith('data:')
                        const drawingAnalysis = colorStats.drawingAnalysis?.find(d => d.entry.id === entry.id)
                        const dominantColor = drawingAnalysis?.dominantColor || 'Sin color'
                        
                        return (
                          <tr key={entry.id} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                            <td className="p-3">
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {new Date(entry.date).toLocaleDateString('es-ES', { 
                                    weekday: 'long', 
                                    year: 'numeric', 
                                    month: 'long', 
                                    day: 'numeric' 
                                  })}
                                </span>
                                <span className="text-sm text-slate-400">
                                  {new Date(entry.date).toLocaleDateString('es-ES')}
                                </span>
                              </div>
                            </td>
                            <td className="p-3">
                              {isDrawing ? (
                                <img
                                  src={entry.thumbnail || entry.color}
                                  alt="Vista previa"
                                  className="w-16 h-16 rounded border border-slate-600 object-cover"
                                />
                              ) : (
                                <div className="flex items-center gap-3">
                                  <div
                                    className="w-16 h-16 rounded border-2 border-slate-600"
                                    style={{ backgroundColor: entry.color }}
                                  />
                                  <span className="text-sm text-slate-300">{colorNames[entry.color] || entry.color}</span>
                                </div>
                              )}
                            </td>
                            <td className="p-3">
                              {isDrawing ? (
                                <div className="flex items-center gap-3">
                                  <div 
                                    className="w-12 h-12 rounded-full border-2 border-slate-600 flex items-center justify-center text-sm font-bold"
                                    style={{ 
                                      backgroundColor: getColorForName(dominantColor),
                                      color: getTextColorForName(dominantColor)
                                    }}
                                  >
                                    {dominantColor.charAt(0)}
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-sm font-medium text-slate-200">
                                      {dominantColor}
                                    </span>
                                    <span className="text-xs text-slate-400">
                                      Color principal
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center gap-3">
                                  <div
                                    className="w-12 h-12 rounded-full border-2 border-slate-600"
                                    style={{ backgroundColor: entry.color }}
                                  />
                                  <div className="flex flex-col">
                                    <span className="text-sm font-medium text-slate-200">
                                      {colorNames[entry.color] || entry.color}
                                    </span>
                                    <span className="text-xs text-slate-400">
                                      Color sólido
                                    </span>
                                  </div>
                                </div>
                              )}
                            </td>
                            <td className="p-3">
                              {isDrawing ? (
                                <button
                                  onClick={async () => {
                                    try {
                                      setAnalyzing(true)
                                      const analysis = await analyzeImageColors(entry.color)
                                      setCurrentAnalysis({
                                        entry,
                                        colors: analysis
                                      })
                                      setShowAnalysisPopup(true)
                                    } catch (err) {
                                      console.error('Error analyzing:', err)
                                      alert('Error al analizar la imagen')
                                    } finally {
                                      setAnalyzing(false)
                                    }
                                  }}
                                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium"
                                  disabled={analyzing}
                                >
                                  {analyzing ? 'Analizando...' : 'Ver Análisis'}
                                </button>
                              ) : (
                                <span className="text-slate-500 text-sm">-</span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Analysis Popup */}
        {showAnalysisPopup && currentAnalysis && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">Análisis de Colores</h3>
                <button
                  onClick={() => setShowAnalysisPopup(false)}
                  className="text-slate-400 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>
              
              <div className="mb-4">
                <img
                  src={currentAnalysis.entry.thumbnail || currentAnalysis.entry.color}
                  alt="Dibujo"
                  className="w-32 h-32 rounded border border-slate-600 object-cover mx-auto"
                />
                <p className="text-center mt-2 text-slate-300">
                  {new Date(currentAnalysis.entry.date).toLocaleDateString('es-ES', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold text-lg">Distribución de Colores:</h4>
                {currentAnalysis.colors.map(({ color, percentage }, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-8 h-8 rounded-full border-2 border-white/20 flex items-center justify-center text-sm font-bold"
                        style={{ 
                          backgroundColor: getColorForName(color),
                          color: getTextColorForName(color)
                        }}
                      >
                        {color.charAt(0)}
                      </div>
                      <span className="font-medium">{color}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-slate-600 rounded-full h-2">
                        <div 
                          className="bg-blue-400 h-2 rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-slate-300 min-w-[3rem]">
                        {percentage}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
