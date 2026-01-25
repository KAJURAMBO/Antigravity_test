import { useState, useEffect, useMemo } from 'react'
import { Plus, Trash2, Check, Layout, Calendar, Clock, ListTodo, TrendingUp, BarChart, CheckCircle2 } from 'lucide-react'
import { motion, AnimatePresence, useMotionValue, useSpring } from 'framer-motion'
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart as ReBarChart, Bar, Cell
} from 'recharts'

interface Task {
  id: number
  title: string
  description: string | null
  is_completed: boolean
  created_at: string
  updated_at: string | null
}

const API_URL = 'http://localhost:8000'

function App() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [newTask, setNewTask] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [loading, setLoading] = useState(false)

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

  useEffect(() => {
    fetchTasks()
  }, [])

  const fetchTasks = async () => {
    try {
      const response = await fetch(`${API_URL}/tasks/`)
      const data = await response.json()
      setTasks(data)
    } catch (error) {
      console.error('Error fetching tasks:', error)
    }
  }

  const createTask = async () => {
    if (!newTask.trim()) return
    
    setLoading(true)
    try {
      const response = await fetch(`${API_URL}/tasks/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTask,
          description: newDescription || null,
          is_completed: false
        })
      })
      const data = await response.json()
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
      const response = await fetch(`${API_URL}/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_completed: !task.is_completed })
      })
      const data = await response.json()
      setTasks(tasks.map(t => t.id === task.id ? data : t))
    } catch (error) {
      console.error('Error updating task:', error)
    }
  }

  const deleteTask = async (id: number) => {
    try {
      await fetch(`${API_URL}/tasks/${id}`, { method: 'DELETE' })
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

  return (
    <div className="relative min-h-screen py-8 px-4 sm:px-6 lg:px-12 overflow-hidden">
      {/* Interactive Cursor Spotlight */}
      <motion.div 
        className="cursor-spotlight"
        style={{ x: springX, y: springY, translateX: '-50%', translateY: '-50%' }}
      />

      {/* Background Blobs */}
      <div className="fixed top-[-10%] right-[-10%] w-[500px] h-[500px] opacity-10 blur-[100px] pointer-events-none">
        <img src="/blob.png" alt="" className="w-full h-full object-contain animate-pulse" />
      </div>
      <div className="fixed bottom-[-10%] left-[-10%] w-[400px] h-[400px] opacity-5 blur-[80px] pointer-events-none rotate-180">
        <img src="/blob.png" alt="" className="w-full h-full object-contain" />
      </div>

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
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
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
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
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
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
             <div className="flex items-center gap-4">
              <img src="/illustration.png" className="w-12 h-12 object-contain" alt="" />
              <h2 className="text-3xl font-bold text-white tracking-tight">Main Board</h2>
             </div>
             <div className="flex gap-2">
               <div className="px-4 py-2 bg-white/5 rounded-2xl flex items-center gap-2 border border-white/5">
                 <CheckCircle2 size={16} className="text-green-500" />
                 <span className="text-white font-bold">{completedTasks}</span>
               </div>
               <div className="px-4 py-2 bg-white/5 rounded-2xl flex items-center gap-2 border border-white/5">
                 <Clock size={16} className="text-primary" />
                 <span className="text-white font-bold">{pendingTasks}</span>
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
