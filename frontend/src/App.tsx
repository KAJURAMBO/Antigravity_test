import { useState, useEffect, useMemo, useCallback } from 'react'
import { Trash2, Check, Layout, Calendar, Clock, ListTodo, TrendingUp, BarChart, CheckCircle2, LogOut, User as UserIcon, X } from 'lucide-react'
import { motion, AnimatePresence, useMotionValue, useSpring } from 'framer-motion'
import { 
  AreaChart, Area, XAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart as ReBarChart, Bar, Cell
} from 'recharts'
import { GoogleLogin, googleLogout } from '@react-oauth/google'

interface Task {
  id: number
  title: string
  description: string | null
  is_completed: boolean
  created_at: string
  updated_at: string | null
}

interface UserProfile {
  id: number
  email: string
  full_name: string | null
  picture: string | null
  bio: string | null
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const TaskCard = ({ task, toggleTask, deleteTask, setSelectedTask, formatTaskDate }: { 
  task: Task, 
  toggleTask: (t: Task) => void, 
  deleteTask: (id: number) => void, 
  setSelectedTask: (t: Task) => void, 
  formatTaskDate: (d: string) => any
}) => (
  <motion.div
    layout
    initial={{ opacity: 0, scale: 0.95, y: 20 }}
    animate={{ opacity: 1, scale: 1, y: 0 }}
    exit={{ opacity: 0, scale: 0.95, x: 20 }}
    className={`glass-card p-1 relative border border-white/10 group ${task.is_completed ? 'opacity-40 grayscale-[0.8]' : ''}`}
  >
    <div className={`p-6 rounded-[22px] flex items-start gap-6 bg-gradient-to-br ${task.is_completed ? 'from-white/[0.02] to-transparent' : 'from-white/[0.05] to-transparent'}`}>
      <button
        onClick={() => toggleTask(task)}
        className={`flex-shrink-0 w-10 h-10 rounded-2xl border-2 flex items-center justify-center transition-all transform active:scale-90 ${
          task.is_completed
            ? 'bg-gradient-to-br from-primary to-blue-600 border-transparent shadow-xl shadow-primary/30'
            : 'border-white/10 hover:border-primary/50 bg-white/5'
        }`}
      >
        {task.is_completed && <Check size={24} className="text-white font-black" />}
      </button>

      <div 
        className="flex-1 min-w-0 cursor-pointer group/title"
        onClick={() => setSelectedTask(task)}
      >
        <h3 className={`text-2xl font-black truncate mb-2 transition-colors ${task.is_completed ? 'line-through text-muted-foreground' : 'text-white group-hover/title:text-primary'}`}>
          {task.title}
        </h3>
        {task.description && (
          <p className={`text-lg leading-relaxed mb-4 line-clamp-2 ${task.is_completed ? 'text-muted-foreground/40' : 'text-muted-foreground'}`}>
            {task.description}
          </p>
        )}
        
        <div className="flex flex-wrap items-center gap-4 text-[11px] font-black text-muted-foreground/40 uppercase tracking-[0.1em]">
          <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-xl border border-white/5">
            <Calendar size={13} className="text-primary" />
            {formatTaskDate(task.created_at).full}
          </div>
          <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-xl border border-white/5">
            <Clock size={13} className="text-blue-400" />
            {formatTaskDate(task.created_at).time}
          </div>
          {task.is_completed && (
             <div className="flex items-center gap-2 bg-green-500/10 px-3 py-1.5 rounded-xl border border-green-500/20 text-green-500">
              <CheckCircle2 size={13} />
              COMPLETED
            </div>
          )}
        </div>
      </div>

      <button
        onClick={() => deleteTask(task.id)}
        className="p-4 text-muted-foreground/30 hover:text-red-500 hover:bg-red-500/10 rounded-2xl transition-all transform hover:scale-110"
      >
        <Trash2 size={24} />
      </button>
    </div>
  </motion.div>
)

function App() {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'))
  const [tasks, setTasks] = useState<Task[]>([])
  const [newTask, setNewTask] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)
  const [devUsername, setDevUsername] = useState('')
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [analyticsTimeframe, setAnalyticsTimeframe] = useState<'7d' | '30d'>('7d')
  const [scheduledDate, setScheduledDate] = useState('')
  const [listTimeframe, setListTimeframe] = useState<'today' | '7d' | '30d'>('today')
  const [listStatus, setListStatus] = useState<'active' | 'done'>('active')

  // Cursor Tracking
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  const springConfig = { damping: 25, stiffness: 150 }
  const springX = useSpring(mouseX, springConfig)
  const springY = useSpring(mouseY, springConfig)

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX)
      mouseY.set(e.clientY)
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [mouseX, mouseY])

  const apiFetch = useCallback(async (endpoint: string, options: RequestInit = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...options.headers,
    }

    const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers })
    
    if (response.status === 401) {
      handleLogout()
      throw new Error('Unauthorized')
    }

    if (response.status === 204) return null
    return response.json()
  }, [token])

  const fetchTasks = useCallback(async () => {
    if (!token) return
    try {
      const data = await apiFetch('/tasks/')
      setTasks(data)
    } catch (error) {
      console.error('Error fetching tasks:', error)
    }
  }, [token, apiFetch])

  const fetchUserProfile = useCallback(async () => {
    if (!token) {
      setAuthLoading(false)
      return
    }
    try {
      const data = await apiFetch('/users/me')
      setUser(data)
    } catch (error) {
      console.error('Error fetching profile:', error)
      handleLogout()
    } finally {
      setAuthLoading(false)
    }
  }, [token, apiFetch])

  const formatTaskDate = (dateString: string) => {
    const date = new Date(dateString)
    return {
      full: date.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }),
      time: date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
    }
  }

  useEffect(() => {
    fetchUserProfile()
  }, [fetchUserProfile])

  useEffect(() => {
    if (user) {
      fetchTasks()
    }
  }, [user, fetchTasks])

  const handleLoginSuccess = async (credentialResponse: any) => {
    setAuthLoading(true)
    try {
      const response = await fetch(`${API_URL}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: credentialResponse.credential })
      })
      const data = await response.json()
      localStorage.setItem('token', data.access_token)
      setToken(data.access_token)
      setUser(data.user)
    } catch (error) {
      console.error('Login failed:', error)
    } finally {
      setAuthLoading(false)
    }
  }

  const handleDevLogin = async (username: string) => {
    setAuthLoading(true)
    console.log('Attempting Dev Login for:', username, 'at', `${API_URL}/auth/dev`)
    try {
      const response = await fetch(`${API_URL}/auth/dev`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      })
      
      console.log('Dev Login Response Status:', response.status)
      if (!response.ok) {
        throw new Error(`Login failed with status: ${response.status}`)
      }

      const data = await response.json()
      console.log('Dev Login successful, setting user...')
      
      localStorage.setItem('token', data.access_token)
      setToken(data.access_token)
      setUser(data.user)
    } catch (error) {
      console.error('Dev login failed:', error)
      setToast({ message: 'Login connection failed. Check if Backend is running!', type: 'error' })
    } finally {
      setAuthLoading(false)
    }
  }

  const handleLogout = () => {
    googleLogout()
    localStorage.removeItem('token')
    setToken(null)
    setUser(null)
    setTasks([])
  }

  const createTask = async () => {
    if (!newTask.trim() || !user) return
    
    setLoading(true)
    try {
      const data = await apiFetch('/tasks/', {
        method: 'POST',
        body: JSON.stringify({
          title: newTask,
          description: newDescription || null,
          is_completed: false,
          created_at: scheduledDate ? new Date(scheduledDate).toISOString() : null
        })
      })
      setTasks([data, ...tasks])
      setNewTask('')
      setNewDescription('')
      setScheduledDate('')
    } catch (error) {
      console.error('Error creating task:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleTask = async (task: Task) => {
    try {
      const data = await apiFetch(`/tasks/${task.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_completed: !task.is_completed })
      })
      setTasks(tasks.map(t => t.id === task.id ? data : t))
    } catch (error) {
      console.error('Error updating task:', error)
    }
  }

  const deleteTask = async (id: number) => {
    try {
      await apiFetch(`/tasks/${id}`, { method: 'DELETE' })
      setTasks(tasks.filter(t => t.id !== id))
    } catch (error) {
      console.error('Error deleting task:', error)
    }
  }

  // Data Analytics Processing
  const chartData = useMemo(() => {
    const days = analyticsTimeframe === '7d' ? 7 : 30
    const dailyData: { [key: string]: number } = {}
    
    const timeframeDays = Array.from({ length: days }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - i)
      return {
        key: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        display: analyticsTimeframe === '30d' 
          ? d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
          : d.toLocaleDateString(undefined, { weekday: 'short' })
      }
    }).reverse()

    timeframeDays.forEach(day => dailyData[day.key] = 0)

    tasks.forEach(task => {
      const taskDate = new Date(task.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      if (dailyData[taskDate] !== undefined) dailyData[taskDate]++
    })

    return timeframeDays.map(day => ({ name: day.display, tasks: dailyData[day.key] }))
  }, [tasks, analyticsTimeframe])

  const completionData = useMemo(() => {
    const completed = tasks.filter(t => t.is_completed).length
    const active = tasks.length - completed
    return [
      { name: 'Active', value: active, color: '#8b5cf6' },
      { name: 'Done', value: completed, color: '#22c55e' }
    ]
  }, [tasks])

  const pendingTasks = tasks.filter(t => !t.is_completed).length
  const completedTasks = tasks.filter(t => t.is_completed).length

  const [showProfile, setShowProfile] = useState(false)
  const [profileSaving, setProfileSaving] = useState(false)
  
  // Task Grouping Logic
  const categorizedTasks = useMemo(() => {
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const todayStr = now.toLocaleDateString()
    
    // Helper to check if a date is within X days from now
    const isWithinDays = (dateStr: string, days: number) => {
      const d = new Date(dateStr)
      d.setHours(0, 0, 0, 0)
      const diffTime = now.getTime() - d.getTime()
      const diffDays = diffTime / (1000 * 60 * 60 * 24)
      return diffDays >= 0 && diffDays < days
    }

    const filteredFocus = tasks.filter(t => {
      // 1. Filter by Status
      if (listStatus === 'active' && t.is_completed) return false
      if (listStatus === 'done' && !t.is_completed) return false

      // 2. Filter by Timeframe
      const taskDate = new Date(t.created_at)
      taskDate.setHours(0, 0, 0, 0)
      
      if (listTimeframe === 'today') {
        return taskDate.toLocaleDateString() === todayStr
      } else if (listTimeframe === '7d') {
        return isWithinDays(t.created_at, 7)
      } else if (listTimeframe === '30d') {
        return isWithinDays(t.created_at, 30)
      }
      return false
    })

    return {
      focus: filteredFocus,
      backlog: tasks.filter(t => {
        const d = new Date(t.created_at)
        d.setHours(0, 0, 0, 0)
        return d < now && !t.is_completed
      }),
      future: tasks.filter(t => {
        const d = new Date(t.created_at)
        d.setHours(0, 0, 0, 0)
        const isFuture = d > now
        if (!isFuture) return false
        
        // Filter future tasks by selected status
        return listStatus === 'active' ? !t.is_completed : t.is_completed
      })
    }
  }, [tasks, listTimeframe, listStatus])
  const [editingName, setEditingName] = useState('')
  const [editingBio, setEditingBio] = useState('')
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    if (user) {
      setEditingName(user.full_name || '')
      setEditingBio(user.bio || '')
    }
  }, [user])

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleUpdateProfile = async () => {
    if (!user) return
    setProfileSaving(true)
    try {
      const data = await apiFetch('/users/me', {
        method: 'PATCH',
        body: JSON.stringify({
          full_name: editingName,
          bio: editingBio
        })
      })
      setUser(data)
      showToast('Profile updated successfully! ✨')
    } catch (error) {
      console.error('Error updating profile:', error)
      showToast('Failed to update profile.', 'error')
    } finally {
      setProfileSaving(false)
    }
  }

  const handlePictureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return
    const formData = new FormData()
    formData.append('file', e.target.files[0])

    try {
      const response = await fetch(`${API_URL}/users/me/picture`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })
      const data = await response.json()
      setUser({ ...user!, picture: data.picture_url })
      showToast('Avatar updated! 📸')
    } catch (error) {
      console.error('Error uploading picture:', error)
      showToast('Upload failed.', 'error')
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <Clock size={48} className="text-primary animate-spin" />
          <p className="text-white font-bold tracking-widest animate-pulse">AUTHENTICATING...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="relative min-h-screen bg-[#0a0a0a] flex items-center justify-center overflow-hidden">
        {/* Background Blobs */}
        <div className="fixed top-[-10%] right-[-10%] w-[500px] h-[500px] opacity-20 blur-[100px] pointer-events-none">
          <div className="w-full h-full bg-primary rounded-full animate-pulse" />
        </div>
        <div className="fixed bottom-[-10%] left-[-10%] w-[400px] h-[400px] opacity-10 blur-[80px] pointer-events-none">
          <div className="w-full h-full bg-blue-600 rounded-full" />
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass p-12 rounded-[40px] border border-white/5 max-w-lg w-full text-center space-y-10 relative z-10"
        >
          <div className="space-y-4">
            <div className="w-24 h-24 bg-primary/20 rounded-[32px] flex items-center justify-center mx-auto mb-8">
              <Layout size={48} className="text-primary" />
            </div>
            <h1 className="text-5xl font-black text-white tracking-tight">Focus Flow</h1>
            <p className="text-xl text-muted-foreground font-medium">Elevate your productivity with a premium task management experience. ✨</p>
          </div>

          <div className="flex flex-col items-center gap-6">
            <GoogleLogin
              onSuccess={handleLoginSuccess}
              onError={() => console.log('Login Failed')}
              theme="filled_black"
              shape="pill"
              size="large"
            />
            <p className="text-xs text-muted-foreground uppercase tracking-widest font-black opacity-30">Secure Google Authentication</p>
          </div>

          {['localhost', '127.0.0.1'].includes(window.location.hostname) && (
            <div className="pt-8 border-t border-white/5 space-y-4">
              <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Developer Access</h3>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={devUsername}
                  onChange={(e) => setDevUsername(e.target.value)}
                  placeholder="Test Username"
                  className="input-premium h-12 text-sm text-center flex-1"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') handleDevLogin(devUsername)
                  }}
                />
                <button 
                  onClick={() => handleDevLogin(devUsername)}
                  disabled={!devUsername.trim() || authLoading}
                  className="px-4 h-12 glass rounded-2xl border border-white/5 text-primary hover:bg-primary/10 transition-all font-black text-[10px] uppercase tracking-widest whitespace-nowrap"
                >
                  {authLoading ? '...' : 'Login'}
                </button>
              </div>
              <p className="text-[9px] text-white/20 italic">Enter a name and click Login to simulate a profile locally.</p>
            </div>
          )}
        </motion.div>
      </div>
    )
  }

  if (showProfile) {
    return (
      <div className="relative min-h-screen py-8 px-4 sm:px-6 lg:px-12 overflow-hidden bg-[#0a0a0a]">
        <motion.div 
          className="cursor-spotlight"
          style={{ x: springX, y: springY, translateX: '-50%', translateY: '-50%' }}
        />
        
        <div className="relative max-w-4xl mx-auto space-y-12">
          {/* Header */}
          <div className="flex items-center justify-between">
            <button 
              onClick={() => setShowProfile(false)}
              className="flex items-center gap-2 text-white/40 hover:text-white transition-colors group"
            >
              <Layout size={20} className="group-hover:text-primary transition-colors" />
              <span className="text-sm font-black uppercase tracking-widest">Back to Board</span>
            </button>
            <h1 className="text-2xl font-black text-white tracking-tighter uppercase italic">User Profile</h1>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-12 items-start">
            {/* Left: Avatar Upload */}
            <div className="md:col-span-4 space-y-6">
              <div className="glass p-8 rounded-[40px] border border-white/5 text-center relative group">
                <div className="relative w-32 h-32 mx-auto mb-6">
                  {user.picture ? (
                    <img src={user.picture.startsWith('/') ? `${API_URL}${user.picture}` : user.picture} className="w-full h-full rounded-[32px] object-cover border-4 border-white/5 shadow-2xl" alt="" />
                  ) : (
                    <div className="w-full h-full rounded-[32px] bg-white/5 flex items-center justify-center border-4 border-white/5">
                      <UserIcon size={48} className="text-white/20" />
                    </div>
                  )}
                  <label className="absolute -bottom-2 -right-2 w-10 h-10 bg-primary rounded-2xl flex items-center justify-center cursor-pointer hover:scale-110 active:scale-95 transition-all shadow-xl shadow-primary/40">
                    <LogOut size={16} className="text-white -rotate-90" />
                    <input type="file" className="hidden" onChange={handlePictureUpload} accept="image/*" />
                  </label>
                </div>
                <h3 className="text-xl font-black text-white truncate">{user.full_name || 'User'}</h3>
                <p className="text-xs text-white/30 font-bold truncate">{user.email}</p>
              </div>
            </div>

            {/* Right: Personalization Form */}
            <div className="md:col-span-8 space-y-8">
              <div className="glass p-10 rounded-[40px] border border-white/5 space-y-8">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-primary uppercase tracking-[0.2em] ml-2">Display Name</label>
                    <input 
                      type="text" 
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      placeholder="Identify yourself..."
                      className="input-premium h-14"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-primary uppercase tracking-[0.2em] ml-2">Bio / Objectives</label>
                    <textarea 
                      value={editingBio}
                      onChange={(e) => setEditingBio(e.target.value)}
                      placeholder="What drives you? 🚀"
                      className="input-premium py-4 min-h-[120px] resize-none"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <button 
                    onClick={handleUpdateProfile}
                    disabled={profileSaving}
                    className="button-premium flex-1 bg-gradient-to-r from-primary to-blue-600 h-14 text-sm font-black tracking-[0.1em]"
                  >
                    {profileSaving ? 'SYNCHRONIZING...' : 'SAVE CHANGES'}
                  </button>
                  <button 
                     onClick={handleLogout}
                     className="px-6 h-14 glass rounded-2xl border border-white/5 text-red-500 hover:bg-red-500/10 transition-all font-black text-xs uppercase tracking-widest"
                  >
                    Logout
                  </button>
                </div>
              </div>

              <div className="p-8 border border-dashed border-white/10 rounded-[40px] opacity-40">
                <p className="text-xs text-center text-white font-medium leading-relaxed">
                  Your profile data is securely stored and used to personalize your task management experience. 
                  Profile pictures are hosted on our secure storage.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Global Notifications inside Profile */}
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
              className={`fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] px-6 py-4 rounded-2xl border flex items-center gap-4 shadow-2xl min-w-[300px] justify-between ${
                toast.type === 'success' 
                ? 'bg-[#121212] border-green-500/30 text-green-500' 
                : 'bg-[#121212] border-red-500/30 text-red-500'
              }`}
            >
              <div className="flex items-center gap-3">
                {toast.type === 'success' ? <CheckCircle2 size={18} /> : <Clock size={18} className="rotate-45" />}
                <span className="text-xs font-black uppercase tracking-widest text-white">{toast.message}</span>
              </div>
              <button 
                onClick={() => setToast(null)}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X size={14} className="text-white/40" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen py-8 px-4 sm:px-6 lg:px-12 overflow-hidden bg-[#0a0a0a]">
      {/* Interactive Cursor Spotlight */}
      <motion.div 
        className="cursor-spotlight"
        style={{ x: springX, y: springY, translateX: '-50%', translateY: '-50%' }}
      />

      <div className="relative max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* Left Side: Analytics Dashboard */}
        <aside className="lg:col-span-5 space-y-8 order-2 lg:order-1">
          <header className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-primary/20 rounded-3xl">
                <Layout size={38} className="text-primary" />
              </div>
              <div>
                  <h1 className="text-5xl font-extrabold tracking-tight text-white leading-tight">Analytics</h1>
                  <div className="flex items-center gap-4 mt-2">
                    <p className="text-muted-foreground text-xl">Efficiency & Performance ✨</p>
                    <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
                      {(['7d', '30d'] as const).map((tf) => (
                        <button
                          key={tf}
                          onClick={() => setAnalyticsTimeframe(tf)}
                          className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
                            analyticsTimeframe === tf 
                            ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                            : 'text-white/30 hover:text-white'
                          }`}
                        >
                          {tf}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
            </div>
          </header>

          <div className="grid grid-cols-2 gap-4">
            <div className="glass p-6 rounded-3xl border border-white/5 bg-gradient-to-br from-white/[0.02] to-transparent">
              <p className="text-muted-foreground font-bold text-xs uppercase tracking-widest mb-1">{analyticsTimeframe === '7d' ? 'Weekly' : 'Monthly'} Flow</p>
              <h3 className="text-3xl font-black text-white">{tasks.length} <span className="text-sm font-medium text-muted-foreground">TASKS</span></h3>
            </div>
            <div className="glass p-6 rounded-3xl border border-white/5 bg-gradient-to-br from-white/[0.02] to-transparent">
              <p className="text-muted-foreground font-bold text-xs uppercase tracking-widest mb-1">Completion Rate</p>
              <h3 className="text-3xl font-black text-green-500">{tasks.length ? Math.round((completedTasks/tasks.length)*100) : 0}%</h3>
            </div>
          </div>

          <div className="glass p-8 rounded-3xl border border-white/5 space-y-6">
            <h3 className="text-xl font-bold text-white flex items-center gap-3">
              <TrendingUp size={20} className="text-primary" /> Activity Trend
            </h3>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorTasks" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff01" />
                  <XAxis dataKey="name" stroke="#ffffff30" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ background: '#1a1a1a', border: '1px solid #ffffff10', borderRadius: '12px' }}
                    itemStyle={{ color: '#ffffff' }}
                  />
                  <Area type="monotone" dataKey="tasks" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorTasks)" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass p-8 rounded-3xl border border-white/5 space-y-6">
            <h3 className="text-xl font-bold text-white flex items-center gap-3">
              <BarChart size={20} className="text-green-500" /> Completion Ratio
            </h3>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ReBarChart data={completionData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff01" />
                  <XAxis dataKey="name" stroke="#ffffff30" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ background: '#1a1a1a', border: '1px solid #ffffff10', borderRadius: '12px' }}
                    itemStyle={{ color: '#ffffff' }}
                  />
                  <Bar dataKey="value" radius={[10, 10, 10, 10]}>
                    {completionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </ReBarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </aside>

        {/* Right Side: To-Do App */}
        <main className="lg:col-span-7 space-y-8 order-1 lg:order-2">
          <div className="flex flex-col gap-6 pb-6 border-b border-white/10">
            {/* Top Row: Title and Profile */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/5 rounded-2xl flex items-center justify-center">
                  <ListTodo size={20} className="text-primary sm:w-6 sm:h-6" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Main Board</h2>
              </div>

              {/* Profile Section - Integrated into top row for accessibility */}
              <div 
                onClick={() => setShowProfile(true)}
                className="flex items-center gap-2 sm:gap-3 glass py-1.5 px-2 sm:px-2.5 rounded-2xl border border-white/5 bg-white/[0.02] cursor-pointer hover:bg-white/5 transition-colors"
              >
                {user.picture ? (
                  <img src={user.picture.startsWith('/') ? `${API_URL}${user.picture}` : user.picture} className="w-6 h-6 sm:w-7 sm:h-7 rounded-xl border border-white/10" alt="" />
                ) : (
                  <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-xl bg-white/10 flex items-center justify-center">
                    <UserIcon size={12} className="text-white sm:w-4 sm:h-4" />
                  </div>
                )}
                <div className="hidden sm:block">
                  <p className="text-[9px] sm:text-[10px] font-black text-white/40 uppercase tracking-widest leading-none mb-0.5">Operator</p>
                  <p className="text-xs font-bold text-white leading-none truncate max-w-[80px] sm:max-w-[100px]">{user.full_name || user.email}</p>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleLogout(); }}
                  className="p-1 sm:p-1.5 hover:bg-red-500/10 rounded-xl text-white/30 hover:text-red-500 transition-all active:scale-95"
                >
                  <LogOut size={14} className="sm:w-4 sm:h-4" />
                </button>
              </div>
            </div>

            {/* Bottom Row: Stats - Stays prominent on mobile */}
            <div className="grid grid-cols-2 gap-4">
              <div className="glass p-4 rounded-2xl border border-white/5 bg-white/[0.02] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(139,92,246,0.5)]" />
                  <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Active</span>
                </div>
                <span className="text-white font-black text-sm">{pendingTasks}</span>
              </div>
              <div className="glass p-4 rounded-2xl border border-white/5 bg-white/[0.02] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                  <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Completed</span>
                </div>
                <span className="text-white font-black text-sm">{completedTasks}</span>
              </div>
            </div>
          </div>

          <div className="glass p-8 rounded-[32px] shadow-2xl relative overflow-hidden border border-white/5">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-[80px] rounded-full pointer-events-none" />
            <h2 className="text-2xl font-black text-white mb-8 flex items-center gap-3">
              Add Task <span className="opacity-50">🚀</span>
            </h2>
            <div className="space-y-6">
              <input
                type="text"
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && createTask()}
                placeholder="What objective will you conquer today? 🔥"
                className="input-premium h-16"
              />
              <textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Break it down into details... 📝"
                className="input-premium py-5 min-h-[140px] resize-none"
              />
              
              <div className="flex flex-col gap-3">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] px-4">Schedule Objective (Optional)</label>
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="input-premium h-14 text-sm px-6 text-primary scheme-dark"
                />
                <p className="text-[9px] text-white/20 italic px-4">Leave empty to focus on this objective today.</p>
              </div>
              <button
                onClick={createTask}
                disabled={loading || !newTask.trim()}
                className="button-premium w-full h-16 text-lg bg-gradient-to-r from-primary to-blue-600 font-black tracking-wide"
              >
                {loading ? <Clock size={24} className="animate-spin" /> : 'CONQUER NOW'}
              </button>
            </div>
          </div>

          <div className="space-y-12">
            {/* Advanced Filter Bar relocated - Logic and Contextual view */}
            <div className="flex flex-wrap items-center gap-4 bg-white/[0.02] p-2 rounded-[22px] border border-white/5 mx-4">
              <div className="flex p-1 bg-black/20 rounded-xl border border-white/5">
                {(['today', '7d', '30d'] as const).map((tf) => (
                  <button
                    key={tf}
                    onClick={() => setListTimeframe(tf)}
                    className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.15em] rounded-lg transition-all ${
                      listTimeframe === tf 
                      ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                      : 'text-white/30 hover:text-white'
                    }`}
                  >
                    {tf === 'today' ? 'Today' : tf.toUpperCase()}
                  </button>
                ))}
              </div>
              
              <div className="h-6 w-px bg-white/10 hidden sm:block" />

              <div className="flex p-1 bg-black/20 rounded-xl border border-white/5">
                {(['active', 'done'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setListStatus(st)}
                    className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.15em] rounded-lg transition-all flex items-center gap-2 ${
                      listStatus === st 
                      ? (st === 'active' ? 'bg-primary' : 'bg-green-600') + ' text-white shadow-lg shadow-white/10' 
                      : 'text-white/30 hover:text-white'
                    }`}
                  >
                    {st === 'active' ? <Clock size={10} /> : <CheckCircle2 size={10} />}
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Dynamic Focus Section */}
            <div className="space-y-6">
              <div className="flex items-center justify-between px-4">
                <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-[0.3em] flex items-center gap-3">
                  {listTimeframe === 'today' ? "Today's" : listTimeframe.toUpperCase()} Focus 
                  <span className={`w-2 h-2 rounded-full ${listStatus === 'active' ? 'bg-primary shadow-[0_0_8px_rgba(139,92,246,0.5)]' : 'bg-green-500'}`} />
                </h2>
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${listStatus === 'active' ? 'bg-primary/10 text-primary' : 'bg-green-500/10 text-green-500'}`}>
                  {listStatus}
                </span>
              </div>
              
              <AnimatePresence mode="popLayout">
                {categorizedTasks.focus.length > 0 ? (
                  categorizedTasks.focus.map((task) => (
                    <TaskCard key={task.id} task={task} toggleTask={toggleTask} deleteTask={deleteTask} setSelectedTask={setSelectedTask} formatTaskDate={formatTaskDate} />
                  ))
                ) : (
                  <div className="text-center py-12 glass rounded-[32px] border border-white/5 opacity-50">
                    <p className="text-sm font-bold text-white/40 uppercase tracking-widest italic">No {listStatus} objectives in this timeframe 💎</p>
                  </div>
                )}
              </AnimatePresence>
            </div>

            {/* Backlog Section */}
            {categorizedTasks.backlog.length > 0 && (
              <div className="space-y-6">
                <div className="flex items-center justify-between px-4">
                  <h2 className="text-sm font-bold text-red-500/50 uppercase tracking-[0.3em] flex items-center gap-3">
                    Unfinished Backlog <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  </h2>
                </div>
                
                <AnimatePresence mode="popLayout">
                  {categorizedTasks.backlog.map((task) => (
                    <TaskCard key={task.id} task={task} toggleTask={toggleTask} deleteTask={deleteTask} setSelectedTask={setSelectedTask} formatTaskDate={formatTaskDate} />
                  ))}
                </AnimatePresence>
              </div>
            )}

            {/* Future Objectives */}
            {categorizedTasks.future.length > 0 && (
              <div className="space-y-6">
                <div className="flex items-center justify-between px-4">
                  <h2 className="text-sm font-bold text-blue-400 uppercase tracking-[0.3em] flex items-center gap-3">
                    Future Objectives <span className="w-2 h-2 rounded-full bg-blue-400" />
                  </h2>
                </div>
                
                <AnimatePresence mode="popLayout">
                  {categorizedTasks.future.map((task) => (
                    <TaskCard key={task.id} task={task} toggleTask={toggleTask} deleteTask={deleteTask} setSelectedTask={setSelectedTask} formatTaskDate={formatTaskDate} />
                  ))}
                </AnimatePresence>
              </div>
            )}

            {tasks.length === 0 && (
              <div className="text-center py-32 glass rounded-[40px] border border-white/5 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent pointer-events-none" />
                <div className="relative space-y-6">
                  <div className="inline-flex p-8 bg-white/5 rounded-full border border-white/10">
                    <ListTodo size={64} className="text-white/20" />
                  </div>
                  <h3 className="text-3xl font-black text-white">Your Board is Clear 💎</h3>
                  <p className="text-xl text-muted-foreground font-medium max-w-sm mx-auto">
                    Take a moment to recharge or set your next ambitious goal! 🎯
                  </p>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Global Notifications */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className={`fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] px-6 py-4 rounded-2xl border flex items-center gap-4 shadow-2xl min-w-[300px] justify-between ${
              toast.type === 'success' 
              ? 'bg-[#121212] border-green-500/30 text-green-500' 
              : 'bg-[#121212] border-red-500/30 text-red-500'
            }`}
          >
            <div className="flex items-center gap-3">
              {toast.type === 'success' ? <CheckCircle2 size={18} /> : <Clock size={18} className="rotate-45" />}
              <span className="text-xs font-black uppercase tracking-widest text-white">{toast.message}</span>
            </div>
            <button 
              onClick={() => setToast(null)}
              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X size={14} className="text-white/40" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Task Detail Modal */}
      <AnimatePresence>
        {selectedTask && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center px-4 sm:px-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedTask(null)}
              className="absolute inset-0 bg-[#0a0a0a]/80 backdrop-blur-xl"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl glass-card border border-white/10 p-1 overflow-hidden"
            >
              <div className="bg-[#0a0a0a] rounded-[28px] p-8 space-y-8 max-h-[80vh] overflow-y-auto custom-scrollbar">
                <div className="flex items-start justify-between gap-6">
                  <div className="space-y-4 flex-1">
                    <div className="flex items-center gap-3 text-primary">
                      <ListTodo size={20} />
                      <span className="text-[10px] font-black uppercase tracking-[0.2em]">Objective Details</span>
                    </div>
                    <h2 className="text-4xl font-black text-white leading-tight break-words">
                      {selectedTask.title}
                    </h2>
                  </div>
                  <button 
                    onClick={() => setSelectedTask(null)}
                    className="p-3 hover:bg-white/5 rounded-2xl transition-all text-white/30 hover:text-white border border-transparent hover:border-white/10"
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="p-6 bg-white/[0.02] rounded-3xl border border-white/5 space-y-4">
                    <h4 className="text-[10px] font-black text-white/20 uppercase tracking-widest">Description</h4>
                    <p className="text-xl text-muted-foreground leading-relaxed break-words whitespace-pre-wrap">
                      {selectedTask.description || "No specific details provided for this objective. 💎"}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <div className="px-5 py-3 bg-white/5 rounded-2xl border border-white/5 flex items-center gap-3">
                      <Calendar size={16} className="text-primary" />
                      <span className="text-xs font-bold text-white/60">
                        {formatTaskDate(selectedTask.created_at).full}
                      </span>
                    </div>
                    <div className="px-5 py-3 bg-white/5 rounded-2xl border border-white/5 flex items-center gap-3">
                      <Clock size={16} className="text-blue-400" />
                      <span className="text-xs font-bold text-white/60">
                        {formatTaskDate(selectedTask.created_at).time}
                      </span>
                    </div>
                    {selectedTask.is_completed && (
                      <div className="px-5 py-3 bg-green-500/10 rounded-2xl border border-green-500/20 flex items-center gap-3 text-green-500">
                        <CheckCircle2 size={16} />
                        <span className="text-xs font-bold uppercase tracking-widest">Mission Completed</span>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => setSelectedTask(null)}
                  className="w-full h-16 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-white font-black tracking-widest text-xs uppercase transition-all active:scale-[0.98]"
                >
                  Return to Dashboard
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default App
