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
  const [currentMonth, setCurrentMonth] = useState(new Date());

const getDaysInMonth = (date: Date) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1).getDay(); // 0 (Dim) à 6 (Sam)
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  // Ajustement pour commencer par Lundi (0=Lun, 6=Dim)
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

const blockDate = async (manualDate?: string) => {
  const dateToBlock = manualDate || date; // Utilise la date passée ou celle du state
  if (!dateToBlock) return;

  // 1. Vérifier si la date est déjà occupée (Admin ou Client)
  const isAlreadyOccupied = blockedDates.some(d => d.date === dateToBlock);
  if (isAlreadyOccupied) {
    alert("Cette date est déjà occupée ou bloquée.");
    return;
  }

  try {
    const docRef = await addDoc(collection(db, "blocked_dates"), {
      date: dateToBlock,
      createdAt: new Date().toISOString()
    });
    
    // Mettre à jour l'état local immédiatement
    setBlockedDates(prev => [...prev, { 
      id: docRef.id, 
      date: dateToBlock, 
      type: 'admin', 
      label: 'Administrateur' 
    }].sort((a,b) => a.date.localeCompare(b.date)));
    
    if(!manualDate) setDate(""); // Reset le champ si c'était manuel
  } catch (error) {
    console.error("Erreur blocage:", error);
  }
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
                <div className="space-y-8 max-w-5xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                  
                  <div className="bg-white rounded-[2.5rem] border border-[#b79ff8]/20 p-8 shadow-sm">
                    {/* Header avec Navigation du mois */}
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

                    {/* Grille */}
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
                          const occupations = blockedDates.filter((bd: any) => bd.date === dateStr);
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
                                {occupations.map((occ: any) => (
                                  <button 
                                    key={occ.id}
                                    onClick={(e) => {
                                      e.stopPropagation(); // Empêche de déclencher le blockDate de la case
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

                              {/* Overlay au survol pour les cases vides */}
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

                  {/* Légende rapide */}
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