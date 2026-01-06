"use client"

import { useEffect, useState } from "react"
import { db } from "@/lib/firebase"
import { collection, addDoc, getDocs, deleteDoc, doc, query, orderBy } from "firebase/firestore"
import {
  Calendar, Trash2, Plus, Lock, Unlock, FileText,
  Instagram, Feather, BookOpen, ChevronDown, ChevronUp, BarChart3,
  TrendingUp, Clock, CheckCircle2, Eye, Image as ImageIcon, File, X, Menu
} from "lucide-react"
import { FORMATS } from "@/lib/formats"
import './admin.css'

/* ---------- Helpers ---------- */

const isUrl = (v: string) => v.startsWith("http")
const cleanUrl = (url: string) => url.split("?")[0].toLowerCase()
const isImage = (url: string) => /\.(png|jpe?g|webp)$/i.test(cleanUrl(url))
const isPdf = (url: string) => /\.pdf$/i.test(cleanUrl(url))
const isCoverKey = (key: string) => key.toLowerCase().includes("cover") || key.toLowerCase().includes("couverture")

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

/* ---------- Component ---------- */

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
    const datesSnap = await getDocs(collection(db, "blocked_dates"))
    const submissionsSnap = await getDocs(query(collection(db, "submissions"), orderBy("createdAt", "desc")))

    setBlockedDates(datesSnap.docs.map(d => ({ id: d.id, date: d.data().date })))
    setSubmissions(submissionsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Submission[])
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

  const formatDate = (d: string) =>
    new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(new Date(d + "T00:00:00"))

  const today = new Date().toISOString().split("T")[0]
  const upcoming = submissions.filter(s => s.date >= today).length
  const thisWeek = submissions.filter(s => {
    const diff = new Date(s.date).getTime() - new Date(today).getTime()
    return diff >= 0 && diff <= 7 * 24 * 60 * 60 * 1000
  }).length

  /* ---------- UI ---------- */

  return (
    <div className="min-h-screen bg-[#faf9f7] flex flex-col lg:flex-row">
      {/* Mobile Header */}
      <div className="lg:hidden bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 text-white p-4 flex items-center justify-between sticky top-0 z-30 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center backdrop-blur-sm border border-white/20">
            <Feather className="w-5 h-5" strokeWidth={1.5} />
          </div>
          <div>
            <span className="font-serif font-bold text-lg">Admin</span>
            <p className="text-neutral-400 text-xs">Le Brouillon</p>
          </div>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          aria-label="Menu"
        >
          {mobileMenuOpen ? (
            <X className="w-6 h-6" strokeWidth={2} />
          ) : (
            <Menu className="w-6 h-6" strokeWidth={2} />
          )}
        </button>
      </div>

      {/* Sidebar - Desktop & Mobile Overlay */}
      <aside className={`
        fixed lg:relative inset-y-0 left-0 z-40
        w-72 bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 text-white 
        p-6 space-y-8 shadow-xl border-r border-neutral-700
        transform transition-transform duration-300 ease-in-out
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        lg:w-64 xl:w-72
      `}>
        <div className="space-y-2 hidden lg:block">
          <div className="flex items-center gap-3 text-2xl font-serif font-bold">
            <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center backdrop-blur-sm border border-white/20">
              <Feather className="w-6 h-6" strokeWidth={1.5} />
            </div>
            <span>Admin</span>
          </div>
          <p className="text-neutral-400 text-sm pl-13">Le Brouillon</p>
        </div>

        <nav className="space-y-2">
          <SidebarItem 
            icon={BarChart3} 
            label="Vue générale" 
            active={activeTab === "overview"} 
            onClick={() => {
              setActiveTab("overview")
              setMobileMenuOpen(false)
            }} 
          />
          <SidebarItem 
            icon={FileText} 
            label="Soumissions" 
            badge={submissions.length}
            active={activeTab === "submissions"} 
            onClick={() => {
              setActiveTab("submissions")
              setMobileMenuOpen(false)
            }} 
          />
          <SidebarItem 
            icon={Calendar} 
            label="Dates bloquées" 
            badge={blockedDates.length}
            active={activeTab === "dates"} 
            onClick={() => {
              setActiveTab("dates")
              setMobileMenuOpen(false)
            }} 
          />
        </nav>

        <div className="pt-6 border-t border-white/10">
          <div className="bg-white/5 rounded-lg p-4 border border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-emerald-400" strokeWidth={1.5} />
              <span className="text-xs font-semibold text-neutral-300">Cette semaine</span>
            </div>
            <p className="text-2xl font-bold">{thisWeek}</p>
            <p className="text-xs text-neutral-400 mt-1">publications prévues</p>
          </div>
        </div>
      </aside>

      {/* Mobile Menu Backdrop */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 lg:hidden animate-fadeIn"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto w-full">
        {/* Header */}
        <header className="bg-white border-b border-neutral-200 px-4 sm:px-6 lg:px-10 py-4 lg:py-6 sticky top-0 lg:top-0 z-20 backdrop-blur-sm bg-white/95">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-xl lg:text-2xl font-serif font-bold text-neutral-900">
                {activeTab === "overview" && "Vue générale"}
                {activeTab === "submissions" && "Soumissions"}
                {activeTab === "dates" && "Dates bloquées"}
              </h1>
              <p className="text-neutral-600 text-xs sm:text-sm mt-1">
                {activeTab === "overview" && "Tableau de bord et statistiques"}
                {activeTab === "submissions" && `${submissions.length} soumission${submissions.length > 1 ? 's' : ''} au total`}
                {activeTab === "dates" && "Gérez les dates non disponibles"}
              </p>
            </div>
            
            {activeTab === "submissions" && (
              <div className="text-left sm:text-right">
                <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-neutral-50 rounded-lg border border-neutral-200">
                  <TrendingUp className="w-4 h-4 text-emerald-600" strokeWidth={2} />
                  <span className="text-xs sm:text-sm font-semibold text-neutral-700">{upcoming} à venir</span>
                </div>
              </div>
            )}
          </div>
        </header>

        <div className="p-4 sm:p-6 lg:p-10">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center space-y-4">
                <div className="w-12 h-12 border-4 border-neutral-200 border-t-neutral-900 rounded-full animate-spin mx-auto" />
                <p className="text-neutral-600">Chargement...</p>
              </div>
            </div>
          ) : (
            <>
              {/* Overview Tab */}
              {activeTab === "overview" && (
                <div className="space-y-6 lg:space-y-8 animate-fadeIn">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
                    <StatCard 
                      icon={FileText}
                      label="Soumissions totales" 
                      value={submissions.length} 
                      color="blue"
                      trend="+12% ce mois"
                    />
                    <StatCard 
                      icon={Clock}
                      label="Publications à venir" 
                      value={upcoming} 
                      color="emerald"
                      trend={`${thisWeek} cette semaine`}
                    />
                    <StatCard 
                      icon={Lock}
                      label="Dates bloquées" 
                      value={blockedDates.length} 
                      color="amber"
                    />
                  </div>

                  {/* Recent Submissions */}
                  <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
                    <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-neutral-200 bg-neutral-50">
                      <h3 className="font-serif font-semibold text-neutral-900 flex items-center gap-2 text-sm sm:text-base">
                        <TrendingUp className="w-4 sm:w-5 h-4 sm:h-5" strokeWidth={1.5} />
                        Soumissions récentes
                      </h3>
                    </div>
                    <div className="divide-y divide-neutral-100">
                      {submissions.slice(0, 5).map(sub => (
                        <div 
                          key={sub.id} 
                          className="px-4 sm:px-6 py-3 sm:py-4 hover:bg-neutral-50 transition-colors cursor-pointer"
                          onClick={() => {
                            setActiveTab("submissions")
                            setMobileMenuOpen(false)
                          }}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className="w-8 sm:w-10 h-8 sm:h-10 bg-neutral-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <Instagram className="w-4 sm:w-5 h-4 sm:h-5 text-neutral-600" strokeWidth={1.5} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold text-neutral-900 text-sm sm:text-base truncate">@{sub.instagram}</p>
                                <p className="text-xs sm:text-sm text-neutral-600 truncate">{FORMATS[sub.format]?.label || "Format inconnu"}</p>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-xs sm:text-sm font-medium text-neutral-900 whitespace-nowrap">
                                {new Date(sub.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                              </p>
                              <p className="text-xs text-neutral-500 hidden sm:block">
                                {new Date(sub.createdAt?.seconds * 1000).toLocaleDateString('fr-FR')}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Submissions Tab */}
              {activeTab === "submissions" && (
                <div className="space-y-4 animate-fadeIn">
                  {submissions.length === 0 ? (
                    <div className="bg-white rounded-xl border border-neutral-200 p-12 text-center">
                      <FileText className="w-12 sm:w-16 h-12 sm:h-16 text-neutral-300 mx-auto mb-4" strokeWidth={1.5} />
                      <h3 className="font-serif text-lg sm:text-xl font-semibold text-neutral-900 mb-2">
                        Aucune soumission
                      </h3>
                      <p className="text-sm sm:text-base text-neutral-600">
                        Les nouvelles soumissions apparaîtront ici
                      </p>
                    </div>
                  ) : (
                    submissions.map((sub, idx) => {
                      const open = expandedSubmissions.has(sub.id)
                      const isPast = sub.date < today
                      
                      return (
                        <div 
                          key={sub.id} 
                          className="bg-white border border-neutral-200 rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-all duration-200"
                        >
                          {/* Header */}
                          <div className="p-4 sm:p-5 flex justify-between items-start sm:items-center gap-3">
                            <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                              <div className={`w-10 sm:w-12 h-10 sm:h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                                isPast ? 'bg-neutral-100' : 'bg-emerald-50'
                              }`}>
                                {isPast ? (
                                  <CheckCircle2 className="w-5 sm:w-6 h-5 sm:h-6 text-neutral-400" strokeWidth={1.5} />
                                ) : (
                                  <Clock className="w-5 sm:w-6 h-5 sm:h-6 text-emerald-600" strokeWidth={1.5} />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <Instagram className="w-3 sm:w-4 h-3 sm:h-4 text-neutral-400 flex-shrink-0" strokeWidth={1.5} />
                                  <p className="font-semibold text-neutral-900 text-sm sm:text-base truncate">@{sub.instagram}</p>
                                </div>
                                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-xs sm:text-sm text-neutral-600">
                                  <span className="font-medium">
                                    {new Date(sub.date).toLocaleDateString('fr-FR', { 
                                      day: 'numeric', 
                                      month: window.innerWidth < 640 ? 'short' : 'long' 
                                    })}
                                  </span>
                                  <span className="text-neutral-300 hidden sm:inline">•</span>
                                  <span className="truncate">{FORMATS[sub.format]?.label}</span>
                                  {sub.subformat && FORMATS[sub.format]?.subformats && (
                                    <>
                                      <span className="text-neutral-300 hidden sm:inline">•</span>
                                      <span className="text-xs px-2 py-0.5 bg-neutral-100 rounded-full truncate inline-block max-w-[200px]">
                                        {FORMATS[sub.format].subformats?.[sub.subformat as keyof typeof FORMATS[typeof sub.format]['subformats']]}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 flex-shrink-0">
                              <button
                                onClick={() => toggleSubmission(sub.id)}
                                className="p-1.5 sm:p-2 hover:bg-neutral-100 rounded-lg transition-colors"
                                aria-label={open ? "Réduire" : "Développer"}
                              >
                                <ChevronDown 
                                  className={`w-5 h-5 text-neutral-600 transition-transform duration-200 ${
                                    open ? "rotate-180" : ""
                                  }`} 
                                  strokeWidth={2}
                                />
                              </button>
                              <button
                                onClick={() => deleteSubmission(sub.id)}
                                className="p-1.5 sm:p-2 hover:bg-red-50 rounded-lg transition-colors group"
                                aria-label="Supprimer"
                              >
                                <Trash2 className="w-5 h-5 text-neutral-400 group-hover:text-red-600 transition-colors" strokeWidth={1.5} />
                              </button>
                            </div>
                          </div>

                          {/* Expanded Content */}
                          {open && (
                            <div className="border-t border-neutral-100 bg-neutral-50 p-4 sm:p-6 animate-slideDown">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                                {Object.entries(sub.answers).map(([k, v]) => {
                                  if (!v) return null
                                  
                                  return (
                                    <div key={k} className="space-y-2">
                                      <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                                        {k.replace(/_/g, ' ')}
                                      </label>
                                      
                                      {isUrl(v) ? (
                                        <div className="space-y-2">
                                          {isImage(v) ? (
                                            <div className="group relative">
                                              <img 
                                                src={v} 
                                                alt={k}
                                                className="w-full h-40 sm:h-48 object-cover rounded-lg border border-neutral-200 cursor-pointer hover:opacity-90 transition-opacity"
                                                onClick={() => setImagePreview(v)}
                                              />
                                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-lg flex items-center justify-center">
                                                <Eye className="w-6 sm:w-8 h-6 sm:h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" strokeWidth={1.5} />
                                              </div>
                                            </div>
                                          ) : isPdf(v) ? (
                                            <a
                                              href={v}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="flex items-center gap-3 p-3 sm:p-4 bg-white border border-neutral-200 rounded-lg hover:border-neutral-900 transition-colors group"
                                            >
                                              <File className="w-5 sm:w-6 h-5 sm:h-6 text-red-500 flex-shrink-0" strokeWidth={1.5} />
                                              <div className="flex-1 min-w-0">
                                                <p className="font-medium text-neutral-900 group-hover:text-neutral-700 truncate text-sm sm:text-base">
                                                  Document PDF
                                                </p>
                                                <p className="text-xs text-neutral-500 truncate">{v}</p>
                                              </div>
                                            </a>
                                          ) : (
                                            <a
                                              href={v}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-blue-600 hover:text-blue-700 underline text-xs sm:text-sm truncate block"
                                            >
                                              {v}
                                            </a>
                                          )}
                                        </div>
                                      ) : v === "true" ? (
                                        <div className="flex items-center gap-2">
                                          <div className="w-5 h-5 bg-emerald-500 rounded flex items-center justify-center">
                                            <CheckCircle2 className="w-4 h-4 text-white" strokeWidth={2} />
                                          </div>
                                          <span className="text-sm font-medium text-emerald-700">Oui</span>
                                        </div>
                                      ) : (
                                        <p className="text-neutral-900 leading-relaxed bg-white p-3 sm:p-4 rounded-lg border border-neutral-200 text-sm sm:text-base">
                                          {v}
                                        </p>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              )}

              {/* Dates Tab */}
              {activeTab === "dates" && (
                <div className="space-y-6 animate-fadeIn">
                  {/* Add Date Form */}
                  <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-4 sm:p-6">
                    <h3 className="font-serif font-semibold text-neutral-900 mb-4 flex items-center gap-2 text-sm sm:text-base">
                      <Plus className="w-4 sm:w-5 h-4 sm:h-5" strokeWidth={2} />
                      Bloquer une nouvelle date
                    </h3>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <input
                        type="date"
                        value={date}
                        onChange={e => setDate(e.target.value)}
                        className="flex-1 border border-neutral-300 rounded-lg px-3 sm:px-4 py-2 sm:py-3 focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10 focus:outline-none transition-all text-sm sm:text-base"
                      />
                      <button
                        onClick={blockDate}
                        disabled={!date}
                        className="px-4 sm:px-6 py-2 sm:py-3 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors disabled:bg-neutral-300 disabled:cursor-not-allowed font-semibold flex items-center justify-center gap-2 text-sm sm:text-base whitespace-nowrap"
                      >
                        <Lock className="w-4 sm:w-5 h-4 sm:h-5" strokeWidth={2} />
                        Bloquer
                      </button>
                    </div>
                  </div>

                  {/* Blocked Dates Grid */}
                  {blockedDates.length === 0 ? (
                    <div className="bg-white rounded-xl border border-neutral-200 p-8 sm:p-12 text-center">
                      <Calendar className="w-12 sm:w-16 h-12 sm:h-16 text-neutral-300 mx-auto mb-4" strokeWidth={1.5} />
                      <h3 className="font-serif text-lg sm:text-xl font-semibold text-neutral-900 mb-2">
                        Aucune date bloquée
                      </h3>
                      <p className="text-sm sm:text-base text-neutral-600">
                        Bloquez des dates pour empêcher les soumissions
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {blockedDates.map((d, idx) => (
                        <div
                          key={d.id}
                          className="bg-white border border-neutral-200 rounded-lg p-4 sm:p-5 hover:shadow-md transition-all duration-200 group"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center flex-shrink-0">
                                <Lock className="w-5 h-5 text-red-600" strokeWidth={1.5} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold text-neutral-900 text-sm sm:text-base truncate">{formatDate(d.date)}</p>
                                <p className="text-xs text-neutral-500 mt-0.5">Date bloquée</p>
                              </div>
                            </div>
                            <button
                              onClick={() => unblockDate(d.id)}
                              className="p-2 hover:bg-emerald-50 rounded-lg transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                              title="Débloquer"
                              aria-label="Débloquer"
                            >
                              <Unlock className="w-5 h-5 text-emerald-600" strokeWidth={1.5} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Image Preview Modal */}
      {imagePreview && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setImagePreview(null)}
        >
          <div className="relative max-w-4xl w-full">
            <button
              onClick={() => setImagePreview(null)}
              className="absolute -top-10 sm:-top-12 right-0 p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              aria-label="Fermer"
            >
              <X className="w-5 sm:w-6 h-5 sm:h-6 text-white" strokeWidth={2} />
            </button>
            <img
              src={imagePreview}
              alt="Preview"
              className="w-full h-auto max-h-[70vh] sm:max-h-[80vh] object-contain rounded-lg shadow-2xl"
              onClick={e => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  )
}

/* ---------- Small components ---------- */

function SidebarItem({
  icon: Icon,
  label,
  active,
  onClick,
  badge
}: {
  icon: any
  label: string
  active: boolean
  onClick: () => void
  badge?: number
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
        active
          ? "bg-white/10 text-white shadow-lg"
          : "hover:bg-white/5 text-neutral-300 hover:text-white"
      }`}
    >
      <div className="flex items-center gap-3">
        <Icon className={`w-5 h-5 transition-transform group-hover:scale-110 ${active ? '' : 'opacity-70'}`} strokeWidth={1.5} />
        <span className="font-medium">{label}</span>
      </div>
      {badge !== undefined && badge > 0 && (
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
          active ? 'bg-white/20' : 'bg-white/10'
        }`}>
          {badge}
        </span>
      )}
    </button>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  trend
}: {
  icon: any
  label: string
  value: number
  color: "blue" | "emerald" | "amber"
  trend?: string
}) {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600"
  }

  return (
    <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-4 sm:p-6 hover:shadow-md transition-all duration-200 group">
      <div className="flex items-start justify-between mb-3 sm:mb-4">
        <div className={`w-10 sm:w-12 h-10 sm:h-12 rounded-lg flex items-center justify-center ${colorClasses[color]} group-hover:scale-110 transition-transform`}>
          <Icon className="w-5 sm:w-6 h-5 sm:h-6" strokeWidth={1.5} />
        </div>
      </div>
      <p className="text-xs sm:text-sm text-neutral-600 mb-1">{label}</p>
      <p className="text-3xl sm:text-4xl font-bold text-neutral-900 mb-1 sm:mb-2">{value}</p>
      {trend && (
        <p className="text-xs text-neutral-500">{trend}</p>
      )}
    </div>
  )
}