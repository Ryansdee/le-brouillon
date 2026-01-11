"use client"

import { useEffect, useState } from "react"
import { db, auth, googleProvider } from "@/lib/firebase"
import { 
  signInWithPopup, 
  onAuthStateChanged, 
  signOut, 
  User 
} from "firebase/auth"
import { 
  collection, addDoc, getDocs, deleteDoc, doc, query, orderBy 
} from "firebase/firestore"
import {
  Calendar, Trash2, Lock, Unlock, FileText,
  Instagram, Feather, ChevronDown, BarChart3,
  TrendingUp, Clock, CheckCircle2, Eye, File, X, Menu, LogOut,
  Sparkles
} from "lucide-react"
import { FORMATS } from "@/lib/formats"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend
} from "recharts"

/* ---------- Configuration Sécurité ---------- */
const ADMIN_EMAILS = [
  "ryan.deschuyteneer@gmail.com",
  "badpetrova121@gmail.com"
]; 

/* ---------- Helpers ---------- */
const isUrl = (v: string) => typeof v === "string" && v.startsWith("http")
const cleanUrl = (url: string) => url.split("?")[0].toLowerCase()
const isImage = (url: string) => /\.(png|jpe?g|webp|gif)$/i.test(cleanUrl(url))
const isPdf = (url: string) => /\.pdf$/i.test(cleanUrl(url))

/* ---------- Types ---------- */
interface Submission {
  id: string
  instagram: string
  format: keyof typeof FORMATS
  subformat?: string
  date: string
  answers: Record<string, string>
  createdAt: any
}

interface BlockedDate {
  id: string
  date: string
  type?: 'admin' | 'submission'
  label?: string
}

type Tab = "overview" | "submissions" | "dates" | "wrapped" | "analytics"

export default function AdminDashboard() {
  // Auth States
  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)

  // Data States
  const [date, setDate] = useState("")
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([])
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [activeTab, setActiveTab] = useState<Tab>("overview")
  const [expandedSubmissions, setExpandedSubmissions] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // Stats Instagram (chargées depuis l'API)
  const [instagramStats, setInstagramStats] = useState<{
    mostLikedPost: {
      url: string
      likes: number
      caption: string
    } | null
  }>({ mostLikedPost: null })
  useEffect(() => {
  fetch("/api/top-post")
    .then(res => res.json())
    .then(data => {
      if (data?.url && typeof data.likeCount === "number") {
        setInstagramStats({
          mostLikedPost: {
            url: data.url,
            likes: data.likeCount,
            caption: data.caption || "@lebrouillon.mag"
          }
        })
      }
    })
    .catch(err => console.error("Erreur chargement stats Instagram:", err))
}, [])



  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startOffset = firstDay === 0 ? 6 : firstDay - 1;
    return { startOffset, daysInMonth, year, month };
  };

  // Monitor Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser && ADMIN_EMAILS.includes(currentUser.email ?? "")) {
        setUser(currentUser)
        loadData()
      } else if (currentUser) {
        signOut(auth)
        alert("Accès refusé : vous n'êtes pas administrateur.")
      } else {
        setUser(null)
      }
      setAuthLoading(false)
    })
    return () => unsubscribe()
  }, [])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const datesSnap = await getDocs(collection(db, "blocked_dates"))
      const adminBlocked = datesSnap.docs.map(d => ({ 
        id: d.id, 
        date: d.data().date,
        type: 'admin' as const,
        label: 'Administrateur'
      }))

      const submissionsSnap = await getDocs(query(collection(db, "submissions"), orderBy("createdAt", "desc")))
      const subsData = submissionsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Submission[]
      
      setSubmissions(subsData)

      const submissionBlocked = subsData.map(s => ({
        id: s.id,
        date: s.date,
        type: 'submission' as const,
        label: `@${s.instagram}`
      }))

      const allOccupiedDates = [...adminBlocked, ...submissionBlocked].sort((a, b) => 
        a.date.localeCompare(b.date)
      )
      
      setBlockedDates(allOccupiedDates) 
    } catch (error) {
      console.error("Erreur lors du chargement:", error)
    }
    setIsLoading(false)
  }

  const handleLogin = async () => {
    try { await signInWithPopup(auth, googleProvider) } catch (error) { console.error(error) }
  }

  const handleLogout = () => signOut(auth)

  const toggleSubmission = (id: string) => {
    const s = new Set(expandedSubmissions)
    s.has(id) ? s.delete(id) : s.add(id)
    setExpandedSubmissions(s)
  }

  const blockDate = async (manualDate?: string) => {
    const dateToBlock = manualDate || date;
    if (!dateToBlock) return;
    if (blockedDates.some(d => d.date === dateToBlock)) {
      alert("Cette date est déjà occupée ou bloquée.");
      return;
    }
    try {
      const docRef = await addDoc(collection(db, "blocked_dates"), {
        date: dateToBlock,
        createdAt: new Date().toISOString()
      });
      setBlockedDates(prev => [
        ...prev,
        { 
          id: docRef.id, 
          date: dateToBlock, 
          type: 'admin' as const, // Explicitly type 'admin' as a string literal
          label: 'Administrateur' 
        }
      ].sort((a, b) => a.date.localeCompare(b.date)));
      if(!manualDate) setDate("");
    } catch (error) { console.error(error); }
  };

  const unblockDate = async (id: string) => {
    await deleteDoc(doc(db, "blocked_dates", id))
    loadData()
  }

  const deleteSubmission = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette soumission ?")) return
    await deleteDoc(doc(db, "submissions", id))
    loadData()
  }

  const formatDateFr = (d: string) =>
    new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(new Date(d + "T00:00:00"))

  // --- Stats & Wrapped Logic ---
  const now = new Date()
  const todayStr = now.toISOString().split("T")[0]
  
  const submissionsThisMonth = submissions.filter(s => {
    const d = new Date(s.createdAt?.seconds ? s.createdAt.seconds * 1000 : s.date)
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  })

  const submissionsThisYear = submissions.filter(s => {
    const d = new Date(s.createdAt?.seconds ? s.createdAt.seconds * 1000 : s.date)
    return d.getFullYear() === now.getFullYear()
  })

  const countByFormat = (subs: Submission[]) => {
    const map: Record<string, number> = {}
    subs.forEach(s => { map[s.format] = (map[s.format] || 0) + 1 })
    return map
  }

  const busiestDay = (subs: Submission[]) => {
    const map: Record<string, number> = {}
    subs.forEach(s => { map[s.date] = (map[s.date] || 0) + 1 })
    return Object.entries(map).sort((a,b) => b[1] - a[1])[0]
  }

  const getTopFormat = (formats: Record<string, number>) => {
    const entries = Object.entries(formats);
    if (entries.length === 0) return null;
    return entries.sort((a, b) => b[1] - a[1])[0];
  };

  const wrappedMonth = {
    total: submissionsThisMonth.length,
    formats: countByFormat(submissionsThisMonth),
    busiestDay: busiestDay(submissionsThisMonth),
    topFormat: getTopFormat(countByFormat(submissionsThisMonth))
  }

  const wrappedYear = {
    total: submissionsThisYear.length,
    formats: countByFormat(submissionsThisYear),
    busiestDay: busiestDay(submissionsThisYear),
    topFormat: getTopFormat(countByFormat(submissionsThisYear))
  }

  const formatStats = Object.entries(countByFormat(submissions)).map(([f, count]) => ({
    format: FORMATS[f as keyof typeof FORMATS]?.label || f,
    count
  }))

  const monthlyStats = (() => {
    const map: Record<string, number> = {}
    submissions.forEach(s => {
      const d = s.createdAt?.seconds ? new Date(s.createdAt.seconds * 1000) : new Date(s.date)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      map[key] = (map[key] || 0) + 1
    })
    return Object.entries(map).sort(([a],[b]) => a.localeCompare(b)).map(([month, count]) => ({ month, count }))
  })()

  const upcoming = submissions.filter(s => s.date >= todayStr).length
  const thisWeek = submissions.filter(s => {
    const diff = new Date(s.date).getTime() - new Date(todayStr).getTime()
    return diff >= 0 && diff <= 7 * 24 * 60 * 60 * 1000
  }).length

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fcfaff]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-[#b79ff8]/20 border-t-[#a189f2] rounded-full animate-spin" />
          <p className="text-[#a189f2] font-serif italic">Vérification de l'accès...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#fcfaff] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-[2.5rem] p-10 shadow-2xl shadow-purple-100 border border-[#b79ff8]/20 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-[#b79ff8] to-[#a189f2] rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-lg rotate-3">
            <Lock className="w-10 h-10 text-white" />
          </div>
          <h1 className="font-serif font-bold text-3xl text-[#a189f2] mb-3 italic">Le Brouillon</h1>
          <p className="text-neutral-500 mb-10 text-sm leading-relaxed">Accès réservé à l'administration du magazine. Veuillez vous identifier.</p>
          <button 
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-4 bg-white border-2 border-neutral-100 py-4 px-6 rounded-2xl font-bold hover:bg-neutral-50 hover:border-[#b79ff8]/30 transition-all shadow-sm group"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/pwa_brand_google_standard_guide.svg" className="w-6 h-6" alt="Google" />
            <span className="text-neutral-700">Continuer avec Google</span>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#fcfaff] flex flex-col lg:flex-row font-sans text-neutral-900">
      
      {/* Mobile Header */}
      <div className="lg:hidden bg-white border-b border-neutral-200 p-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-[#b79ff8] to-[#a189f2] rounded flex items-center justify-center">
            <Feather className="w-5 h-5 text-white" />
          </div>
          <span className="font-serif font-bold text-lg italic text-[#a189f2]">Admin</span>
        </div>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 text-[#a189f2]">
          {mobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed lg:relative inset-y-0 left-0 z-40 w-72 bg-white border-r border-[#b79ff8]/20 p-6 flex flex-col gap-8
        transform transition-transform duration-300 ease-in-out
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="hidden lg:flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-gradient-to-br from-[#b79ff8] to-[#a189f2] rounded-lg flex items-center justify-center shadow-lg shadow-[#b79ff8]/30">
            <Feather className="w-6 h-6 text-white" strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="font-serif font-bold text-xl leading-none italic text-[#a189f2]">Admin</h2>
            <p className="text-[#b79ff8] text-xs mt-1 uppercase tracking-widest font-semibold">Le Brouillon</p>
          </div>
        </div>

        <nav className="space-y-1">
          <SidebarItem 
            icon={BarChart3} label="Vue générale" active={activeTab === "overview"} 
            onClick={() => { setActiveTab("overview"); setMobileMenuOpen(false); }} 
          />
          <SidebarItem 
            icon={FileText} label="Soumissions" badge={submissions.length} active={activeTab === "submissions"} 
            onClick={() => { setActiveTab("submissions"); setMobileMenuOpen(false); }} 
          />
          <SidebarItem 
            icon={Calendar} label="Dates bloquées" badge={blockedDates.length} active={activeTab === "dates"} 
            onClick={() => { setActiveTab("dates"); setMobileMenuOpen(false); }} 
          />
          <SidebarItem 
            icon={BarChart3}
            label="Analytics"
            active={activeTab === "analytics"} 
            onClick={() => { setActiveTab("analytics"); setMobileMenuOpen(false); }} 
          />
          <SidebarItem 
            icon={Sparkles}
            label="Wrapped"
            active={activeTab === "wrapped"} 
            onClick={() => { setActiveTab("wrapped"); setMobileMenuOpen(false); }} 
          />
          
          <div className="pt-4 mt-4 border-t border-[#b79ff8]/10">
            <p className="px-4 mb-2 text-[10px] font-black uppercase tracking-widest text-[#b79ff8]">Ressources</p>
            
            <a 
              href="/admin/content" 
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[#b79ff8] hover:bg-[#b79ff8]/10 hover:text-[#a189f2] transition-all duration-200 group"
            >
              <File className="w-5 h-5" strokeWidth={1.5} />
              <span className="font-bold text-sm">Gérer le contenu</span>
            </a>

            <a 
              href="/admin/questions-settings" 
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[#b79ff8] hover:bg-[#b79ff8]/10 hover:text-[#a189f2] transition-all duration-200 group"
            >
              <Sparkles className="w-5 h-5" strokeWidth={1.5} />
              <span className="font-bold text-sm">Réglages Formulaires</span>
            </a>
          </div>
        </nav>

        <div className="mt-auto space-y-4">
          <div className="bg-[#b79ff8]/5 rounded-xl p-4 border border-[#b79ff8]/20">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-[#a189f2]" />
              <span className="text-xs font-bold text-[#a189f2] uppercase tracking-tighter">Cette semaine</span>
            </div>
            <p className="text-2xl font-serif font-bold text-[#a189f2]">{thisWeek}</p>
            <p className="text-xs text-[#b79ff8]">publications prévues</p>
          </div>
          
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-50 rounded-xl transition-colors font-bold text-sm"
          >
            <LogOut className="w-4 h-4" /> Déconnexion
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 lg:h-screen overflow-y-auto">
        <header className="bg-white/80 backdrop-blur-md border-b border-[#b79ff8]/10 px-6 sm:px-10 py-6 sticky top-0 z-30">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#a189f2] italic">
                {activeTab === "overview" && "Tableau de bord"}
                {activeTab === "submissions" && "Soumissions"}
                {activeTab === "dates" && "Gestion du calendrier"}
                {activeTab === "analytics" && "Analytics"}
                {activeTab === "wrapped" && "Wrapped"}
              </h1>
              <p className="text-neutral-500 text-sm mt-1">
                {activeTab === "overview" && "Aperçu de l'activité du magazine."}
                {activeTab === "submissions" && `${submissions.length} formulaires reçus.`}
                {activeTab === "dates" && "Définissez les jours indisponibles."}
                {activeTab === "analytics" && "Statistiques détaillées."}
                {activeTab === "wrapped" && "Votre année en créativité."}
              </p>
            </div>
            {activeTab === "submissions" && (
              <div className="flex items-center gap-2 px-4 py-2 bg-[#b79ff8]/10 text-[#a189f2] rounded-full border border-[#b79ff8]/20 self-start sm:self-center">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm font-bold">{upcoming} à venir</span>
              </div>
            )}
          </div>
        </header>

        <div className="p-6 sm:p-10 max-w-6xl mx-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <div className="w-8 h-8 border-2 border-[#b79ff8]/20 border-t-[#a189f2] rounded-full animate-spin" />
              <p className="text-[#b79ff8] font-serif italic text-sm">Chargement des données...</p>
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              {/* VUE GÉNÉRALE */}
              {activeTab === "overview" && (
                <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <StatCard icon={FileText} label="Total Soumissions" value={submissions.length} color="purple" />
                    <StatCard icon={Clock} label="À paraître" value={upcoming} color="emerald" trend={`${thisWeek} cette semaine`} />
                    <StatCard icon={Lock} label="Dates bloquées" value={blockedDates.filter(d => d.type === 'admin').length} color="purple" />
                  </div>

                  <div className="bg-white rounded-2xl border border-[#b79ff8]/20 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between bg-gradient-to-r from-white to-[#b79ff8]/5">
                      <h3 className="font-serif font-bold text-lg italic text-[#a189f2]">Dernières activités</h3>
                      <button onClick={() => setActiveTab("submissions")} className="text-sm font-semibold text-[#b79ff8] hover:text-[#a189f2] transition-colors">Voir tout</button>
                    </div>
                    <div className="divide-y divide-neutral-50">
                      {submissions.slice(0, 5).map(sub => (
                        <div key={sub.id} className="px-6 py-4 flex items-center justify-between hover:bg-[#b79ff8]/5 transition-colors">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-[#b79ff8]/10 flex items-center justify-center">
                              <Instagram className="w-5 h-5 text-[#a189f2]" />
                            </div>
                            <div>
                              <p className="font-bold text-neutral-900">@{sub.instagram}</p>
                              <p className="text-xs text-[#b79ff8]">{FORMATS[sub.format]?.label}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-neutral-900">{new Date(sub.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</p>
                            <p className="text-[10px] uppercase tracking-widest text-[#b79ff8] font-bold">Date de sortie</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* SOUMISSIONS */}
              {activeTab === "submissions" && (
                <div className="space-y-4">
                  {submissions.length === 0 ? (
                    <EmptyState icon={FileText} title="Aucune soumission" desc="Les formulaires apparaîtront ici dès réception." />
                  ) : (
                    submissions.map((sub) => {
                      const isOpen = expandedSubmissions.has(sub.id)
                      const isPast = sub.date < todayStr
                      return (
                        <div key={sub.id} className="bg-white border border-[#b79ff8]/20 rounded-2xl overflow-hidden hover:border-[#a189f2]/40 transition-all shadow-sm">
                          <div className="p-4 sm:p-6 flex items-center justify-between">
                            <div className="flex items-center gap-4 flex-1 min-w-0">
                              <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${isPast ? 'bg-neutral-50 text-neutral-300' : 'bg-gradient-to-br from-[#b79ff8] to-[#a189f2] text-white shadow-md shadow-[#b79ff8]/20'}`}>
                                {isPast ? <CheckCircle2 className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-serif font-bold text-lg italic text-neutral-900">@{sub.instagram}</span>
                                  {isPast && <span className="text-[10px] bg-neutral-100 text-neutral-500 px-2 py-0.5 rounded uppercase font-bold tracking-tighter">Archivé</span>}
                                </div>
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-[#b79ff8]">
                                  <span className="font-medium">{formatDateFr(sub.date)}</span>
                                  <span className="w-1 h-1 bg-[#b79ff8]/40 rounded-full hidden sm:block"></span>
                                  <span className="italic">{FORMATS[sub.format]?.label}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button onClick={() => toggleSubmission(sub.id)} className="p-2 hover:bg-[#b79ff8]/10 rounded-lg transition-colors group">
                                <ChevronDown className={`w-5 h-5 text-[#b79ff8] group-hover:text-[#a189f2] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                              </button>
                              <button onClick={() => deleteSubmission(sub.id)} className="p-2 hover:bg-red-50 text-neutral-300 hover:text-red-500 rounded-lg transition-colors">
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </div>
                          </div>

                          {isOpen && (
                            <div className="px-6 pb-6 pt-2 border-t border-[#b79ff8]/10 bg-[#b79ff8]/5">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
                                {Object.entries(sub.answers).map(([key, val]) => (
                                  <div key={key} className="space-y-2">
                                    <label className="text-[10px] font-bold text-[#b79ff8] uppercase tracking-widest">{key.replace(/_/g, ' ')}</label>
                                    <div className="bg-white border border-[#b79ff8]/20 rounded-xl p-4 shadow-sm">
                                      {isUrl(val) ? (
                                        isImage(val) ? (
                                          <div className="relative group cursor-zoom-in" onClick={() => setImagePreview(val)}>
                                            <img src={val} alt={key} className="w-full h-48 object-cover rounded-lg" />
                                            <div className="absolute inset-0 bg-[#a189f2]/0 group-hover:bg-[#a189f2]/20 transition-colors rounded-lg flex items-center justify-center">
                                              <Eye className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </div>
                                          </div>
                                        ) : (
                                          <a href={val} target="_blank" className="flex items-center gap-3 text-neutral-600 hover:text-[#a189f2] font-medium truncate">
                                            {isPdf(val) ? <File className="text-red-400" /> : <Eye className="text-[#b79ff8]" />}
                                            <span className="underline decoration-[#b79ff8]/40 underline-offset-4">Ouvrir le document</span>
                                          </a>
                                        )
                                      ) : (
                                        <p className="text-neutral-800 leading-relaxed whitespace-pre-wrap text-sm">{val}</p>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              )}

              {/* DATES BLOQUÉES */}
              {activeTab === "dates" && (
                <div className="space-y-8 max-w-5xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                  
                  <div className="bg-white rounded-[2.5rem] border border-[#b79ff8]/20 p-8 shadow-sm">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                      <div>
                        <h3 className="font-serif font-bold text-3xl italic text-neutral-800 flex items-center gap-3">
                          <Calendar className="w-8 h-8 text-[#a189f2]" />
                          {new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(currentMonth)}
                        </h3>
                        <p className="text-xs text-neutral-400 font-bold mt-1 uppercase tracking-[0.2em]">Tableau des disponibilités</p>
                      </div>

                      <div className="flex items-center gap-2 bg-neutral-100 p-1.5 rounded-2xl">
                        <button onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)))} className="p-2.5 hover:bg-white rounded-xl transition-all text-neutral-500"><ChevronDown className="w-5 h-5 rotate-90" /></button>
                        <button onClick={() => setCurrentMonth(new Date())} className="px-4 text-[10px] font-black uppercase tracking-widest text-[#a189f2]">Aujourd'hui</button>
                        <button onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)))} className="p-2.5 hover:bg-white rounded-xl transition-all text-neutral-500"><ChevronDown className="w-5 h-5 -rotate-90" /></button>
                      </div>
                    </div>

                    <div className="grid grid-cols-7 text-[#a189f2] gap-2">
                      {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(day => (
                        <div key={day} className="py-2 text-center text-[10px] font-black uppercase text-black">{day}</div>
                      ))}

                      {(() => {
                        const { startOffset, daysInMonth, year, month } = getDaysInMonth(currentMonth);
                        const cells = [];
                        
                        for (let i = 0; i < startOffset; i++) cells.push(<div key={`empty-${i}`} className="aspect-square opacity-0" />);

                        for (let d = 1; d <= daysInMonth; d++) {
                          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                          const occupations = blockedDates.filter((bd: BlockedDate) => bd.date === dateStr);
                          const isToday = new Date().toISOString().split('T')[0] === dateStr;
                          const isOccupied = occupations.length > 0;

                          cells.push(
                            <div 
                              key={d} 
                              className={`group relative aspect-square rounded-[1.3rem] border transition-all p-2 flex flex-col ${
                                isOccupied ? 'bg-neutral-50/50 border-neutral-100' : 'bg-white border-neutral-100 hover:border-[#a189f2] hover:shadow-md cursor-pointer'
                              } ${isToday ? 'ring-2 ring-[#a189f2] ring-offset-2' : ''}`}
                              onClick={() => !isOccupied && blockDate(dateStr)}
                            >
                              <span className={`text-xs font-black ${isToday ? 'text-[#a189f2]' : 'text-neutral-400'}`}>{d}</span>
                              
                              <div className="mt-1 space-y-1">
                                {occupations.map((occ: BlockedDate) => (
                                  <button 
                                    key={occ.id}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if(occ.type === 'admin') unblockDate(occ.id);
                                      else setActiveTab("submissions");
                                    }}
                                    className={`w-full text-left text-[8px] font-bold px-1.5 py-1 rounded-lg truncate transition-transform hover:scale-105 flex items-center gap-1 ${
                                      occ.type === 'admin' ? 'bg-[#a189f2] text-white' : 'bg-emerald-500 text-white'
                                    }`}
                                  >
                                    {occ.type === 'admin' ? <Unlock className="w-2 h-2" /> : <Eye className="w-2 h-2" />}
                                    {occ.type === 'admin' ? 'Libérer' : occ.label}
                                  </button>
                                ))}
                              </div>

                              {!isOccupied && (
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-[#a189f2]/10 rounded-[1.3rem]">
                                  <Lock className="w-4 h-4 text-[#a189f2]" />
                                </div>
                              )}
                            </div>
                          );
                        }
                        return cells;
                      })()}
                    </div>
                  </div>

                  <div className="flex items-center gap-6 px-8 py-4 bg-white rounded-2xl border border-neutral-100 w-fit mx-auto">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-[#a189f2]" />
                      <span className="text-[10px] font-bold uppercase text-neutral-500">Bloqué (Cliquez pour libérer)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-emerald-500" />
                      <span className="text-[10px] font-bold uppercase text-neutral-500">Soumission (Lecture seule)</span>
                    </div>
                  </div>
                </div>
              )}

              {/* ANALYTICS */}
              {activeTab === "analytics" && (
                <div className="space-y-12 max-w-6xl mx-auto">
                  <div className="bg-white p-8 rounded-3xl border border-[#b79ff8]/20 shadow-sm">
                    <h2 className="font-serif text-2xl italic text-[#a189f2] mb-6">Soumissions par format</h2>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={formatStats}>
                          <XAxis dataKey="format" fontSize={10} />
                          <YAxis fontSize={10} />
                          <Tooltip />
                          <Bar dataKey="count" fill="#a189f2" radius={[6,6,0,0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-white p-8 rounded-3xl border border-[#b79ff8]/20 shadow-sm">
                    <h2 className="font-serif text-2xl italic text-[#a189f2] mb-6">Évolution mensuelle</h2>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={monthlyStats}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" fontSize={10} />
                          <YAxis fontSize={10} />
                          <Tooltip />
                          <Legend />
                          <Line type="monotone" dataKey="count" stroke="#a189f2" strokeWidth={3} dot={{ r: 6 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              )}

              {/* WRAPPED */}
              {activeTab === "wrapped" && (
                <div className="max-w-5xl mx-auto space-y-12 pb-20 animate-in fade-in slide-in-from-bottom-8 duration-700">
                  <div className="text-center space-y-4">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#b79ff8] to-[#a189f2] text-white rounded-full text-xs font-black uppercase tracking-[0.2em] shadow-lg shadow-purple-200">
                      <Sparkles className="w-4 h-4" />
                      Flashback {now.getFullYear()}
                    </div>
                    <h2 className="text-5xl md:text-6xl font-serif font-bold italic text-[#a189f2]">Votre année en <br/> <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#b79ff8] via-[#a189f2] to-[#8a71d6]">créativité.</span></h2>
                  </div>

                  <section className="space-y-6">
                    <h3 className="text-sm font-black uppercase tracking-widest text-[#b79ff8] flex items-center gap-4">
                      Ce mois-ci 
                      <div className="h-[1px] flex-1 bg-gradient-to-r from-[#b79ff8]/30 to-transparent"></div>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="bg-[#a189f2] p-8 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden group">
                        <FileText className="absolute -right-4 -bottom-4 w-32 h-32 text-white/10 rotate-12 transition-transform" />
                        <p className="text-xs font-bold uppercase tracking-widest opacity-80">Total Soumissions</p>
                        <p className="text-7xl font-serif font-bold my-4 italic">{wrappedMonth.total}</p>
                        <p className="text-sm font-medium opacity-90">Projets reçus.</p>
                      </div>
                      <div className="bg-white p-8 rounded-[2.5rem] border-2 border-[#b79ff8]/20 shadow-sm relative overflow-hidden">
                        <TrendingUp className="text-[#a189f2] w-10 h-10 mb-6" />
                        <p className="text-xs font-bold uppercase tracking-widest text-[#b79ff8]">Format Favori</p>
                        <p className="text-3xl font-serif font-bold text-[#a189f2] mt-4 italic">
                          {wrappedMonth.topFormat ? (FORMATS[wrappedMonth.topFormat[0] as keyof typeof FORMATS]?.label || wrappedMonth.topFormat[0]) : "N/A"}
                        </p>
                        <p className="text-xs text-neutral-400 mt-2">Le plus populaire du moment.</p>
                      </div>
                      <div className="bg-[#1a1625] p-8 rounded-[2.5rem] text-white shadow-xl flex flex-col justify-between group hover:scale-105 transition-transform cursor-pointer"
                            onClick={() => instagramStats.mostLikedPost && window.open(instagramStats.mostLikedPost.url, '_blank')}
                          >
                        <Instagram className="w-10 h-10 mb-6 text-[#b79ff8]" />
                        <div>
                          <p className="text-xs font-bold uppercase tracking-widest text-[#b79ff8] mb-4">Post le plus liké</p>
                          <p className="text-2xl font-serif font-bold italic text-white leading-tight line-clamp-2">
                            {instagramStats.mostLikedPost ? instagramStats.mostLikedPost.caption : "Chargement..."}
                          </p>
                          <div className="flex items-center gap-2 mt-3">
                            <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full">
                              <span className="text-lg">❤️</span>
                              <span className="text-sm font-black">
                                {instagramStats.mostLikedPost ? instagramStats.mostLikedPost.likes : "---"}
                              </span>
                            </div>
                            {instagramStats.mostLikedPost && (
                              <span className="text-[10px] text-[#b79ff8] uppercase font-bold">Cliquez pour voir</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className="bg-gradient-to-br from-[#b79ff8] to-[#8a71d6] rounded-[3rem] p-10 md:p-16 text-white relative overflow-hidden shadow-2xl">
                    <div className="relative z-10 flex flex-col md:flex-row gap-12 items-center">
                        <div className="flex-1 space-y-6 text-center md:text-left">
                          <h4 className="text-6xl md:text-8xl font-serif font-bold italic leading-none">L'année <br/> de tous les <br/> records.</h4>
                          <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                             <div className="bg-white/20 backdrop-blur-md px-6 py-3 rounded-2xl">
                                <p className="text-[10px] font-black uppercase opacity-80">Total {now.getFullYear()}</p>
                                <p className="text-3xl font-bold">{wrappedYear.total}</p>
                             </div>
                             <div className="bg-white/20 backdrop-blur-md px-6 py-3 rounded-2xl">
                                <p className="text-[10px] font-black uppercase opacity-80">Top Genre</p>
                                <p className="text-3xl font-bold">{wrappedYear.topFormat ? (FORMATS[wrappedYear.topFormat[0] as keyof typeof FORMATS]?.label.split(' ')[0]) : "N/A"}</p>
                             </div>
                          </div>
                        </div>
                        <div className="w-full md:w-72 space-y-5">
                          <p className="text-xs font-black uppercase tracking-widest opacity-80 text-center mb-4">Répartition</p>
                          {Object.entries(wrappedYear.formats).map(([f, c]) => {
                            const percent = Math.round((c / (wrappedYear.total || 1)) * 100);
                            return (
                              <div key={f} className="space-y-1">
                                <div className="flex justify-between text-[10px] font-black uppercase">
                                  <span>{FORMATS[f as keyof typeof FORMATS]?.label || f}</span>
                                  <span>{percent}%</span>
                                </div>
                                <div className="h-1.5 bg-black/10 rounded-full overflow-hidden">
                                  <div className="h-full bg-white rounded-full transition-all duration-1000" style={{ width: `${percent}%` }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                    </div>
                    <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32" />
                  </section>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Image Preview Modal */}
      {imagePreview && (
        <div className="fixed inset-0 bg-[#1a1625]/95 backdrop-blur-md z-[100] flex items-center justify-center p-4" onClick={() => setImagePreview(null)}>
          <button className="absolute top-6 right-6 text-white bg-white/10 p-3 rounded-full hover:bg-[#b79ff8]/20 transition-colors">
            <X className="w-6 h-6" />
          </button>
          <img src={imagePreview} className="max-w-full max-h-[90vh] rounded-lg shadow-2xl shadow-[#b79ff8]/20 object-contain animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()} />
        </div>
      )}
    </div>
  )
}

/* ---------- Sub-components ---------- */

function SidebarItem({ icon: Icon, label, active, onClick, badge }: any) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 group ${
        active 
          ? "bg-gradient-to-r from-[#b79ff8] to-[#a189f2] text-white shadow-lg shadow-[#b79ff8]/30" 
          : "text-[#b79ff8] hover:bg-[#b79ff8]/10 hover:text-[#a189f2]"
      }`}
    >
      <div className="flex items-center gap-3">
        <Icon className={`w-5 h-5 ${active ? 'text-white' : 'text-[#b79ff8] group-hover:text-[#a189f2]'}`} strokeWidth={active ? 2 : 1.5} />
        <span className="font-bold text-sm">{label}</span>
      </div>
      {badge !== undefined && badge > 0 && (
        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${active ? 'bg-white/20 text-white' : 'bg-[#b79ff8]/10 text-[#a189f2]'}`}>
          {badge}
        </span>
      )}
    </button>
  )
}

function StatCard({ icon: Icon, label, value, color, trend }: any) {
  const isPurple = color === 'purple';
  return (
    <div className={`bg-white p-6 rounded-2xl border border-[#b79ff8]/20 shadow-sm group hover:border-[#a189f2] transition-all duration-300`}>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 ${color === 'emerald' ? 'bg-emerald-50 text-emerald-600' : 'bg-[#b79ff8]/10 text-[#a189f2]'}`}>
        <Icon className="w-6 h-6" strokeWidth={1.5} />
      </div>
      <p className="text-[10px] font-black text-[#b79ff8] uppercase tracking-widest">{label}</p>
      <div className="flex items-baseline gap-2 mt-1">
        <p className={`text-3xl font-serif font-bold italic ${isPurple ? 'text-[#a189f2]' : 'text-neutral-900'}`}>{value}</p>
        {trend && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{trend}</span>}
      </div>
    </div>
  )
}

function EmptyState({ icon: Icon, title, desc }: any) {
  return (
    <div className="bg-white border-2 border-dashed border-[#b79ff8]/10 rounded-3xl p-16 text-center">
      <div className="w-20 h-20 bg-[#b79ff8]/5 rounded-full flex items-center justify-center mx-auto mb-6">
        <Icon className="w-10 h-10 text-[#b79ff8]/30" />
      </div>
      <h3 className="font-serif font-bold text-xl italic mb-2 text-[#a189f2]">{title}</h3>
      <p className="text-[#b79ff8] max-w-xs mx-auto text-sm">{desc}</p>
    </div>
  )
}