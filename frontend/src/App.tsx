import { useState, useEffect, useMemo, useCallback } from 'react'
import { Trash2, Check, Layout, Calendar, Clock, ListTodo, TrendingUp, BarChart, CheckCircle2, LogOut, User as UserIcon } from 'lucide-react'
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
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function App() {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'))
  const [tasks, setTasks] = useState<Task[]>([])
  const [newTask, setNewTask] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)

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
          is_completed: false
        })
      })
      setTasks([data, ...tasks])
      setNewTask('')
      setNewDescription('')
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
    const dailyData: { [key: string]: number } = {}
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - i)
      return d.toLocaleDateString(undefined, { weekday: 'short' })
    }).reverse()

    last7Days.forEach(day => dailyData[day] = 0)

    tasks.forEach(task => {
      const day = new Date(task.created_at).toLocaleDateString(undefined, { weekday: 'short' })
      if (dailyData[day] !== undefined) dailyData[day]++
    })

    return last7Days.map(day => ({ name: day, tasks: dailyData[day] }))
  }, [tasks])

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
        </motion.div>
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
        <aside className="lg:col-span-5 space-y-8">
          <header className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-primary/20 rounded-3xl">
                <Layout size={38} className="text-primary" />
              </div>
              <div>
                <h1 className="text-5xl font-extrabold tracking-tight text-white leading-tight">Analytics</h1>
                <p className="text-muted-foreground text-xl">Efficiency & Performance ✨</p>
              </div>
            </div>
          </header>

          <div className="grid grid-cols-2 gap-4">
            <div className="glass p-6 rounded-3xl border border-white/5 bg-gradient-to-br from-white/[0.02] to-transparent">
              <p className="text-muted-foreground font-bold text-xs uppercase tracking-widest mb-1">Weekly Flow</p>
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
                    itemStyle={{ color: '#8b5cf6' }}
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
                  <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #ffffff10', borderRadius: '12px' }} />
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
        <main className="lg:col-span-7 space-y-8">
          <div className="flex flex-col sm:flex-row items-center justify-between pb-4 border-b border-white/10 gap-4">
             <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center">
                <ListTodo size={24} className="text-primary" />
              </div>
              <h2 className="text-3xl font-bold text-white tracking-tight">Main Board</h2>
             </div>
             
             <div className="flex flex-wrap items-center justify-center gap-3">
               {/* Task Status */}
                <div className="flex gap-2">
                  <div className="px-4 py-2 bg-white/5 rounded-2xl flex items-center gap-3 border border-white/5">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                      <span className="text-[10px] font-black text-white/40 uppercase tracking-widest hidden lg:block">Done</span>
                    </div>
                    <span className="text-white font-black text-sm">{completedTasks}</span>
                  </div>
                  <div className="px-4 py-2 bg-white/5 rounded-2xl flex items-center gap-3 border border-white/5">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(139,92,246,0.5)]" />
                      <span className="text-[10px] font-black text-white/40 uppercase tracking-widest hidden lg:block">Active</span>
                    </div>
                    <span className="text-white font-black text-sm">{pendingTasks}</span>
                  </div>
                </div>

               {/* Profile Section */}
               <div className="flex items-center gap-3 glass py-1.5 px-2.5 rounded-2xl border border-white/5 bg-white/[0.02]">
                  {user.picture ? (
                    <img src={user.picture} className="w-7 h-7 rounded-xl border border-white/10" alt="" />
                  ) : (
                    <div className="w-7 h-7 rounded-xl bg-white/10 flex items-center justify-center">
                      <UserIcon size={14} className="text-white" />
                    </div>
                  )}
                  <div className="hidden sm:block">
                    <p className="text-[10px] font-black text-white/40 uppercase tracking-widest leading-none mb-0.5">Operator</p>
                    <p className="text-xs font-bold text-white leading-none truncate max-w-[100px]">{user.full_name || user.email}</p>
                  </div>
                  <button 
                    onClick={handleLogout}
                    className="p-1.5 hover:bg-red-500/10 rounded-xl text-white/30 hover:text-red-500 transition-all active:scale-95"
                  >
                    <LogOut size={16} />
                  </button>
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
              <button
                onClick={createTask}
                disabled={loading || !newTask.trim()}
                className="button-premium w-full h-16 text-lg bg-gradient-to-r from-primary to-blue-600 font-black tracking-wide"
              >
                {loading ? <Clock size={24} className="animate-spin" /> : 'CONQUER NOW'}
              </button>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between px-4">
              <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-[0.3em]">ACTIVE OBJECTIVES</h2>
              <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-black">LATEST FIRST</span>
            </div>

            <AnimatePresence mode="popLayout">
              {tasks.map((task) => (
                <motion.div
                  key={task.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, x: 20 }}
                  className={`glass-card p-1 relative border border-white/5 group ${task.is_completed ? 'opacity-40 grayscale-[0.8]' : ''}`}
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

                    <div className="flex-1 min-w-0">
                      <h3 className={`text-2xl font-black truncate mb-2 ${task.is_completed ? 'line-through text-muted-foreground' : 'text-white'}`}>
                        {task.title}
                      </h3>
                      {task.description && (
                        <p className={`text-lg leading-relaxed mb-4 ${task.is_completed ? 'text-muted-foreground/40' : 'text-muted-foreground'}`}>
                          {task.description}
                        </p>
                      )}
                      
                      <div className="flex flex-wrap items-center gap-4 text-[11px] font-black text-muted-foreground/40 uppercase tracking-[0.1em]">
                        <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-xl border border-white/5">
                          <Calendar size={13} className="text-primary" />
                          {new Date(task.created_at).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                        </div>
                        <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-xl border border-white/5">
                          <Clock size={13} className="text-blue-400" />
                          {new Date(task.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
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
              ))}
            </AnimatePresence>

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
    </div>
  )
}

export default App
