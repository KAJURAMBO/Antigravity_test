import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
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
        onClick={(e) => { e.stopPropagation(); toggleTask(task); }}
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
        onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }}
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
  const [analyticsTimeframe, setAnalyticsTimeframe] = useState<'today' | '7d' | '30d'>('7d')
  const [scheduledDate, setScheduledDate] = useState('')
  const [listTimeframe, setListTimeframe] = useState<'today' | '7d' | '30d'>('today')
  const [listStatus, setListStatus] = useState<'active' | 'backlog' | 'done' | 'future'>('active')

  // Edit Task States
  const [isEditingTask, setIsEditingTask] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editDate, setEditDate] = useState('')
  const [openStatsDropdown, setOpenStatsDropdown] = useState<'active' | 'backlog' | 'done' | 'future' | null>(null)

  // Dropdown Refs
  const statsDropdownRef = useRef<HTMLDivElement>(null)
  const dropdownLockRef = useRef(false)

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
    const handleClickOutside = (event: MouseEvent) => {
      if (statsDropdownRef.current && !statsDropdownRef.current.contains(event.target as Node)) {
        setOpenStatsDropdown(null)
      }
    }
    window.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mousedown', handleClickOutside)
    }
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
    if (selectedTask) {
      setEditTitle(selectedTask.title)
      setEditDescription(selectedTask.description || '')
      setEditDate(new Date(selectedTask.created_at).toISOString().split('T')[0])
      setIsEditingTask(false)
    }
  }, [selectedTask])

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
          created_at: scheduledDate ? new Date(scheduledDate).toISOString() : new Date().toISOString()
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

  const handleUpdateTaskDetail = async () => {
    if (!selectedTask || !editTitle.trim()) return
    setLoading(true)
    try {
      const updated = await apiFetch(`/tasks/${selectedTask.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          title: editTitle,
          description: editDescription || null,
          created_at: editDate ? new Date(editDate).toISOString() : selectedTask.created_at
        })
      })
      setTasks(tasks.map(t => t.id === updated.id ? updated : t))
      setSelectedTask(updated)
      setIsEditingTask(false)
      showToast('Objective updated successfully! 💎')
    } catch (error) {
      console.error('Update failed:', error)
      showToast('Failed to update objective.', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Data Analytics Processing
  const chartData = useMemo(() => {
    if (analyticsTimeframe === 'today') {
      const hourlyData: { [key: number]: number } = {}
      const today = new Date().toLocaleDateString()
      
      tasks.forEach(t => {
        const d = new Date(t.created_at)
        if (d.toLocaleDateString() === today) {
          const hour = d.getHours()
          hourlyData[hour] = (hourlyData[hour] || 0) + 1
        }
      })

      return Array.from({ length: 24 }, (_, i) => ({
        name: `${i}:00`,
        tasks: hourlyData[i] || 0
      }))
    }

    const days = analyticsTimeframe === '7d' ? 7 : 30
    const futureLookahead = 3 // Forecast 3 days ahead
    const dailyData: { [key: string]: number } = {}
    
    // Generate dates: Past + Today + Future
    const timeframeDays = Array.from({ length: days + futureLookahead }).map((_, i) => {
       const d = new Date()
       // Shift: Start from (days-1) ago. 
       // i goes from 0 to (days + future - 1).
       // We want d - (days - 1) + i ?
       // Example: 7 days. i=0 should be -6 days ago. i=6 should be Today. i=9 should be Today+3.
       d.setDate(d.getDate() - (days - 1) + i)
       return {
         key: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
         date: d
       }
    })

    timeframeDays.forEach(day => {
      dailyData[`${day.key}-active`] = 0
      dailyData[`${day.key}-backlog`] = 0
      dailyData[`${day.key}-done`] = 0
      dailyData[`${day.key}-future`] = 0
    })

    tasks.forEach(t => {
      const d = new Date(t.created_at)
      const key = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      if (timeframeDays.some(td => td.key === key)) {
        if (t.is_completed) {
          dailyData[`${key}-done`] = (dailyData[`${key}-done`] || 0) + 1
        } else {
          const dDate = new Date(t.created_at)
          dDate.setHours(0, 0, 0, 0)
          const now = new Date()
          now.setHours(0, 0, 0, 0)
          
          if (dDate.getTime() === now.getTime()) {
             dailyData[`${key}-active`] = (dailyData[`${key}-active`] || 0) + 1
          } else if (dDate.getTime() < now.getTime()) {
             dailyData[`${key}-backlog`] = (dailyData[`${key}-backlog`] || 0) + 1
          } else {
             dailyData[`${key}-future`] = (dailyData[`${key}-future`] || 0) + 1
          }
        }
      }
    })

    return timeframeDays.map(d => ({
      name: analyticsTimeframe === '30d' 
        ? d.key
        : d.date.toLocaleDateString(undefined, { weekday: 'short' }),
      active: dailyData[`${d.key}-active`] || 0,
      backlog: dailyData[`${d.key}-backlog`] || 0,
      done: dailyData[`${d.key}-done`] || 0,
      future: dailyData[`${d.key}-future`] || 0
    }))
  }, [tasks, analyticsTimeframe])

  const completionData = useMemo(() => {
    const today = new Date().toLocaleDateString()
    
    // 1. Done Tasks
    const done = tasks.filter(t => t.is_completed).length

    // 2. Active Tasks (Split into Today vs Backlog)
    const activeTasks = tasks.filter(t => !t.is_completed)
    
    const activeToday = activeTasks.filter(t => {
      return new Date(t.created_at).toLocaleDateString() === today
    }).length

    // Backlog must exclude future tasks!
    const backlog = activeTasks.filter(t => {
      const d = new Date(t.created_at)
      d.setHours(0,0,0,0)
      const now = new Date()
      now.setHours(0,0,0,0)
      return d.getTime() < now.getTime()
    }).length

    const future = activeTasks.filter(t => {
       const d = new Date(t.created_at)
       d.setHours(0,0,0,0)
       const now = new Date()
       now.setHours(0,0,0,0)
       return d.getTime() > now.getTime()
    }).length

    return [
      { name: 'Done', value: done, color: '#22c55e' },
      { name: 'Active', value: activeToday, color: '#8b5cf6' },
      { name: 'Backlog', value: backlog, color: '#ef4444' },
      { name: 'Future', value: future, color: '#60a5fa' }
    ]
  }, [tasks])

  const completedTasks = tasks.filter(t => t.is_completed).length
  const activeTasksTotal = tasks.filter(t => !t.is_completed)
  
  const todayDateStr = new Date().toLocaleDateString()
  const activeTodayTasks = activeTasksTotal.filter(t => new Date(t.created_at).toLocaleDateString() === todayDateStr)
  // Backlog = Past Only (Exclude Today AND Future)
  const backlogTasks = activeTasksTotal.filter(t => {
    const d = new Date(t.created_at)
    d.setHours(0,0,0,0)
    const today = new Date()
    today.setHours(0,0,0,0)
    return d.getTime() < today.getTime()
  })
  const futureTasks = activeTasksTotal.filter(t => {
    const d = new Date(t.created_at)
    d.setHours(0,0,0,0)
    const today = new Date()
    today.setHours(0,0,0,0)
    return d.getTime() > today.getTime()
  })
  
  const activeTodayCount = activeTodayTasks.length
  const backlogCount = backlogTasks.length
  const futureCount = futureTasks.length

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
      if (listStatus === 'backlog') {
         // Backlog view only shows incomplete tasks from BEFORE today (regardless of timeframe)
         // OR strict enforcement: Backlog status ignores 'listTimeframe' usually? 
         // User Request: "Active" = Purple, "Backlog" = Red.
         // Let's rely on the definition: Backlog = Not Completed AND Date < Today.
         const d = new Date(t.created_at)
         d.setHours(0,0,0,0)
         if (d.getTime() >= now.getTime()) return false
         return !t.is_completed
         
      }
      if (listStatus === 'active') {
          // Active = Not Completed AND Date == Today (since future is separate)
          // Actually, standard "Active" usually implies "Current Focus".
          // If we separate Backlog, then "Active" in the list should probably allow the user to see tasks fitting the timeframe.
          // IF timeframe=Today, Active = Today's tasks.
          
          if (t.is_completed) return false
          // If filtering by status 'active', exclude backlog items (older than today) if we want strict separation
          // But usually timeframe handles the date.
          // Let's follow UI logic: 
          // If I click "Active" Card, I expect to see Active tasks.
          // If I click "Backlog" Card, I expect to see Backlog tasks.
          
          // Strict separation logic:
          const d = new Date(t.created_at)
          d.setHours(0,0,0,0)
          if (d.getTime() < now.getTime()) return false // Old tasks go to Backlog view
      } 
      if (listStatus === 'done' && !t.is_completed) return false

      // 2. Filter by Timeframe (Only applies to Done and Active-Future/Today?)
      // Actually if I click "Backlog", I probably want to see ALL backlog.
      if ((listStatus as string) === 'backlog') return true
      const taskDate = new Date(t.created_at)
      taskDate.setHours(0, 0, 0, 0)
      
      if (listTimeframe === 'today') {
        return taskDate.toLocaleDateString() === todayStr
      } else if (listTimeframe === '7d') {
        return isWithinDays(t.created_at, 7)
      } else if (listTimeframe === '30d') {
        return isWithinDays(t.created_at, 30)
      }
      if (listStatus === 'future') {
          const d = new Date(t.created_at)
          d.setHours(0, 0, 0, 0)
          return d.getTime() > now.getTime() && !t.is_completed
      }
      return false
    })

    return {
      focus: filteredFocus,
      backlog: tasks.filter(t => {
        const d = new Date(t.created_at)
        d.setHours(0, 0, 0, 0)
        return d.getTime() < now.getTime() && !t.is_completed
      }),
      future: tasks.filter(t => {
        const d = new Date(t.created_at)
        d.setHours(0, 0, 0, 0)
        const isFuture = d > now
        if (!isFuture) return false
        
        // Filter future tasks by selected status
        if (listStatus === 'done') return t.is_completed
        if (listStatus === 'backlog') return !t.is_completed // Future tasks aren't backlog yet, but showing them if explicitly viewing backlog might be weird. Stick to Active/Done.
        return !t.is_completed
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
                      {(['today', '7d', '30d'] as const).map((tf) => (
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-3">
                <TrendingUp size={20} className="text-primary" /> Activity Trend
              </h3>
              <div className="flex flex-wrap items-center gap-2">
                 <button 
                   onClick={() => setListStatus('backlog')}
                   className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all ${listStatus === 'backlog' ? 'bg-red-500/20 border-red-500/50' : 'bg-white/5 border-transparent hover:bg-white/10'}`}
                 >
                   <div className="w-2 h-2 rounded-full bg-red-500" />
                   <span className="text-[10px] font-black uppercase text-white/60">Backlog</span>
                   <span className="text-xs font-bold text-white">{backlogCount}</span>
                 </button>
                 <button 
                   onClick={() => setListStatus('active')}
                   className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all ${listStatus === 'active' ? 'bg-primary/20 border-primary/50' : 'bg-white/5 border-transparent hover:bg-white/10'}`}
                 >
                   <div className="w-2 h-2 rounded-full bg-primary" />
                   <span className="text-[10px] font-black uppercase text-white/60">Active</span>
                   <span className="text-xs font-bold text-white">{activeTodayCount}</span>
                 </button>
                 <button 
                   onClick={() => setListStatus('done')}
                   className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all ${listStatus === 'done' ? 'bg-green-500/20 border-green-500/50' : 'bg-white/5 border-transparent hover:bg-white/10'}`}
                 >
                   <div className="w-2 h-2 rounded-full bg-green-500" />
                   <span className="text-[10px] font-black uppercase text-white/60">Done</span>
                   <span className="text-xs font-bold text-white">{completedTasks}</span>
                 </button>
                 <button 
                   onClick={() => setListStatus('future')}
                   className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all ${listStatus === 'future' ? 'bg-blue-400/20 border-blue-400/50' : 'bg-white/5 border-transparent hover:bg-white/10'}`}
                 >
                   <div className="w-2 h-2 rounded-full bg-blue-400" />
                   <span className="text-[10px] font-black uppercase text-white/60">Future</span>
                   <span className="text-xs font-bold text-white">{futureCount}</span>
                 </button>
              </div>
            </div>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="gradientBacklog" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="gradientActive" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="gradientDone" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="gradientFuture" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#60a5fa" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff01" />
                  <XAxis dataKey="name" stroke="#ffffff30" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ background: '#1a1a1a', border: '1px solid #ffffff10', borderRadius: '12px' }}
                    itemStyle={{ color: '#ffffff' }}
                  />
                  <Area type="monotone" dataKey="backlog" stackId="1" stroke="#ef4444" fillOpacity={1} fill="url(#gradientBacklog)" strokeWidth={2} name="Backlog (Past)" />
                  <Area type="monotone" dataKey="done" stackId="1" stroke="#22c55e" fillOpacity={1} fill="url(#gradientDone)" strokeWidth={2} name="Completed" />
                  <Area type="monotone" dataKey="active" stackId="1" stroke="#8b5cf6" fillOpacity={1} fill="url(#gradientActive)" strokeWidth={2} name="Active (Today)" />
                  <Area type="monotone" dataKey="future" stackId="1" stroke="#60a5fa" fillOpacity={1} fill="url(#gradientFuture)" strokeWidth={2} name="Future (Upcoming)" />
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
            {/* Bottom Row: Stats - 3 Columns Now */}
            <div ref={statsDropdownRef} className="grid grid-cols-2 sm:grid-cols-4 gap-3 relative">
              
              {/* BACKLOG CARD (Red) */}
              <div className="relative">
                <button 
                  onMouseDown={(e) => {
                    e.stopPropagation()
                    if (dropdownLockRef.current) return
                    dropdownLockRef.current = true
                    setTimeout(() => dropdownLockRef.current = false, 300)
                    
                    setListStatus('backlog')
                    setOpenStatsDropdown(openStatsDropdown === 'backlog' ? null : 'backlog')
                  }}
                  className={`w-full glass p-3 sm:p-4 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-2 transition-all active:scale-[0.98] ${listStatus === 'backlog' ? 'border-red-500/50 bg-red-500/10' : 'border-white/5 bg-white/[0.02] hover:bg-white/5'}`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full bg-red-500 ${listStatus === 'backlog' ? 'shadow-[0_0_8px_rgba(239,68,68,0.5)]' : ''}`} />
                    <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Backlog</span>
                  </div>
                  <span className="text-white font-black text-sm">{backlogCount}</span>
                </button>

                <AnimatePresence>
                  {openStatsDropdown === 'backlog' && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute top-full left-0 right-0 mt-2 z-50 glass-card border border-white/10 p-2 overflow-hidden shadow-2xl"
                    >
                      <div className="max-h-[300px] overflow-y-auto custom-scrollbar space-y-1">
                        {backlogTasks.length > 0 ? (
                          backlogTasks.map(t => (
                            <button
                              key={t.id}
                              onClick={() => {
                                setSelectedTask(t)
                                setOpenStatsDropdown(null)
                              }}
                              className="w-full text-left p-3 hover:bg-white/5 rounded-xl transition-all group"
                            >
                              <p className="text-[10px] font-bold text-white/80 group-hover:text-red-500 truncate">{t.title}</p>
                              <div className="flex items-center justify-between mt-1">
                                <p className="text-[8px] text-white/30 uppercase tracking-tighter">View Details →</p>
                                <span className="text-[8px] text-red-400 font-mono">{new Date(t.created_at).toLocaleDateString()}</span>
                              </div>
                            </button>
                          ))
                        ) : (
                          <p className="p-4 text-[10px] text-white/30 italic text-center">No backlog debt 💎</p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* ACTIVE CARD (Purple) */}
              <div className="relative">
                <button 
                  onMouseDown={(e) => {
                    e.stopPropagation()
                    if (dropdownLockRef.current) return
                    dropdownLockRef.current = true
                    setTimeout(() => dropdownLockRef.current = false, 300)
                    
                    setListStatus('active')
                    setOpenStatsDropdown(openStatsDropdown === 'active' ? null : 'active')
                  }}
                  className={`w-full glass p-3 sm:p-4 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-2 transition-all active:scale-[0.98] ${listStatus === 'active' ? 'border-primary/50 bg-primary/10' : 'border-white/5 bg-white/[0.02] hover:bg-white/5'}`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full bg-primary ${listStatus === 'active' ? 'shadow-[0_0_8px_rgba(139,92,246,0.5)]' : ''}`} />
                    <span className="text-[9px] font-black text-white/40 uppercase tracking-widest hidden sm:block">Active</span>
                    <span className="text-[9px] font-black text-white/40 uppercase tracking-widest sm:hidden">Today</span>
                  </div>
                  <span className="text-white font-black text-sm">{activeTodayCount}</span>
                </button>

                <AnimatePresence>
                  {openStatsDropdown === 'active' && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute top-full left-0 right-0 mt-2 z-50 glass-card border border-white/10 p-2 overflow-hidden shadow-2xl"
                    >
                      <div className="max-h-[300px] overflow-y-auto custom-scrollbar space-y-1">
                        {activeTodayTasks.length > 0 ? (
                          activeTodayTasks.map(t => (
                            <button
                              key={t.id}
                              onClick={() => {
                                setSelectedTask(t)
                                setOpenStatsDropdown(null)
                              }}
                              className="w-full text-left p-3 hover:bg-white/5 rounded-xl transition-all group"
                            >
                              <p className="text-[10px] font-bold text-white/80 group-hover:text-primary truncate">{t.title}</p>
                              <p className="text-[8px] text-white/30 uppercase tracking-tighter">View Mission Details →</p>
                            </button>
                          ))
                        ) : (
                          <p className="p-4 text-[10px] text-white/30 italic text-center">No active missions today 💎</p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* DONE CARD (Green) */}
              <div className="relative">
                <button 
                  onMouseDown={(e) => {
                    e.stopPropagation()
                    if (dropdownLockRef.current) return
                    dropdownLockRef.current = true
                    setTimeout(() => dropdownLockRef.current = false, 300)
                    
                    setListStatus('done')
                    setOpenStatsDropdown(openStatsDropdown === 'done' ? null : 'done')
                  }}
                  className={`w-full glass p-3 sm:p-4 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-2 transition-all active:scale-[0.98] ${listStatus === 'done' ? 'border-green-500/50 bg-green-500/10' : 'border-white/5 bg-white/[0.02] hover:bg-white/5'}`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full bg-green-500 ${listStatus === 'done' ? 'shadow-[0_0_8px_rgba(34,197,94,0.5)]' : ''}`} />
                    <span className="text-[9px] font-black text-white/40 uppercase tracking-widest hidden sm:block">Done</span>
                    <span className="text-[9px] font-black text-white/40 uppercase tracking-widest sm:hidden">Done</span>
                  </div>
                  <span className="text-white font-black text-sm">{completedTasks}</span>
                </button>

                <AnimatePresence>
                  {openStatsDropdown === 'done' && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute top-full left-0 right-0 mt-2 z-50 glass-card border border-white/10 p-2 overflow-hidden shadow-2xl"
                    >
                      <div className="max-h-[300px] overflow-y-auto custom-scrollbar space-y-1">
                        {tasks.filter(t => t.is_completed).length > 0 ? (
                          tasks.filter(t => t.is_completed).map(t => (
                            <button
                              key={t.id}
                              onClick={() => {
                                setSelectedTask(t)
                                setOpenStatsDropdown(null)
                              }}
                              className="w-full text-left p-3 hover:bg-white/5 rounded-xl transition-all group"
                            >
                              <p className="text-[10px] font-bold text-white/80 group-hover:text-green-500 truncate">{t.title}</p>
                              <p className="text-[8px] text-white/30 uppercase tracking-tighter">View Success Log →</p>
                            </button>
                          ))
                        ) : (
                          <p className="p-4 text-[10px] text-white/30 italic text-center">No missions completed 💎</p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* FUTURE CARD (Blue) */}
              <div className="relative">
                <button 
                  onMouseDown={(e) => {
                    e.stopPropagation()
                    if (dropdownLockRef.current) return
                    dropdownLockRef.current = true
                    setTimeout(() => dropdownLockRef.current = false, 300)
                    
                    setListStatus('future')
                    setOpenStatsDropdown(openStatsDropdown === 'future' ? null : 'future')
                  }}
                  className={`w-full glass p-3 sm:p-4 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-2 transition-all active:scale-[0.98] ${listStatus === 'future' ? 'border-blue-400/50 bg-blue-400/10' : 'border-white/5 bg-white/[0.02] hover:bg-white/5'}`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full bg-blue-400 ${listStatus === 'future' ? 'shadow-[0_0_8px_rgba(96,165,250,0.5)]' : ''}`} />
                    <span className="text-[9px] font-black text-white/40 uppercase tracking-widest hidden sm:block">Future</span>
                    <span className="text-[9px] font-black text-white/40 uppercase tracking-widest sm:hidden">Future</span>
                  </div>
                  <span className="text-white font-black text-sm">{futureCount}</span>
                </button>

                <AnimatePresence>
                  {openStatsDropdown === 'future' && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute bottom-full left-0 right-0 mb-2 z-50 glass-card border border-white/10 p-2 overflow-hidden shadow-2xl"
                    >
                      <div className="max-h-[300px] overflow-y-auto custom-scrollbar space-y-1">
                        {futureTasks.length > 0 ? (
                          futureTasks.map(t => (
                            <button
                              key={t.id}
                              onClick={() => {
                                setSelectedTask(t)
                                setOpenStatsDropdown(null)
                              }}
                              className="w-full text-left p-3 hover:bg-white/5 rounded-xl transition-all group"
                            >
                              <p className="text-[10px] font-bold text-white/80 group-hover:text-blue-400 truncate">{t.title}</p>
                              <div className="flex items-center justify-between mt-1">
                                <p className="text-[8px] text-white/30 uppercase tracking-tighter">View Details →</p>
                                <span className="text-[8px] text-blue-300 font-mono">{new Date(t.created_at).toLocaleDateString()}</span>
                              </div>
                            </button>
                          ))
                        ) : (
                          <p className="p-4 text-[10px] text-white/30 italic text-center">No future missions scheduled 💎</p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
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
              
              <div className="flex flex-col gap-2 sm:gap-3">
                <label className="text-[9px] sm:text-[10px] font-black text-white/30 uppercase tracking-[0.2em] px-4">Schedule Objective (Optional)</label>
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="input-premium h-11 sm:h-14 text-xs px-4 sm:px-6 text-primary scheme-dark"
                />
                <p className="text-[8px] sm:text-[9px] text-white/20 italic px-4">Leave empty for today.</p>
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
              <div className="flex flex-wrap p-1 bg-black/20 rounded-xl border border-white/5">
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

              <div className="flex flex-wrap p-1 bg-black/20 rounded-xl border border-white/5">
                {(['backlog', 'active', 'done', 'future'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setListStatus(st)}
                    className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.15em] rounded-lg transition-all flex items-center gap-2 ${
                      listStatus === st 
                      ? (st === 'backlog' ? 'bg-red-500' : st === 'active' ? 'bg-primary' : st === 'done' ? 'bg-green-600' : 'bg-blue-400') + ' text-white shadow-lg shadow-white/10' 
                      : 'text-white/30 hover:text-white'
                    }`}
                  >
                    {st === 'backlog' ? '⚠️' : st === 'active' ? <Clock size={10} /> : st === 'done' ? <CheckCircle2 size={10} /> : <Calendar size={10} />}
                    {st === 'backlog' ? 'BACKLOG' : st.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Dynamic Focus Section */}
            <div className="space-y-6">
              <div className="flex items-center justify-between px-4">
                <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-[0.3em] flex items-center gap-3">
                  {listTimeframe === 'today' ? "Today's" : listTimeframe.toUpperCase()} Focus 
                  <span className={`w-2 h-2 rounded-full ${listStatus === 'backlog' ? 'bg-red-500' : listStatus === 'active' ? 'bg-primary shadow-[0_0_8px_rgba(139,92,246,0.5)]' : listStatus === 'done' ? 'bg-green-500' : 'bg-blue-400'}`} />
                </h2>
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${listStatus === 'backlog' ? 'bg-red-500/10 text-red-500' : listStatus === 'active' ? 'bg-primary/10 text-primary' : listStatus === 'done' ? 'bg-green-500/10 text-green-500' : 'bg-blue-400/10 text-blue-400'}`}>
                  {listStatus === 'backlog' ? 'BACKLOG' : listStatus.toUpperCase()}
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

            {/* Future Objectives - Hide if viewing backlog */}
            {categorizedTasks.future.length > 0 && listStatus !== 'backlog' && (
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
              onMouseDown={() => {
                setSelectedTask(null)
                setIsEditingTask(false)
              }}
              className="absolute inset-0 bg-[#0a0a0a]/80 backdrop-blur-xl"
            />
            
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.1 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-2xl glass-card border border-white/10 p-1 overflow-hidden"
            >
              <div className="bg-[#0a0a0a] rounded-[28px] p-8 space-y-8 max-h-[80vh] overflow-y-auto custom-scrollbar">
                <div className="flex items-start justify-between gap-6">
                  <div className="space-y-4 flex-1">
                    <div className="flex items-center gap-3 text-primary">
                      <ListTodo size={20} />
                      <span className="text-[10px] font-black uppercase tracking-[0.2em]">
                        {isEditingTask ? 'Editing Objective' : 'Objective Details'}
                      </span>
                    </div>
                    
                    {isEditingTask ? (
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-4 text-2xl font-black text-white focus:border-primary outline-none transition-all"
                        placeholder="Objective title..."
                      />
                    ) : (
                      <h2 className="text-4xl font-black text-white leading-tight break-words">
                        {selectedTask.title}
                      </h2>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {!isEditingTask && (
                      <button 
                        onClick={() => setIsEditingTask(true)}
                        className="px-4 py-2 bg-primary/10 hover:bg-primary/20 rounded-xl transition-all text-primary border border-primary/20 flex items-center gap-2 font-black text-[10px] tracking-widest"
                      >
                        <TrendingUp size={16} />
                        EDIT
                      </button>
                    )}
                    <button 
                      onClick={() => {
                        setSelectedTask(null)
                        setIsEditingTask(false)
                      }}
                      className="p-3 hover:bg-white/5 rounded-2xl transition-all text-white/30 hover:text-white border border-transparent hover:border-white/10"
                    >
                      <X size={24} />
                    </button>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="p-6 bg-white/[0.02] rounded-3xl border border-white/5 space-y-4">
                    <h4 className="text-[10px] font-black text-white/20 uppercase tracking-widest">Description</h4>
                    {isEditingTask ? (
                      <textarea
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-3 sm:p-4 text-base sm:text-lg text-muted-foreground min-h-[120px] sm:min-h-[150px] focus:border-primary outline-none transition-all resize-none"
                        placeholder="Break down the details..."
                      />
                    ) : (
                      <p className="text-xl text-muted-foreground leading-relaxed break-words whitespace-pre-wrap">
                        {selectedTask.description || "No specific details provided for this objective. 💎"}
                      </p>
                    )}
                  </div>

                  {isEditingTask ? (
                    <div className="flex flex-col gap-2 sm:gap-3">
                      <label className="text-[9px] sm:text-[10px] font-black text-white/20 uppercase tracking-widest px-4">Reschedule Objective</label>
                      <input
                        type="date"
                        value={editDate}
                        onChange={(e) => setEditDate(e.target.value)}
                        className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-3 sm:p-4 text-sm sm:text-base text-white focus:border-primary outline-none transition-all scheme-dark"
                      />
                    </div>
                  ) : (
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
                  )}
                </div>

                <div className="flex gap-4">
                  {isEditingTask ? (
                    <>
                      <button
                        onClick={() => setIsEditingTask(false)}
                        className="flex-1 h-16 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-white font-black tracking-widest text-xs uppercase transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleUpdateTaskDetail}
                        disabled={loading || !editTitle.trim()}
                        className="flex-3 h-16 bg-gradient-to-r from-primary to-blue-600 rounded-2xl text-white font-black tracking-widest text-xs uppercase shadow-xl shadow-primary/20 transition-all active:scale-[0.98]"
                      >
                        {loading ? <Clock size={20} className="animate-spin mx-auto" /> : 'Save Mission Updates'}
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setSelectedTask(null)}
                      className="w-full h-16 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-white font-black tracking-widest text-xs uppercase transition-all active:scale-[0.98]"
                    >
                      Return to Dashboard
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default App
