"use client"

import { useEffect, useState } from "react"
import { db } from "@/lib/firebase"
import { collection, addDoc, getDocs, deleteDoc, doc, query, orderBy } from "firebase/firestore"
import {
  Calendar, Trash2, Plus, Lock, Unlock, FileText,
  Instagram, Feather, ChevronDown, BarChart3,
  TrendingUp, Clock, CheckCircle2, Eye, File, X, Menu, AlertCircle
} from "lucide-react"
import { FORMATS } from "@/lib/formats"

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
  const [date, setDate] = useState("")
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([])
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [activeTab, setActiveTab] = useState<Tab>("overview")
  const [expandedSubmissions, setExpandedSubmissions] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const datesSnap = await getDocs(collection(db, "blocked_dates"))
      const submissionsSnap = await getDocs(query(collection(db, "submissions"), orderBy("createdAt", "desc")))

      setBlockedDates(datesSnap.docs.map(d => ({ id: d.id, date: d.data().date })))
      setSubmissions(submissionsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Submission[])
    } catch (error) {
      console.error("Error loading data:", error)
    }
    setIsLoading(false)
  }

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

  const today = new Date().toISOString().split("T")[0]
  const upcoming = submissions.filter(s => s.date >= today).length
  const thisWeek = submissions.filter(s => {
    const diff = new Date(s.date).getTime() - new Date(today).getTime()
    return diff >= 0 && diff <= 7 * 24 * 60 * 60 * 1000
  }).length

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
        </nav>

        <div className="mt-auto pt-6 border-t border-[#b79ff8]/10">
          <div className="bg-[#b79ff8]/5 rounded-xl p-4 border border-[#b79ff8]/20">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-[#a189f2]" />
              <span className="text-xs font-bold text-[#a189f2] uppercase tracking-tighter">Cette semaine</span>
            </div>
            <p className="text-2xl font-serif font-bold text-[#a189f2]">{thisWeek}</p>
            <p className="text-xs text-[#b79ff8]">publications prévues</p>
          </div>
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
                <div className="space-y-8 max-w-2xl">
                  <div className="bg-white rounded-2xl border-2 border-[#a189f2] p-8 shadow-xl shadow-[#b79ff8]/10">
                    <h3 className="font-serif font-bold text-xl italic mb-6 text-[#a189f2]">Bloquer une date</h3>
                    <div className="flex flex-col sm:flex-row gap-4">
                      <input 
                        type="date" value={date} onChange={e => setDate(e.target.value)}
                        className="flex-1 bg-[#b79ff8]/5 border border-[#b79ff8]/20 rounded-xl px-4 py-3 focus:outline-none focus:border-[#a189f2] transition-colors text-[#a189f2] font-medium"
                      />
                      <button 
                        onClick={blockDate} disabled={!date}
                        className="bg-gradient-to-r from-[#b79ff8] to-[#a189f2] text-white px-8 py-3 rounded-xl font-bold hover:shadow-lg hover:shadow-[#b79ff8]/30 transition-all disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
                      >
                        <Lock className="w-4 h-4" /> Bloquer
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {blockedDates.length === 0 ? (
                      <div className="col-span-full py-12 text-center bg-[#b79ff8]/5 rounded-2xl border-2 border-dashed border-[#b79ff8]/20">
                        <Calendar className="w-8 h-8 text-[#b79ff8]/40 mx-auto mb-2" />
                        <p className="text-[#b79ff8] font-serif italic">Aucune restriction pour le moment.</p>
                      </div>
                    ) : (
                      blockedDates.map(d => (
                        <div key={d.id} className="bg-white border border-[#b79ff8]/20 rounded-xl p-5 flex items-center justify-between group hover:border-[#a189f2] transition-colors shadow-sm">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center text-red-500">
                              <Calendar className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="font-bold text-neutral-900">{formatDateFr(d.date)}</p>
                              <p className="text-[10px] uppercase font-bold text-[#b79ff8] tracking-tighter">Indisponible</p>
                            </div>
                          </div>
                          <button onClick={() => unblockDate(d.id)} className="p-2 text-neutral-300 hover:text-[#a189f2] transition-colors">
                            <Unlock className="w-5 h-5" />
                          </button>
                        </div>
                      ))
                    )}
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