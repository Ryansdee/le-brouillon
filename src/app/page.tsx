"use client"

import { useState, useEffect } from "react"
import { FORMATS as LOCAL_FORMATS } from "@/lib/formats"
import { FormatKey, SubformatKey } from "@/types/form"
import { db, storage } from "@/lib/firebase"
import { collection, addDoc, doc, getDoc } from "firebase/firestore"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { defaultContent, SiteContent } from "@/lib/site-content"
import {
  CheckCircle2,
  Send,
  AlertCircle,
  Instagram,
  Upload,
  Feather,
  BookOpen,
  Info,
  ChevronRight,
  Lightbulb
} from "lucide-react"
import CustomCalendar from "@/components/CustomCalendar"
import { motion } from "framer-motion"

const DAY_NAMES: Record<number, string> = {
  0: "Dimanche", 1: "Lundi", 2: "Mardi", 3: "Mercredi", 4: "Jeudi", 5: "Vendredi", 6: "Samedi"
}

// --- LOGIQUE D'ORDRE STRICT ---
const ORDERED_FORMATS: FormatKey[] = [
  "meet_author",
  "story_week",
  "behind_brouillon",
  "other"
]

const ORDERED_SUBFORMATS: SubformatKey[] = [
  "conseils",
  "confessions",
  "mythes",
  "sensible",
  "other"
]

export default function Page() {
  const [siteContent, setSiteContent] = useState<SiteContent>(defaultContent)
  const [allFormats, setAllFormats] = useState<any>(LOCAL_FORMATS)
  
  const [instagram, setInstagram] = useState("")
  const [format, setFormat] = useState<FormatKey | "">("")
  const [subformat, setSubformat] = useState<SubformatKey | "">("")
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [date, setDate] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [uploadingFiles, setUploadingFiles] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadAllData = async () => {
      setLoading(true)
      try {
        const contentSnap = await getDoc(doc(db, "settings", "site-content"))
        if (contentSnap.exists()) {
          setSiteContent({ ...defaultContent, ...contentSnap.data() as SiteContent })
        }

        const formatsSnap = await getDoc(doc(db, "settings", "formats"))
        if (formatsSnap.exists()) {
          setAllFormats(formatsSnap.data())
        }
      } catch (e) {
        console.error("Erreur chargement données Firebase:", e)
      } finally {
        setLoading(false)
      }
    }
    loadAllData()
  }, [])

  const getDynamicQuestions = () => {
    if (!format || !allFormats[format]) return []
    const currentConfig = allFormats[format]

    if (format === "behind_brouillon" && subformat) {
      const common = currentConfig.commonQuestions || []
      const specific = currentConfig.subformatConfigs?.[subformat]?.questions || []
      return [...specific, ...common]
    }
    return currentConfig.questions || []
  }

  const uploadFile = async (file: File, id: string) => {
    if (!instagram) { alert("Veuillez d'abord entrer votre pseudo Instagram."); return; }
    const allowed = ["image/png", "image/jpeg", "image/jpg", "application/pdf"]
    if (!allowed.includes(file.type)) { alert("Formats acceptés : PNG, JPG, JPEG, PDF"); return; }
    setUploadingFiles(prev => ({ ...prev, [id]: true }))
    try {
      const fileRef = ref(storage, `uploads/${instagram}/${id}-${Date.now()}`)
      await uploadBytes(fileRef, file, { contentType: file.type })
      const url = await getDownloadURL(fileRef)
      setAnswers(a => ({ ...a, [id]: url }))
    } catch (error) { alert("Erreur lors de l'upload."); } 
    finally { setUploadingFiles(prev => ({ ...prev, [id]: false })) }
  }

  const questions = getDynamicQuestions()
  const activeFormatConfig = format ? allFormats[format] : null
  const subformatConfig = (format === "behind_brouillon" && subformat) 
    ? activeFormatConfig?.subformatConfigs?.[subformat] 
    : null

  const isFormValid = instagram && format && date && (format !== "behind_brouillon" || subformat)

  const submit = async () => {
    if (!isFormValid) return
    setIsSubmitting(true)
    try {
      await addDoc(collection(db, "submissions"), {
        instagram, format, subformat: subformat || null, date, answers, createdAt: new Date()
      })
      setSubmitted(true)
    } catch { alert("Erreur lors de l'envoi."); } 
    finally { setIsSubmitting(false) }
  }

  if (loading) return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#fafefd]">
        <motion.div 
          animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="mb-4"
        >
          <Feather className="w-12 h-12 text-[#a189f2]" />
        </motion.div>
        <motion.p 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          className="text-[#a189f2] font-black tracking-widest uppercase text-sm"
        >
          Préparation du Brouillon...
        </motion.p>
      </div>
    )

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#fafefd] flex items-center justify-center p-6 text-neutral-900">
        <div className="max-w-md w-full bg-white rounded-[2.5rem] border border-neutral-100 p-12 text-center shadow-2xl">
          <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
          </div>
          <h2 className="text-3xl font-serif font-bold text-neutral-900 mb-3">{siteContent.successTitle}</h2>
          <p className="text-neutral-500 mb-8 leading-relaxed font-medium">{siteContent.successSubtitle}</p>
          <button onClick={() => window.location.reload()} className="w-full py-4 bg-[#a189f2] hover:bg-[#b79ff8] text-white rounded-2xl font-bold">
            {siteContent.successNewButton}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#fafefd] pb-24 text-neutral-900">
      <div className="max-w-3xl mx-auto px-6 pt-12 space-y-10">
        
        <header className="relative p-10 rounded-[2.5rem] overflow-hidden shadow-2xl shadow-purple-100">
          <div className="absolute inset-0 bg-gradient-to-br from-[#a189f2] to-[#b79ff8]" />
          <div className="relative z-10 text-white">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl">
                <Feather className="w-8 h-8 text-white" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] bg-white/20 px-3 py-1 rounded-full mb-1 inline-block">
                  {siteContent.headerBadge}
                </span>
                <h1 className="text-4xl font-serif font-bold tracking-tight">{siteContent.siteName}</h1>
              </div>
            </div>
            <p className="text-purple-50 text-lg opacity-90 max-w-lg leading-relaxed font-medium">
              {siteContent.siteTagline}
            </p>
          </div>
          <BookOpen className="absolute -right-12 -bottom-12 w-64 h-64 text-white/10 rotate-12" />
        </header>

        <div className="space-y-8">
          <section className="bg-white p-8 rounded-[2rem] border border-purple-50 shadow-sm">
            <div className="flex items-center gap-5 mb-6">
              <span className="flex-shrink-0 w-10 h-10 bg-[#f3f0ff] text-[#a189f2] rounded-full flex items-center justify-center font-bold text-lg">1</span>
              <h2 className="text-xl font-serif font-bold text-neutral-800">{siteContent.progressSteps.instagram}</h2>
            </div>
            <div className="relative group">
              <Instagram className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#b79ff8]" />
              <input 
                value={instagram} 
                onChange={e => setInstagram(e.target.value)} 
                placeholder="@votre_pseudo_instagram" 
                className="w-full pl-12 pr-6 py-4 bg-neutral-50 border-1 border-[#a189f2] text-gray-900 rounded-2xl focus:bg-white focus:border-[#b79ff8] outline-none transition-all font-medium" 
              />
            </div>
          </section>

          {/* Étape 2 : Formats (Ordre Strict) */}
          <section className="bg-white p-8 rounded-[2rem] border border-purple-50 shadow-sm">
            <div className="flex items-center gap-5 mb-6">
              <span className="flex-shrink-0 w-10 h-10 bg-[#f3f0ff] text-[#a189f2] rounded-full flex items-center justify-center font-bold text-lg">2</span>
              <h2 className="text-xl font-serif font-bold text-neutral-800">{siteContent.progressSteps.format}</h2>
            </div>
            <div className="grid gap-4">
              {ORDERED_FORMATS.map((k) => {
                const v = allFormats[k];
                if (!v) return null;
                return (
                  <button 
                    key={k} 
                    onClick={() => { setFormat(k); setSubformat(""); setAnswers({}); setDate(""); }}
                    className={`group w-full text-left p-6 rounded-2xl border-1 border-[#a189f2] transition-all flex flex-col gap-2`}
                  >
                    <div className="flex justify-between items-center">
                      <span className={`font-bold text-lg ${format === k ? "text-[#a189f2]" : "text-neutral-700"}`}>{v.label}</span>
                      <ChevronRight className={`w-5 h-5 ${format === k ? "text-[#a189f2]" : "text-neutral-300"}`} />
                    </div>
                    <p className="text-sm text-neutral-500 font-medium">
                      {siteContent.formatDescriptions[k] || ""}
                    </p>
                    {format === k && (
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-widest bg-[#a189f2] text-white px-3 py-1.5 rounded-lg">
                          {v.days?.map((d: number) => DAY_NAMES[d]).join(", ")}
                        </span>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Sous-formats Behind the Brouillon (Ordre Strict) */}
            {format === "behind_brouillon" && activeFormatConfig?.subformatConfigs && (
              <div className="mt-6 p-6 bg-[#f9f8ff] rounded-2xl border border-[#ece9ff] space-y-4">
                <label className="text-sm font-black text-[#a189f2] uppercase tracking-wider">Type de publication</label>
                <select 
                  className="w-full p-4 bg-white border-2 border-transparent focus:border-[#b79ff8] rounded-xl outline-none font-bold text-neutral-700 shadow-sm" 
                  value={subformat} 
                  onChange={e => { setSubformat(e.target.value as SubformatKey); setAnswers({}); }}
                >
                  <option value="">Sélectionnez un angle...</option>
                  {ORDERED_SUBFORMATS.map((subK) => {
                    const subV = activeFormatConfig.subformatConfigs[subK];
                    if (!subV) return null;
                    return (
                      <option key={subK} value={subK}>{subV.label}</option>
                    )
                  })}
                </select>
                {subformatConfig?.example && (
                  <div className="p-4 bg-white border border-[#a189f2] rounded-xl flex gap-4 items-start shadow-sm">
                    <div className="p-2 bg-yellow-50 rounded-lg shrink-0">
                      <Lightbulb className="w-5 h-5 text-yellow-600" />
                    </div>
                    <p className="text-sm text-neutral-600 italic font-medium">"{subformatConfig.example}"</p>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Étape 3 : Questions */}
          {format && (
            <section className="bg-white p-8 rounded-[2rem] border border-purple-50 shadow-sm animate-in fade-in duration-500">
              <div className="flex items-center gap-5 mb-8">
                <span className="flex-shrink-0 w-10 h-10 bg-[#f3f0ff] text-[#a189f2] rounded-full flex items-center justify-center font-bold text-lg">3</span>
                <h2 className="text-xl font-serif font-bold text-neutral-800">{siteContent.progressSteps.answers}</h2>
              </div>
              
              <div className="space-y-10">
                <div className="p-5 bg-[#fdfcff] border border-[#a189f2]/20 rounded-2xl flex gap-4 items-center">
                  <Info className="w-5 h-5 text-[#a189f2] shrink-0" />
                  <p className="text-sm text-[#7e71ad] font-semibold italic">
                    {activeFormatConfig?.consigne || siteContent.formatInstructions[format as keyof typeof siteContent.formatInstructions]}
                  </p>
                </div>

                {questions.map((q: any, idx: number) => (
                  <div key={q.id} className="space-y-4">
                    <label className="block font-bold text-neutral-700 text-lg">
                      <span className="text-[#b79ff8] mr-3 font-serif italic text-xl">0{idx + 1}.</span> {q.label}
                    </label>
                    
                    {q.type === "image" ? (
                      <div className="relative">
                        <input type="file" id={q.id} className="hidden" onChange={e => e.target.files && uploadFile(e.target.files[0], q.id)} />
                        <label htmlFor={q.id} className={`flex flex-col items-center justify-center w-full min-h-[140px] border-1 border-[#a189f2] border-dashed rounded-[2rem] cursor-pointer transition-all ${answers[q.id] ? "border-emerald-400 bg-emerald-50/30" : "border-[#e0d9fc] hover:border-[#a189f2] bg-neutral-50/50"}`}>
                          {uploadingFiles[q.id] ? (
                            <div className="animate-spin rounded-full h-8 w-8 border-4" />
                          ) : answers[q.id] ? (
                            <span className="text-sm font-bold text-emerald-600 flex items-center gap-2"><CheckCircle2 /> Fichier validé</span>
                          ) : (
                            <div className="text-center">
                              <Upload className="w-6 h-6 text-[#a189f2] mx-auto mb-2" />
                              <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">JPG, PNG, PDF</span>
                            </div>
                          )}
                        </label>
                      </div>
                    ) : q.type === "checkbox" ? (
                      <div className="flex items-center gap-4 p-5 bg-neutral-50 rounded-2xl border-[#a189f2] hover:border-[#f3f0ff] transition-all cursor-pointer">
                        <input type="checkbox" id={q.id} className="w-6 h-6 accent-[#a189f2]" checked={!!answers[q.id]} onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.checked ? "true" : "" }))} />
                        <label htmlFor={q.id} className="text-sm font-bold text-neutral-600">{q.label}</label>
                      </div>
                    ) : (
                      <textarea 
                        className="w-full p-6 bg-neutral-50 border-1 border-[#a189f2] focus:bg-white focus:border-[#b79ff8] rounded-2xl outline-none min-h-[160px] transition-all text-neutral-800 font-medium" 
                        placeholder={q.placeholder || "Écrivez ici..."} 
                        value={answers[q.id] || ""} 
                        onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))} 
                      />
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="bg-white p-8 rounded-[2rem] border border-purple-50 shadow-sm">
            <div className="flex items-center gap-5 mb-8">
              <span className="flex-shrink-0 w-10 h-10 bg-[#f3f0ff] text-[#a189f2] rounded-full flex items-center justify-center font-bold text-lg">4</span>
              <h2 className="text-xl font-serif font-bold text-neutral-800">{siteContent.progressSteps.date}</h2>
            </div>
            <CustomCalendar selectedDate={date} onSelectDate={setDate} allowedDays={activeFormatConfig?.days || []} format={format} />
          </section>

          <div className="pt-8">
            <button 
              onClick={submit} 
              disabled={!isFormValid || isSubmitting} 
              className="w-full bg-[#a189f2] hover:bg-[#b79ff8] py-5 rounded-2xl disabled:bg-neutral-200 disabled:text-neutral-400 transition-all font-black text-xl text-white shadow-xl flex items-center justify-center gap-4"
            >
              {isSubmitting ? (
                <div className="animate-spin rounded-full h-6 w-6 border-3 border-white border-t-transparent" />
              ) : (
                <>
                  <Send className="w-6 h-6" />
                  Soumettre mon projet
                </>
              )}
            </button>
            
            {!isFormValid && instagram && format && date && (
              <div className="mt-4 flex items-center justify-center gap-3 text-red-500 font-bold animate-bounce">
                <AlertCircle className="w-5 h-5" />
                <span className="text-sm">Vérifiez les sous-formats ou les champs manquants.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}