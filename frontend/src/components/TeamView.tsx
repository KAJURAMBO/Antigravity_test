import { useState, useEffect } from 'react'
import { User as UserIcon, Mail } from 'lucide-react'

// Basic types (duplicated from App.tsx for now to avoid circular deps if not separated)
interface UserProfile {
  id: number
  email: string
  full_name: string | null
  picture: string | null
}

interface TeamViewProps {
  apiFetch: (endpoint: string, options?: any) => Promise<any>
  currentUser: UserProfile
  showToast: (msg: string, type?: 'success' | 'error') => void
}

export function TeamView({ apiFetch, currentUser, showToast }: TeamViewProps) {
  const [members, setMembers] = useState<UserProfile[]>([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)

  const fetchMembers = async () => {
    try {
      const data = await apiFetch('/teams/members')
      if (data) setMembers(data)
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    fetchMembers()
  }, [])

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail.trim()) return

    setInviting(true)
    try {
      await apiFetch('/teams/invite', {
        method: 'POST',
        body: JSON.stringify({ email: inviteEmail })
      })
      showToast(`Invited ${inviteEmail}! 📧`)
      setInviteEmail('')
      fetchMembers() // Refresh list
    } catch (e) {
      console.error(e)
      showToast('Failed to invite. Check email?', 'error')
    } finally {
      setInviting(false)
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tight">Team Squad 👥</h2>
          <p className="text-muted-foreground mt-2">Collaborate with your team. Assign tasks and conquer goals together.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Members List */}
        <div className="glass p-6 rounded-[32px] border border-white/5 space-y-6">
          <h3 className="text-xl font-bold text-white flex items-center gap-3">
             Squad Members <span className="px-2 py-0.5 bg-white/10 rounded-full text-xs">{members.length}</span>
          </h3>
          
          <div className="space-y-3">
            {members.length > 0 ? (
              members.map(m => (
                <div key={m.id} className="flex items-center gap-4 p-3 hover:bg-white/5 rounded-2xl transition-all group">
                   <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 p-[2px]">
                      {m.picture ? (
                        <img src={m.picture} className="w-full h-full rounded-full object-cover bg-black" alt="" />
                      ) : (
                        <div className="w-full h-full rounded-full bg-black flex items-center justify-center">
                          <span className="font-bold text-xs text-white">{m.full_name?.[0] || m.email[0]}</span>
                        </div>
                      )}
                   </div>
                   <div className="flex-1 min-w-0">
                     <p className="text-white font-bold truncate">{m.full_name || 'Unknown Agent'}</p>
                     <p className="text-white/40 text-xs truncate">{m.email}</p>
                   </div>
                   {m.id === currentUser.id && (
                     <span className="text-[10px] font-black bg-primary/20 text-primary px-2 py-1 rounded-lg uppercase">YOU</span>
                   )}
                </div>
              ))
            ) : (
              <div className="text-center py-10">
                 <p className="text-white/30 italic">You are a lone wolf... for now. 🐺</p>
              </div>
            )}
          </div>
        </div>

        {/* Invite Form */}
        <div className="glass p-6 rounded-[32px] border border-white/5 space-y-6 h-fit">
           <h3 className="text-xl font-bold text-white flex items-center gap-3">
             <Mail size={20} className="text-blue-400" /> Invite Agent
          </h3>
          <form onSubmit={handleInvite} className="space-y-4">
            <div className="relative">
               <input 
                 type="email" 
                 value={inviteEmail}
                 onChange={e => setInviteEmail(e.target.value)}
                 className="w-full bg-black/20 border border-white/10 rounded-xl p-4 pl-12 text-white placeholder:text-white/20 focus:border-blue-400 outline-none transition-all"
                 placeholder="colleague@example.com"
               />
               <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
            </div>
            <button 
              disabled={inviting || !inviteEmail}
              className="w-full py-4 bg-blue-500 hover:bg-blue-600 active:scale-95 text-white font-black rounded-xl transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
            >
              {inviting ? 'Sending...' : 'Send Invite 🚀'}
            </button>
            <p className="text-[10px] text-white/30 text-center leading-relaxed">
              They will be added to your squad instantly.<br/>
              Make sure they have logged in at least once!
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
