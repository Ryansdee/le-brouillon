"use client"

import { useState, useEffect } from "react"
import { FORMATS, getBehindBrouillonQuestions, getSubformatConfig } from "@/lib/formats"
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
  Calendar,
  Lightbulb,
  Info,
  ChevronRight
} from "lucide-react"
import CustomCalendar from "@/components/CustomCalendar"

const DAY_NAMES: Record<number, string> = {
  0: "Dimanche", 1: "Lundi", 2: "Mardi", 3: "Mercredi", 4: "Jeudi", 5: "Vendredi", 6: "Samedi"
}

export default function Page() {
  // États du contenu dynamique (Dashboard)
  const [siteContent, setSiteContent] = useState<SiteContent>(defaultContent)
  
  // États du formulaire
  const [instagram, setInstagram] = useState("")
  const [format, setFormat] = useState<FormatKey | "">("")
  const [subformat, setSubformat] = useState<SubformatKey | "">("")
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [date, setDate] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [uploadingFiles, setUploadingFiles] = useState<Record<string, boolean>>({})

  // 1. Charger le contenu depuis Firebase au démarrage
  useEffect(() => {
    const loadContent = async () => {
      try {
        const snap = await getDoc(doc(db, "settings", "site-content"))
        if (snap.exists()) {
          setSiteContent({ ...defaultContent, ...snap.data() as SiteContent })
        }
      } catch (e) {
        console.error("Erreur chargement contenu:", e)
      }
    }
    loadContent()
  }, [])

  // Logique d'upload
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

  const f = format ? FORMATS[format] : null
  const questions = format === "behind_brouillon" && subformat 
    ? getBehindBrouillonQuestions(subformat as SubformatKey) 
    : f?.questions || []
  const subformatConfig = format === "behind_brouillon" && subformat 
    ? getSubformatConfig(subformat as SubformatKey) 
    : null

  // Récupération dynamique des descriptions et consignes
  const getFormatDescription = (key: string) => {
    return siteContent.formatDescriptions[key as keyof typeof siteContent.formatDescriptions] || ""
  }

  const getFormatConsigne = (key: string) => {
    return siteContent.formatInstructions[key as keyof typeof siteContent.formatInstructions] || ""
  }

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

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#fafefd] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-[2.5rem] border border-neutral-100 p-12 text-center shadow-2xl shadow-purple-100/30 animate-in zoom-in-95 duration-500">
          <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
          </div>
          <h2 className="text-3xl font-serif font-bold text-neutral-900 mb-3">{siteContent.successTitle}</h2>
          <p className="text-neutral-500 mb-8 leading-relaxed font-medium">{siteContent.successSubtitle}</p>
          <button onClick={() => window.location.reload()} className="w-full py-4 bg-[#a189f2] hover:bg-[#b79ff8] text-white rounded-2xl font-bold transition-all shadow-lg shadow-purple-200">
            {siteContent.successNewButton}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#fafefd] pb-24">
      <div className="max-w-3xl mx-auto px-6 pt-12 space-y-10">
        
        {/* Header Dynamique */}
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
          
          {/* Étape 1 : Insta */}
          <section className="bg-white p-8 rounded-[2rem] border border-purple-50 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-center gap-5 mb-6">
              <span className="flex-shrink-0 w-10 h-10 bg-[#f3f0ff] text-[#a189f2] rounded-full flex items-center justify-center font-bold text-lg">1</span>
              <h2 className="text-xl font-serif font-bold text-neutral-800 tracking-wide">{siteContent.progressSteps.instagram}</h2>
            </div>
            <div className="relative group">
              <Instagram className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#b79ff8] transition-colors group-focus-within:text-[#a189f2]" />
              <input 
                value={instagram} 
                onChange={e => setInstagram(e.target.value)} 
                placeholder="@votre_pseudo_instagram" 
                className="w-full pl-12 pr-6 py-4 bg-neutral-50 border-transparent border-2 rounded-2xl focus:bg-white focus:border-[#b79ff8] outline-none transition-all text-neutral-800 font-medium" 
              />
            </div>
          </section>

          {/* Étape 2 : Formats */}
          <section className="bg-white p-8 rounded-[2rem] border border-purple-50 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-center gap-5 mb-6">
              <span className="flex-shrink-0 w-10 h-10 bg-[#f3f0ff] text-[#a189f2] rounded-full flex items-center justify-center font-bold text-lg">2</span>
              <h2 className="text-xl font-serif font-bold text-neutral-800 tracking-wide">{siteContent.progressSteps.format}</h2>
            </div>
            <div className="grid gap-4">
              {Object.entries(FORMATS).map(([k, v]) => (
                <button 
                  key={k} 
                  onClick={() => { setFormat(k as FormatKey); setSubformat(""); setAnswers({}); setDate(""); }}
                  className={`group w-full text-left p-6 rounded-2xl border-2 transition-all flex flex-col gap-2 ${
                    format === k 
                    ? "border-[#a189f2] bg-[#fdfcff] shadow-sm" 
                    : "border-neutral-100 hover:border-[#e0d9fc] hover:bg-neutral-50/50"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className={`font-bold text-lg ${format === k ? "text-[#a189f2]" : "text-neutral-700"}`}>{v.label}</span>
                    <ChevronRight className={`w-5 h-5 transition-transform ${format === k ? "text-[#a189f2] translate-x-1" : "text-neutral-300"}`} />
                  </div>
                  <p className="text-sm text-neutral-500 leading-relaxed font-medium">{getFormatDescription(k)}</p>
                  {format === k && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-widest bg-[#a189f2] text-white px-3 py-1.5 rounded-lg shadow-sm">
                        {v.days.map(d => DAY_NAMES[d]).join(", ")}
                      </span>
                    </div>
                  )}
                </button>
              ))}
            </div>

            {format === "behind_brouillon" && (
              <div className="mt-6 p-6 bg-[#f9f8ff] rounded-2xl border border-[#ece9ff] space-y-4 animate-in slide-in-from-top-4 duration-300">
                <label className="text-sm font-bold text-[#a189f2] uppercase tracking-wider">Type de publication</label>
                <select 
                  className="w-full p-4 bg-white border-2 border-transparent focus:border-[#b79ff8] rounded-xl outline-none transition-all font-semibold text-neutral-700 shadow-sm" 
                  value={subformat} 
                  onChange={e => { setSubformat(e.target.value as SubformatKey); setAnswers({}); }}
                >
                  <option value="">Sélectionnez un angle...</option>
                  {Object.entries(FORMATS[format].subformats!).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                {subformatConfig && (
                  <div className="p-4 bg-white border border-[#a189f2] rounded-xl flex gap-4 items-start shadow-sm">
                    <div className="p-2 bg-yellow-50 rounded-lg">
                      <Lightbulb className="w-5 h-5 text-yellow-600" />
                    </div>
                    <p className="text-sm text-neutral-600 leading-relaxed italic font-medium">"{subformatConfig.example}"</p>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Étape 3 : Contenu */}
          {format && (
            <section className="bg-white p-8 rounded-[2rem] border border-purple-50 shadow-sm transition-all hover:shadow-md animate-in fade-in duration-500">
              <div className="flex items-center gap-5 mb-8">
                <span className="flex-shrink-0 w-10 h-10 bg-[#f3f0ff] text-[#a189f2] rounded-full flex items-center justify-center font-bold text-lg">3</span>
                <h2 className="text-xl font-serif font-bold text-neutral-800 tracking-wide">{siteContent.progressSteps.answers}</h2>
              </div>
              
              <div className="space-y-10">
                <div className="p-5 bg-[#fdfcff] border-1 border-[#a189f2] rounded-2xl flex gap-4 items-center">
                  <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center shrink-0">
                    <Info className="w-5 h-5 text-[#a189f2]" />
                  </div>
                  <p className="text-sm text-[#7e71ad] leading-relaxed font-semibold italic">
                    {getFormatConsigne(format)}
                  </p>
                </div>

                {questions.map((q, idx) => (
                  <div key={q.id} className="space-y-4">
                    <label className="block font-bold text-neutral-700 text-lg">
                      <span className="text-[#b79ff8] mr-3 font-serif italic text-xl">0{idx + 1}.</span> {q.label}
                    </label>
                    
                    {q.type === "image" ? (
                      <div className="relative group">
                        <input type="file" id={q.id} className="hidden" onChange={e => e.target.files && uploadFile(e.target.files[0], q.id)} />
                        <label htmlFor={q.id} className={`flex flex-col items-center justify-center w-full min-h-[160px] border-2 border-dashed rounded-[2rem] cursor-pointer transition-all ${answers[q.id] ? "border-emerald-400 bg-emerald-50/30" : "border-[#e0d9fc] hover:border-[#a189f2] bg-neutral-50/50 hover:bg-white"}`}>
                          {uploadingFiles[q.id] ? (
                            <div className="animate-spin rounded-full h-8 w-8 border-4 border-[#a189f2] border-t-transparent" />
                          ) : answers[q.id] ? (
                            <div className="text-center">
                              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-2">
                                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                              </div>
                              <span className="text-sm font-bold text-emerald-600">Fichier validé</span>
                            </div>
                          ) : (
                            <div className="text-center group-hover:scale-105 transition-transform">
                              <div className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-3">
                                <Upload className="w-6 h-6 text-[#a189f2]" />
                              </div>
                              <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest">JPG, PNG ou PDF</span>
                            </div>
                          )}
                        </label>
                      </div>
                    ) : q.type === "checkbox" ? (
                      <div className="flex items-center gap-4 p-5 bg-neutral-50 rounded-2xl border border-transparent hover:border-[#f3f0ff] transition-all cursor-pointer">
                        <input type="checkbox" id={q.id} className="w-6 h-6 rounded-lg accent-[#a189f2] cursor-pointer" checked={!!answers[q.id]} onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.checked ? "true" : "" }))} />
                        <label htmlFor={q.id} className="text-sm font-bold text-neutral-600 cursor-pointer">{q.label}</label>
                      </div>
                    ) : (
                      <textarea 
                        className="w-full p-6 bg-neutral-50 border-1 border-[#a189f2] focus:bg-white focus:border-[#b79ff8] rounded-2xl outline-none min-h-[160px] transition-all text-gray-700 font-medium placeholder:text-gray-500" 
                        placeholder="Écrivez ici..." 
                        value={answers[q.id] || ""} 
                        onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))} 
                      />
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Étape 4 : Calendrier */}
          {format && (
            <section className="bg-white p-8 rounded-[2rem] border border-purple-50 shadow-sm transition-all hover:shadow-md">
              <div className="flex items-center gap-5 mb-8">
                <span className="flex-shrink-0 w-10 h-10 bg-[#f3f0ff] text-[#a189f2] rounded-full flex items-center justify-center font-bold text-lg">4</span>
                <h2 className="text-xl font-serif font-bold text-neutral-800 tracking-wide">{siteContent.progressSteps.date}</h2>
              </div>
              <div className="p-2">
                <CustomCalendar selectedDate={date} onSelectDate={setDate} allowedDays={f?.days || []} format={format} />
              </div>
            </section>
          )}

          {/* Bouton de Soumission */}
          <div className="pt-8 space-y-6">
            <button 
              onClick={submit} 
              disabled={!isFormValid || isSubmitting} 
              className="group relative w-full overflow-hidden bg-[#a189f2] hover:bg-[#b79ff8] py-5 rounded-2xl disabled:bg-neutral-200 disabled:text-neutral-400 transition-all font-black text-xl text-white shadow-xl shadow-purple-200 flex items-center justify-center gap-4"
            >
              {isSubmitting ? (
                <div className="animate-spin rounded-full h-6 w-6 border-3 border-white border-t-transparent" />
              ) : (
                <>
                  <Send className="w-6 h-6 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                  Soumettre mon projet
                </>
              )}
            </button>
            
            {!isFormValid && instagram && format && date && (
              <div className="flex items-center justify-center gap-3 p-4 bg-red-50 text-red-500 rounded-2xl border border-red-100 animate-bounce">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span className="text-sm font-bold">Certains champs requis sont vides.</span>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}