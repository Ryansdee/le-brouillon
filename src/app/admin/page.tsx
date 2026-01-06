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

/* ---------- Configuration Sécurité ---------- */
const ADMIN_EMAILS = [
  "ryan.deschuyteneer@gmail.com",
  "badpetrova121@gmail.com"
]; // REMPLACEZ PAR VOTRE EMAIL

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
}

type Tab = "overview" | "submissions" | "dates"

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

  // Monitor Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser && ADMIN_EMAILS.includes(currentUser.email ?? "")) {
        setUser(currentUser)
        loadData()
      } else if (currentUser) {
        // Connecté mais pas admin
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
      // 1. Récupérer les dates bloquées (Admin)
      const datesSnap = await getDocs(collection(db, "blocked_dates"))
      const adminBlocked = datesSnap.docs.map(d => ({ 
        id: d.id, 
        date: d.data().date, // Format "2026-01-19" selon vos données
        type: 'admin',
        label: 'Administrateur'
      }))

      // 2. Récupérer les soumissions (Clients)
      const submissionsSnap = await getDocs(query(collection(db, "submissions"), orderBy("createdAt", "desc")))
      const subsData = submissionsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Submission[]
      
      setSubmissions(subsData)

      // 3. Transformer les soumissions en "dates occupées" pour l'agenda
      const submissionBlocked = subsData.map(s => ({
        id: s.id,
        date: s.date, // Format "2026-01-14" selon vos données
        type: 'submission',
        label: `@${s.instagram}` // Utilise le champ instagram de votre DB
      }))

      // 4. Fusionner les deux listes et trier chronologiquement
      const allOccupiedDates = [...adminBlocked, ...submissionBlocked].sort((a, b) => 
        a.date.localeCompare(b.date)
      )
      
      setBlockedDates(allOccupiedDates as any) 
    } catch (error) {
      console.error("Erreur lors du chargement:", error)
    }
    setIsLoading(false)
  }

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider)
    } catch (error) {
      console.error("Login error:", error)
    }
  }

  const handleLogout = () => signOut(auth)

  const toggleSubmission = (id: string) => {
    const s = new Set(expandedSubmissions)
    s.has(id) ? s.delete(id) : s.add(id)
    setExpandedSubmissions(s)
  }

  const blockDate = async () => {
    if (!date) return
    await addDoc(collection(db, "blocked_dates"), { date })
    setDate("")
    loadData()
  }

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

  // Stats
  const today = new Date().toISOString().split("T")[0]
  const upcoming = submissions.filter(s => s.date >= today).length
  const thisWeek = submissions.filter(s => {
    const diff = new Date(s.date).getTime() - new Date(today).getTime()
    return diff >= 0 && diff <= 7 * 24 * 60 * 60 * 1000
  }).length

  // Écran de chargement Auth
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

  // Écran de Login
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
            
            {/* AJOUT DU LIEN VERS LE CONTENU ICI */}
            <div className="pt-4 mt-4 border-t border-[#b79ff8]/10">
              <p className="px-4 mb-2 text-[10px] font-black uppercase tracking-widest text-[#b79ff8]">Ressources</p>
              <a 
                href="/admin/content" 
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[#b79ff8] hover:bg-[#b79ff8]/10 hover:text-[#a189f2] transition-all duration-200 group"
              >
                <File className="w-5 h-5 text-[#b79ff8] group-hover:text-[#a189f2]" strokeWidth={1.5} />
                <span className="font-bold text-sm">Gérer le contenu</span>
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
              </h1>
              <p className="text-neutral-500 text-sm mt-1">
                {activeTab === "overview" && "Aperçu de l'activité du magazine."}
                {activeTab === "submissions" && `${submissions.length} formulaires reçus.`}
                {activeTab === "dates" && "Définissez les jours indisponibles."}
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
                    <StatCard icon={Lock} label="Dates bloquées" value={blockedDates.length} color="purple" />
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
                      const isPast = sub.date < today
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
                <div className="space-y-8 max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                  
                  {/* Section : Action Rapide */}
                  <div className="bg-white rounded-[2.5rem] border border-[#b79ff8]/20 p-8 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#b79ff8]/5 rounded-full -mr-16 -mt-16" />
                    
                    <div className="relative">
                      <h3 className="font-serif font-bold text-xl italic mb-6 text-[#a189f2] flex items-center gap-2">
                        <Sparkles className="w-5 h-5" /> Bloquer une nouvelle date
                      </h3>
                      <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 relative">
                          <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#b79ff8]" />
                          <input 
                            type="date" value={date} onChange={e => setDate(e.target.value)}
                            className="w-full bg-[#b79ff8]/5 border border-[#b79ff8]/10 rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:border-[#a189f2] focus:ring-4 focus:ring-[#a189f2]/5 transition-all text-[#a189f2] font-bold"
                          />
                        </div>
                        <button 
                          onClick={blockDate} disabled={!date}
                          className="bg-gradient-to-r from-[#b79ff8] to-[#a189f2] text-white px-8 py-4 rounded-2xl font-black hover:shadow-xl hover:shadow-[#b79ff8]/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2 group"
                        >
                          <Lock className="w-5 h-5 group-hover:scale-110 transition-transform" /> 
                          Confirmer le blocage
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Section : L'Agenda */}
                  <div className="space-y-6">
                    <div className="flex items-center justify-between px-4">
                      <h3 className="font-serif font-bold text-2xl italic text-neutral-800">Calendrier des publications</h3>
                      <div className="flex gap-4 text-[10px] font-black uppercase tracking-widest">
                        <div className="flex items-center gap-1.5 text-[#a189f2]">
                          <span className="w-2 h-2 rounded-full bg-[#a189f2]"></span> Admin
                        </div>
                        <div className="flex items-center gap-1.5 text-emerald-500">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Soumission
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      {blockedDates.length === 0 ? (
                        <EmptyState icon={Calendar} title="Agenda libre" desc="Aucune date n'est actuellement réservée ou bloquée." />
                      ) : (
                        blockedDates.map((d: any) => {
                          const isAdmin = d.type === 'admin';
                          const dateObj = new Date(d.date + "T00:00:00");
                          const dayName = new Intl.DateTimeFormat('fr-FR', { weekday: 'long' }).format(dateObj);
                          
                          return (
                            <div key={d.id} className="group relative bg-white border border-neutral-100 rounded-[2rem] p-2 pr-6 shadow-sm hover:shadow-md transition-all flex items-center gap-6">
                              
                              {/* Bloc Date Style Agenda */}
                              <div className={`flex flex-col items-center justify-center min-w-[100px] h-[100px] rounded-[1.7rem] ${
                                isAdmin 
                                ? "bg-gradient-to-br from-[#b79ff8] to-[#a189f2] text-white" 
                                : "bg-neutral-50 text-neutral-400 border border-neutral-100"
                              }`}>
                                <span className="text-[10px] font-black uppercase tracking-tighter opacity-80">{dayName}</span>
                                <span className="text-3xl font-serif font-bold italic leading-none my-0.5">{dateObj.getDate()}</span>
                                <span className="text-[10px] font-bold uppercase">{new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(dateObj)}</span>
                              </div>

                              {/* Contenu */}
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md tracking-widest ${
                                    isAdmin ? "bg-[#a189f2]/10 text-[#a189f2]" : "bg-emerald-100 text-emerald-600"
                                  }`}>
                                    {isAdmin ? 'Indisponible' : 'Réservé'}
                                  </span>
                                  <span className="text-neutral-300">•</span>
                                  <span className="text-xs font-bold text-neutral-400 italic">
                                    {isAdmin ? "Action Manuelle" : "Formulaire Reçu"}
                                  </span>
                                </div>
                                
                                <h4 className="font-serif font-bold text-xl text-neutral-800 leading-tight">
                                  {isAdmin ? "Date bloquée par l'équipe" : `Publication : ${d.label}`}
                                </h4>
                                
                                <div className="flex items-center gap-4 mt-2">
                                  <div className="flex items-center gap-1.5 text-sm text-neutral-500 font-medium">
                                    <Clock className="w-4 h-4 text-[#b79ff8]" />
                                    Toute la journée
                                  </div>
                                  {!isAdmin && (
                                    <div className="flex items-center gap-1.5 text-sm text-neutral-500 font-medium">
                                      <Instagram className="w-4 h-4 text-[#b79ff8]" />
                                      {d.label}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Actions contextuelles */}
                              <div className="flex gap-2">
                                {isAdmin ? (
                                  <button 
                                    onClick={() => unblockDate(d.id)}
                                    className="w-12 h-12 flex items-center justify-center rounded-2xl bg-red-50 text-red-400 opacity-0 group-hover:opacity-100 hover:bg-red-500 hover:text-white transition-all duration-300"
                                    title="Libérer la date"
                                  >
                                    <Trash2 className="w-5 h-5" />
                                  </button>
                                ) : (
                                  <button 
                                    onClick={() => setActiveTab("submissions")}
                                    className="w-12 h-12 flex items-center justify-center rounded-2xl bg-[#b79ff8]/10 text-[#a189f2] opacity-0 group-hover:opacity-100 hover:bg-[#a189f2] hover:text-white transition-all duration-300 shadow-sm"
                                    title="Voir les détails"
                                  >
                                    <Eye className="w-5 h-5" />
                                  </button>
                                )}
                              </div>

                              {/* Ligne décorative selon le type */}
                              <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-12 rounded-r-full ${
                                isAdmin ? "bg-[#a189f2]" : "bg-emerald-400"
                              }`} />
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
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