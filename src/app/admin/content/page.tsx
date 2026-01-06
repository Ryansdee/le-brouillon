"use client"

import { useState, useEffect, useCallback, memo } from "react"
import { db, auth } from "@/lib/firebase"
import { doc, getDoc, setDoc } from "firebase/firestore"
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, User } from "firebase/auth"
import { defaultContent, SiteContent } from "@/lib/site-content"
import { 
  Save, RefreshCw, Check, AlertCircle, FileText, Layout, Type, 
  MessageSquare, CheckCircle2, Settings, Eye, ChevronDown, 
  ChevronRight, Feather, Home, Sparkles, Edit3, Undo2, 
  LogOut, Shield, User as UserIcon, Info
} from "lucide-react"

// --- COMPOSANTS EXTERNES POUR ÉVITER LE RE-RENDU (PERTE DE FOCUS) ---

const TextInput = memo(({ label, path, value, onChange, placeholder, multiline = false, rows = 3 }: { 
  label: string; 
  path: string;
  value: string; 
  onChange: (path: string, val: string) => void; 
  placeholder?: string; 
  multiline?: boolean; 
  rows?: number 
}) => (
  <div className="space-y-2">
    <label className="block text-sm font-bold text-neutral-700 ml-1">{label}</label>
    {multiline ? (
      <textarea 
        value={value} 
        onChange={e => onChange(path, e.target.value)} 
        placeholder={placeholder} 
        rows={rows} 
        className="w-full border-2 border-neutral-100 rounded-2xl px-4 py-3 focus:border-[#b79ff8] focus:bg-white bg-neutral-50/50 outline-none transition-all resize-none text-neutral-800" 
      />
    ) : (
      <input 
        type="text" 
        value={value} 
        onChange={e => onChange(path, e.target.value)} 
        placeholder={placeholder} 
        className="w-full border-2 border-neutral-100 rounded-2xl px-4 py-3 focus:border-[#b79ff8] focus:bg-white bg-neutral-50/50 outline-none transition-all text-neutral-800 font-medium" 
      />
    )}
  </div>
))
TextInput.displayName = "TextInput"

const Section = ({ id, title, icon: Icon, isExpanded, onToggle, children }: { 
  id: string; 
  title: string; 
  icon: any; 
  isExpanded: boolean; 
  onToggle: () => void; 
  children: React.ReactNode 
}) => (
  <div className="bg-white rounded-[2rem] border border-neutral-100 shadow-sm overflow-hidden transition-all hover:shadow-md">
    <button onClick={onToggle} className="w-full px-8 py-5 flex items-center justify-between hover:bg-neutral-50/50 transition-colors">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-gradient-to-br from-[#a189f2] to-[#b79ff8] rounded-2xl flex items-center justify-center shadow-lg shadow-purple-100">
          <Icon className="w-6 h-6 text-white" strokeWidth={1.5} />
        </div>
        <h3 className="font-serif font-bold text-xl text-neutral-800 tracking-tight">{title}</h3>
      </div>
      {isExpanded ? <ChevronDown className="w-5 h-5 text-neutral-400" /> : <ChevronRight className="w-5 h-5 text-neutral-400" />}
    </button>
    {isExpanded && (
      <div className="px-8 pb-8 pt-2 space-y-6 border-t border-neutral-50 animate-in slide-in-from-top-2 duration-300">
        {children}
      </div>
    )}
  </div>
)

// --- CONFIGURATION ---
const AUTHORIZED_EMAILS = ['ryan.deschuyteneer@gmail.com', 'badpetrova121@gmail.com']

export default function AdminDashboard() {
  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [content, setContent] = useState<SiteContent>(defaultContent)
  const [originalContent, setOriginalContent] = useState<SiteContent>(defaultContent)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['header']))

  // Auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => { setUser(user); setAuthLoading(false) })
    return () => unsubscribe()
  }, [])

  const isAuthorized = user && AUTHORIZED_EMAILS.includes(user.email || '')

  // Load Data
  useEffect(() => {
    if (!isAuthorized) { setIsLoading(false); return }
    const load = async () => {
      try {
        const snap = await getDoc(doc(db, "settings", "site-content"))
        if (snap.exists()) {
          const data = snap.data() as SiteContent
          setContent({ ...defaultContent, ...data })
          setOriginalContent({ ...defaultContent, ...data })
        }
      } catch (e) { console.error(e) }
      setIsLoading(false)
    }
    load()
  }, [isAuthorized])

  const hasChanges = JSON.stringify(content) !== JSON.stringify(originalContent)

  // Handlers
  const updateField = useCallback((path: string, value: string) => {
    setContent(prev => {
      const newContent = JSON.parse(JSON.stringify(prev))
      const keys = path.split('.')
      let current: any = newContent
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]]
      }
      current[keys[keys.length - 1]] = value
      return newContent
    })
  }, [])

  const toggleSection = (s: string) => {
    const n = new Set(expandedSections)
    n.has(s) ? n.delete(s) : n.add(s)
    setExpandedSections(n)
  }

  const saveContent = async () => {
    setIsSaving(true)
    try {
      await setDoc(doc(db, "settings", "site-content"), content)
      setOriginalContent(JSON.parse(JSON.stringify(content)))
      setSaveStatus('success')
      setTimeout(() => setSaveStatus('idle'), 3000)
    } catch (e) { setSaveStatus('error') }
    setIsSaving(false)
  }

  if (authLoading || (isAuthorized && isLoading)) return (
    <div className="min-h-screen flex items-center justify-center bg-[#fafefd]">
      <div className="w-10 h-10 border-4 border-[#a189f2] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!user || !isAuthorized) {
    return (
      <div className="min-h-screen bg-[#fafefd] flex items-center justify-center p-6 text-center">
        <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl border border-neutral-100 overflow-hidden">
          <div className={`px-8 py-16 bg-gradient-to-br ${!user ? 'from-[#a189f2] to-[#b79ff8]' : 'from-red-500 to-red-600'}`}>
            {!user ? <Shield className="w-16 h-16 text-white mx-auto mb-4" /> : <AlertCircle className="w-16 h-16 text-white mx-auto mb-4" />}
            <h1 className="text-2xl font-serif font-bold text-white tracking-tight">{!user ? "Administration" : "Accès refusé"}</h1>
          </div>
          <div className="p-10 space-y-6">
            {!user ? (
              <button onClick={() => signInWithPopup(auth, new GoogleAuthProvider())} className="w-full py-4 bg-white border-2 border-neutral-100 rounded-2xl font-bold flex items-center justify-center gap-3 hover:border-[#a189f2] transition-all">
                Se connecter avec Google
              </button>
            ) : (
              <>
                <p className="text-neutral-500 font-medium leading-relaxed italic">L'email <b>{user.email}</b> n'est pas autorisé.</p>
                <button onClick={() => signOut(auth)} className="w-full py-4 bg-neutral-100 rounded-2xl font-bold">Déconnexion</button>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#fafefd]">
      <header className="bg-white/80 backdrop-blur-xl border-b border-neutral-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 bg-gradient-to-br from-[#a189f2] to-[#b79ff8] rounded-xl flex items-center justify-center text-white shadow-lg shadow-purple-100">
              <Settings size={22} />
            </div>
            <div className="hidden sm:block">
              <h1 className="font-serif font-bold text-lg text-neutral-900">Dashboard Admin</h1>
              <p className="text-[10px] font-bold text-[#a189f2] uppercase tracking-widest">{user.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
             {hasChanges && (
                <button onClick={() => setContent(originalContent)} className="p-2.5 text-neutral-400 hover:text-neutral-900 transition-colors">
                  <Undo2 size={20}/>
                </button>
             )}
             <button 
                onClick={saveContent} 
                disabled={!hasChanges || isSaving} 
                className={`px-8 py-3 rounded-2xl font-bold text-[#a189f2] transition-all ${hasChanges ? 'bg-[#a189f2] text-[#a189f2] shadow-xl shadow-purple-200' : 'bg-neutral-100 text-[#a189f2] cursor-pointer' } flex items-center gap-3 hover:shadow-purple-300`}
             >
                {isSaving ? "Envoi..." : saveStatus === 'success' ? "Enregistré !" : "Enregistrer"}
             </button>
             <button onClick={() => signOut(auth)} className="p-2.5 text-neutral-400 hover:text-red-500 transition-colors">
               <LogOut size={20}/>
             </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid lg:grid-cols-12 gap-10">
          
          <div className="lg:col-span-8 space-y-8">
            <Section id="header" title="En-tête & Identité" icon={Home} isExpanded={expandedSections.has('header')} onToggle={() => toggleSection('header')}>
              <TextInput label="Nom du site" path="siteName" value={content.siteName} onChange={updateField} />
              <TextInput label="Slogan" path="siteTagline" value={content.siteTagline} onChange={updateField} />
              <TextInput label="Badge header" path="headerBadge" value={content.headerBadge} onChange={updateField} />
            </Section>

            <Section id="hero" title="Section Héro" icon={Sparkles} isExpanded={expandedSections.has('hero')} onToggle={() => toggleSection('hero')}>
              <TextInput label="Texte bienvenue" path="heroWelcome" value={content.heroWelcome} onChange={updateField} />
              <TextInput label="Titre principal" path="heroTitle" value={content.heroTitle} onChange={updateField} />
              <TextInput label="Description" path="heroSubtitle" value={content.heroSubtitle} multiline onChange={updateField} />
            </Section>

            <Section id="formats" title="Descriptions des formats" icon={FileText} isExpanded={expandedSections.has('formats')} onToggle={() => toggleSection('formats')}>
              <TextInput label="Meet the Author" path="formatDescriptions.meet_author" value={content.formatDescriptions.meet_author} multiline onChange={updateField} />
              <TextInput label="Story of the Week" path="formatDescriptions.story_week" value={content.formatDescriptions.story_week} multiline onChange={updateField} />
              <TextInput label="Behind the Brouillon" path="formatDescriptions.behind_brouillon" value={content.formatDescriptions.behind_brouillon} multiline onChange={updateField} />
              <TextInput label="Autre format" path="formatDescriptions.other" value={content.formatDescriptions.other} multiline onChange={updateField} />
              <div className="h-px bg-neutral-100 my-4" />
              <p className="text-xs font-black text-[#a189f2] uppercase tracking-widest">Consignes (Bulle Info)</p>
              <TextInput label="Meet the Author" path="formatInstructions.meet_author" value={content.formatInstructions.meet_author} multiline onChange={updateField} />
              <TextInput label="Story of the Week" path="formatInstructions.story_week" value={content.formatInstructions.story_week} multiline onChange={updateField} />
              <TextInput label="Behind the Brouillon" path="formatInstructions.behind_brouillon" value={content.formatInstructions.behind_brouillon} multiline onChange={updateField} />
              <TextInput label="Autre" path="formatInstructions.other" value={content.formatInstructions.other} multiline onChange={updateField} />
            </Section>

            <Section id="progress" title="Barre de progression" icon={CheckCircle2} isExpanded={expandedSections.has('progress')} onToggle={() => toggleSection('progress')}>
              <TextInput label="Titre barre" path="progressTitle" value={content.progressTitle} onChange={updateField} />
              <div className="grid grid-cols-2 gap-4">
                <TextInput label="Étape Insta" path="progressSteps.instagram" value={content.progressSteps.instagram} onChange={updateField} />
                <TextInput label="Étape Format" path="progressSteps.format" value={content.progressSteps.format} onChange={updateField} />
                <TextInput label="Étape Réponses" path="progressSteps.answers" value={content.progressSteps.answers} onChange={updateField} />
                <TextInput label="Étape Date" path="progressSteps.date" value={content.progressSteps.date} onChange={updateField} />
              </div>
            </Section>

            <Section id="success" title="Page de succès" icon={Check} isExpanded={expandedSections.has('success')} onToggle={() => toggleSection('success')}>
              <TextInput label="Titre" path="successTitle" value={content.successTitle} onChange={updateField} />
              <TextInput label="Sous-titre" path="successSubtitle" value={content.successSubtitle} multiline onChange={updateField} />
              <TextInput label="Bouton retour" path="successNewButton" value={content.successNewButton} onChange={updateField} />
            </Section>
          </div>

          <div className="lg:col-span-4">
            <div className="bg-white rounded-[2rem] border border-neutral-100 shadow-xl shadow-purple-50 p-8 sticky top-32 space-y-8">
              <h3 className="font-serif font-bold text-lg text-[#a189f2] flex items-center gap-3">
                <Edit3 className="w-5 h-5 text-[#a189f2]" /> Actions
              </h3>
              <div className="space-y-3">
                <button onClick={() => setExpandedSections(new Set(['header', 'hero', 'formats', 'progress', 'success']))} className="w-full py-4 bg-[#fdfcff] hover:bg-[#f3f0ff] border border-[#f3f0ff] rounded-2xl text-xs font-bold text-[#a189f2] uppercase tracking-widest transition-all">Tout déplier</button>
                <button onClick={() => setExpandedSections(new Set())} className="w-full py-4 bg-neutral-50 rounded-2xl text-xs font-bold text-neutral-400 uppercase tracking-widest transition-all">Tout replier</button>
                <div className="h-px bg-neutral-100 my-4" />
                <button onClick={() => confirm("Réinitialiser ?") && setContent(defaultContent)} className="w-full py-4 bg-red-50 text-red-500 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all">Réinitialiser</button>
              </div>

              <div className="pt-6 border-t border-neutral-50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-neutral-100 overflow-hidden">
                    {user.photoURL ? <img src={user.photoURL} alt="" /> : <UserIcon className="w-full h-full p-3 text-neutral-300" />}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-neutral-800 text-sm truncate">{user.displayName}</p>
                    <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">Administrateur</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}