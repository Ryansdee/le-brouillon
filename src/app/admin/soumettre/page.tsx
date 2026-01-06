"use client"

import { useState } from "react"
import { FORMATS, getBehindBrouillonQuestions, getSubformatConfig } from "@/lib/formats"
import { FormatKey, SubformatKey } from "@/types/form"
import { db, storage } from "@/lib/firebase"
import { collection, addDoc } from "firebase/firestore"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { CheckCircle2, FileText, Send, AlertCircle, Instagram, Upload, Feather, BookOpen, Sparkles, Calendar, Lightbulb, ChevronRight } from "lucide-react"
import CustomCalendar from "@/components/CustomCalendar"
import { useSiteContent } from "@/lib/Usesitecontent"

const DAY_NAMES: Record<number, string> = {
  0: "Dimanche",
  1: "Lundi",
  2: "Mardi",
  3: "Mercredi",
  4: "Jeudi",
  5: "Vendredi",
  6: "Samedi"
}

export default function Page() {
  const { content, isLoading: contentLoading } = useSiteContent()
  
  const [instagram, setInstagram] = useState("")
  const [format, setFormat] = useState<FormatKey | "">("") 
  const [subformat, setSubformat] = useState<SubformatKey | "">("") 
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [date, setDate] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [uploadingFiles, setUploadingFiles] = useState<Record<string, boolean>>({})

  const uploadFile = async (file: File, id: string) => {
    const allowed = ["image/png", "image/jpeg", "image/jpg", "application/pdf"]
    if (!allowed.includes(file.type)) {
      alert("Formats acceptés : PNG, JPG, JPEG, PDF")
      return
    }

    setUploadingFiles(prev => ({ ...prev, [id]: true }))

    try {
      const fileRef = ref(storage, `uploads/${instagram}/${id}-${Date.now()}`)
      await uploadBytes(fileRef, file, { contentType: file.type })
      const url = await getDownloadURL(fileRef)
      setAnswers(a => ({ ...a, [id]: url }))
    } catch (error) {
      console.error(error)
      alert("Erreur lors de l'upload du fichier.")
    } finally {
      setUploadingFiles(prev => ({ ...prev, [id]: false }))
    }
  }

  const f = format ? FORMATS[format] : null
  
  const getQuestions = () => {
    if (!f) return []
    if (format === "behind_brouillon" && subformat) {
      return getBehindBrouillonQuestions(subformat as SubformatKey)
    }
    return f.questions
  }
  
  const questions = getQuestions()
  const subformatConfig = format === "behind_brouillon" && subformat ? getSubformatConfig(subformat as SubformatKey) : null

  const getAllowedDay = () => {
    if (!format) return null
    const f = FORMATS[format]
    if (!f || f.days.length === 0) return "Plusieurs jours"
    return f.days.map(day => DAY_NAMES[day]).join(", ")
  }

  const isValidDayOfWeek = () => {
    if (!date || !format) return true
    const f = FORMATS[format]
    if (!f) return true
    const [year, month, day] = date.split('-').map(Number)
    return f.days.includes(new Date(year, month - 1, day).getDay())
  }

  const areAllQuestionsAnswered = () => {
    if (questions.length === 0) return true
    return questions.every(q => {
      if (q.type === "image") return true
      if (q.type === "checkbox") return true
      if (format === "behind_brouillon") {
        if ((q.id === "cover" || q.id === "book_title") && !answers["talks_about_book"]) return true
      }
      const answer = answers[q.id]
      return answer && answer.trim().length > 0
    })
  }

  const isFormValid = instagram && format && date && isValidDayOfWeek() && areAllQuestionsAnswered() && 
    (format !== "behind_brouillon" || subformat)

  const submit = async () => {
    if (!isFormValid) return
    setIsSubmitting(true)
    try {
      await addDoc(collection(db, "submissions"), {
        instagram, format, subformat: subformat || null, date, answers, createdAt: new Date()
      })
      setSubmitted(true)
    } catch {
      alert("Une erreur est survenue. Veuillez réessayer.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const getFormatDescription = (formatKey: string) => {
    return content.formatDescriptions[formatKey as keyof typeof content.formatDescriptions] || ""
  }

  const getFormatInstructions = (formatKey: string) => {
    return content.formatInstructions[formatKey as keyof typeof content.formatInstructions] || ""
  }

  if (contentLoading) {
    return (
      <div className="min-h-screen bg-[#faf9f7] flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#b49eff] border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-600 font-medium">Chargement...</span>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#faf9f7]">
        <div className="bg-gradient-to-r from-[#b49eff] via-[#c4b3ff] to-[#b49eff] h-2" />
        <div className="flex items-center justify-center min-h-[calc(100vh-8px)] px-4 py-12">
          <div className="w-full max-w-2xl">
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
              <div className="bg-gradient-to-br from-[#b49eff] to-[#9d7ff0] px-8 py-16 text-center relative">
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute inset-0" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` }} />
                </div>
                <div className="relative">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-full mb-6 shadow-lg">
                    <CheckCircle2 className="w-10 h-10 text-[#b49eff]" strokeWidth={2} />
                  </div>
                  <h2 className="text-3xl font-serif font-bold text-white mb-3">{content.successTitle}</h2>
                  <p className="text-white/90 text-lg max-w-md mx-auto">{content.successSubtitle}</p>
                </div>
              </div>
              <div className="p-8 space-y-6">
                <div className="bg-[#f8f6ff] rounded-xl p-6 border border-[#e8e3ff]">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 bg-[#b49eff]/20 rounded-lg flex items-center justify-center">
                      <BookOpen className="w-5 h-5 text-[#8b6fdb]" strokeWidth={1.5} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">{content.successNextTitle}</h3>
                      <p className="text-gray-600 leading-relaxed text-sm">{content.successNextText}</p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => { setSubmitted(false); setInstagram(""); setFormat(""); setSubformat(""); setAnswers({}); setDate("") }}
                  className="w-full bg-[#b49eff] hover:bg-[#a38ef0] text-white py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-3 font-semibold shadow-lg shadow-[#b49eff]/25 hover:shadow-xl hover:shadow-[#b49eff]/30"
                >
                  <Feather className="w-5 h-5" strokeWidth={2} />
                  <span>{content.successNewButton}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#faf9f7]">
      <div className="bg-gradient-to-r from-[#b49eff] via-[#c4b3ff] to-[#b49eff] h-2 sticky top-0 z-50" />
      
      <header className="bg-white border-b border-gray-100 sticky top-2 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#b49eff] to-[#9d7ff0] rounded-xl flex items-center justify-center shadow-lg shadow-[#b49eff]/20">
                <Feather className="w-5 h-5 text-white" strokeWidth={1.5} />
              </div>
              <div>
                <h1 className="font-serif font-bold text-xl text-gray-900">{content.siteName}</h1>
                <p className="text-xs text-gray-500 hidden sm:block">{content.siteTagline}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Sparkles className="w-4 h-4 text-[#b49eff]" />
              <span className="hidden sm:inline">{content.headerBadge}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <div className="grid lg:grid-cols-3 gap-8 lg:gap-12">
          
          <div className="lg:col-span-2 space-y-8">
            
            {/* Intro Card */}
            <div className="bg-gradient-to-br from-[#b49eff] to-[#9d7ff0] rounded-2xl p-6 sm:p-8 text-white relative overflow-hidden shadow-xl shadow-[#b49eff]/20">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-4">
                  <BookOpen className="w-5 h-5 text-white/80" strokeWidth={1.5} />
                  <span className="text-sm font-medium text-white/80">{content.heroWelcome}</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-serif font-bold mb-3">{content.heroTitle}</h2>
                <p className="text-white/90 leading-relaxed max-w-xl">{content.heroSubtitle}</p>
              </div>
            </div>

            {/* Section 1: Instagram */}
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="border-b border-gray-100 bg-gray-50/50 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-[#b49eff] rounded-lg flex items-center justify-center text-white font-semibold text-sm shadow-md">1</div>
                  <h3 className="font-semibold text-gray-900">{content.section1Title}</h3>
                </div>
              </div>
              <div className="p-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {content.section1Label} <span className="text-[#b49eff]">{content.requiredLabel}</span>
                </label>
                <div className="relative">
                  <Instagram className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" strokeWidth={1.5} />
                  <input
                    className="w-full border border-gray-200 bg-white text-gray-900 rounded-xl pl-12 pr-4 py-3.5 focus:border-[#b49eff] focus:ring-2 focus:ring-[#b49eff]/20 focus:outline-none transition-all placeholder:text-gray-400"
                    placeholder={content.section1Placeholder}
                    value={instagram}
                    onChange={e => setInstagram(e.target.value)}
                    required
                  />
                </div>
              </div>
            </section>

            {/* Section 2: Format */}
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="border-b border-gray-100 bg-gray-50/50 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-[#b49eff] rounded-lg flex items-center justify-center text-white font-semibold text-sm shadow-md">2</div>
                  <h3 className="font-semibold text-gray-900">{content.section2Title}</h3>
                </div>
              </div>
              <div className="p-6 space-y-4">
                {Object.entries(FORMATS).map(([key, value]) => {
                  const isSelected = format === key
                  return (
                    <button
                      key={key}
                      onClick={() => { setFormat(key as FormatKey); setSubformat(""); setDate(""); setAnswers({}) }}
                      className={`w-full text-left p-5 rounded-xl border-2 transition-all duration-200 group ${isSelected ? 'border-[#b49eff] bg-[#f8f6ff] shadow-md shadow-[#b49eff]/10' : 'border-gray-100 hover:border-[#b49eff]/50 hover:bg-gray-50'}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <h4 className={`font-semibold ${isSelected ? 'text-[#8b6fdb]' : 'text-gray-900'}`}>{value.label}</h4>
                            {isSelected && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#b49eff] text-white text-xs font-medium rounded-full">
                                <Calendar className="w-3 h-3" strokeWidth={2} />
                                {getAllowedDay()}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 leading-relaxed">{getFormatDescription(key)}</p>
                        </div>
                        <div className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'border-[#b49eff] bg-[#b49eff]' : 'border-gray-300 group-hover:border-[#b49eff]/50'}`}>
                          {isSelected && <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                        </div>
                      </div>
                    </button>
                  )
                })}

                {format && FORMATS[format as FormatKey]?.subformats && (
                  <div className="mt-6 pt-6 border-t border-gray-100 space-y-4">
                    <label className="text-sm font-medium text-gray-900 block">Type de post <span className="text-[#b49eff]">{content.requiredLabel}</span></label>
                    <div className="relative">
                      <select
                        className="w-full border border-gray-200 bg-white text-gray-900 rounded-xl px-4 py-3.5 pr-10 appearance-none focus:border-[#b49eff] focus:ring-2 focus:ring-[#b49eff]/20 focus:outline-none transition-all cursor-pointer"
                        value={subformat}
                        onChange={e => { setSubformat(e.target.value as SubformatKey); setAnswers({}) }}
                      >
                        <option value="">Choisissez un type...</option>
                        {Object.entries(FORMATS[format as FormatKey].subformats!).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                        <ChevronRight className="w-5 h-5 text-gray-400 rotate-90" />
                      </div>
                    </div>
                    
                    {subformat && subformat !== "other" && subformatConfig && (
                      <div className="space-y-3">
                        <div className="bg-[#f8f6ff] border border-[#e8e3ff] rounded-xl p-4">
                          <p className="text-sm text-[#6b5b95] leading-relaxed">{subformatConfig.description}</p>
                        </div>
                        {subformatConfig.example && (
                          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                            <div className="flex items-start gap-3">
                              <Lightbulb className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                              <div>
                                <p className="text-xs font-semibold text-amber-800 mb-1">{content.exampleLabel}</p>
                                <p className="text-sm text-amber-700 leading-relaxed italic">{subformatConfig.example}</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {subformat === "other" && (
                      <div className="bg-[#f8f6ff] border border-[#e8e3ff] rounded-xl p-4">
                        <p className="text-sm text-[#6b5b95]">
                          <span className="font-semibold">Projet unique ?</span> Contacte-nous sur{" "}
                          <a href="https://instagram.com/youngflowrr" className="underline hover:text-[#b49eff] transition">@youngflowrr</a>
                          {" "}ou{" "}
                          <a href="https://instagram.com/lebrouillon.mag" className="underline hover:text-[#b49eff] transition">@lebrouillon.mag</a>
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </section>

            {/* Section 3: Questions */}
            {format === "behind_brouillon" && !subformat ? (
              <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="border-b border-gray-100 bg-gray-50/50 px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-300 rounded-lg flex items-center justify-center text-white font-semibold text-sm">3</div>
                    <h3 className="font-semibold text-gray-400">{content.section3Title}</h3>
                  </div>
                </div>
                <div className="p-8 text-center">
                  <div className="w-16 h-16 bg-[#f8f6ff] rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Lightbulb className="w-8 h-8 text-[#b49eff]" strokeWidth={1.5} />
                  </div>
                  <h4 className="font-serif text-lg font-semibold text-gray-900 mb-2">Sélectionne un type de post</h4>
                  <p className="text-gray-500 text-sm">Choisis d'abord le type de contenu que tu souhaites partager ci-dessus</p>
                </div>
              </section>
            ) : (f && questions.length > 0) && (
              <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="border-b border-gray-100 bg-gray-50/50 px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-[#b49eff] rounded-lg flex items-center justify-center text-white font-semibold text-sm shadow-md">3</div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{content.section3Title}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">{format === "behind_brouillon" && subformatConfig ? subformatConfig.description : f.consigne}</p>
                    </div>
                  </div>
                </div>
                <div className="p-6 space-y-6">
                  <div className="bg-[#f8f6ff] border border-[#e8e3ff] rounded-xl p-4">
                    <p className="text-sm text-[#6b5b95] flex items-start gap-2">
                      <FileText className="w-4 h-4 mt-0.5 flex-shrink-0" strokeWidth={1.5} />
                      <span>{getFormatInstructions(format)}</span>
                    </p>
                  </div>
                  
                  <div className="space-y-5">
                    {questions.map((q, idx) => {
                      if (format === "behind_brouillon" && (q.id === "cover" || q.id === "book_title") && !answers["talks_about_book"]) return null
                      
                      const isRequired = q.type === "image" ? false : q.type === "checkbox" ? false : format === "behind_brouillon" ? (q.id !== "cover" && q.id !== "book_title") : true
                      
                      return (
                        <div key={q.id} className="space-y-2">
                          <label className="flex items-center gap-2 text-gray-900">
                            <span className="flex-shrink-0 w-6 h-6 bg-[#f8f6ff] rounded-full flex items-center justify-center text-xs text-[#8b6fdb] font-semibold border border-[#e8e3ff]">{idx + 1}</span>
                            <span className="font-medium text-sm">
                              {q.label}
                              {isRequired && <span className="text-[#b49eff] ml-1">{content.requiredLabel}</span>}
                              {!isRequired && q.type !== "checkbox" && <span className="text-gray-400 ml-1 text-xs font-normal">{content.optionalLabel}</span>}
                            </span>
                          </label>
                          
                          {q.type === "checkbox" ? (
                            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-[#b49eff]/30 transition-colors">
                              <input type="checkbox" id={q.id} checked={!!answers[q.id]} onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.checked ? "true" : "" }))} className="w-5 h-5 rounded border-gray-300 text-[#b49eff] focus:ring-[#b49eff] focus:ring-offset-0 cursor-pointer" />
                              <label htmlFor={q.id} className="text-sm text-gray-700 cursor-pointer flex-1">{q.label}</label>
                            </div>
                          ) : q.type === "image" ? (
                            <div className="space-y-2">
                              <div className="relative">
                                <input type="file" accept=".png,.jpg,.jpeg,.pdf" onChange={e => e.target.files && uploadFile(e.target.files[0], q.id)} className="hidden" id={`file-${q.id}`} disabled={uploadingFiles[q.id]} />
                                <label htmlFor={`file-${q.id}`} className={`flex flex-col items-center justify-center gap-3 w-full border-2 border-dashed rounded-xl px-6 py-8 cursor-pointer transition-all ${answers[q.id] ? "border-emerald-300 bg-emerald-50" : "border-gray-200 bg-gray-50 hover:border-[#b49eff] hover:bg-[#f8f6ff]"}`}>
                                  {uploadingFiles[q.id] ? (
                                    <><div className="w-6 h-6 border-2 border-[#b49eff] border-t-transparent rounded-full animate-spin" /><span className="text-gray-600 font-medium">{content.uploadLoading}</span></>
                                  ) : answers[q.id] ? (
                                    <><CheckCircle2 className="w-8 h-8 text-emerald-500" strokeWidth={1.5} /><span className="text-emerald-700 font-medium">{content.uploadSuccess}</span></>
                                  ) : (
                                    <><Upload className="w-8 h-8 text-gray-400" strokeWidth={1.5} /><div className="text-center"><p className="text-gray-700 font-medium">{content.uploadText}</p><p className="text-xs text-gray-500 mt-1">{content.uploadSubtext}</p></div></>
                                  )}
                                </label>
                              </div>
                              {answers[q.id] && <a href={answers[q.id]} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-[#8b6fdb] hover:text-[#b49eff] transition"><FileText className="w-4 h-4" strokeWidth={1.5} />{content.viewFile}</a>}
                            </div>
                          ) : (
                            <textarea className="w-full border border-gray-200 bg-white rounded-xl px-4 py-3.5 focus:border-[#b49eff] focus:ring-2 focus:ring-[#b49eff]/20 focus:outline-none transition-all resize-none placeholder:text-gray-400 text-gray-900" rows={q.type === "textarea" ? 5 : 2} placeholder={q.placeholder || "Ta réponse..."} value={answers[q.id] || ""} onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))} required={isRequired} />
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </section>
            )}

            {/* Section 4: Date */}
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="border-b border-gray-100 bg-gray-50/50 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-[#b49eff] rounded-lg flex items-center justify-center text-white font-semibold text-sm shadow-md">{f ? "4" : "3"}</div>
                  <h3 className="font-semibold text-gray-900">{content.section4Title}</h3>
                </div>
              </div>
              <div className="p-6">
                {format && FORMATS[format] ? (
                  <CustomCalendar selectedDate={date} onSelectDate={setDate} allowedDays={FORMATS[format].days} format={format} />
                ) : (
                  <div className="bg-gray-50 border border-gray-100 rounded-xl p-8 text-center">
                    <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" strokeWidth={1.5} />
                    <p className="text-gray-500 font-medium">{content.section4Empty}</p>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Right Column */}
          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-28 space-y-6">
              
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-[#b49eff]/10 to-[#f8f6ff] px-6 py-4 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-900">{content.progressTitle}</h3>
                </div>
                <div className="p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${instagram ? 'bg-emerald-500' : 'bg-gray-200'}`}>
                      {instagram ? <CheckCircle2 className="w-4 h-4 text-white" /> : <span className="w-2 h-2 bg-gray-400 rounded-full" />}
                    </div>
                    <span className={`text-sm ${instagram ? 'text-gray-900' : 'text-gray-500'}`}>{content.progressSteps.instagram}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${format ? 'bg-emerald-500' : 'bg-gray-200'}`}>
                      {format ? <CheckCircle2 className="w-4 h-4 text-white" /> : <span className="w-2 h-2 bg-gray-400 rounded-full" />}
                    </div>
                    <span className={`text-sm ${format ? 'text-gray-900' : 'text-gray-500'}`}>{content.progressSteps.format}</span>
                  </div>
                  {format === "behind_brouillon" && (
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${subformat ? 'bg-emerald-500' : 'bg-gray-200'}`}>
                        {subformat ? <CheckCircle2 className="w-4 h-4 text-white" /> : <span className="w-2 h-2 bg-gray-400 rounded-full" />}
                      </div>
                      <span className={`text-sm ${subformat ? 'text-gray-900' : 'text-gray-500'}`}>{content.progressSteps.subformat}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${areAllQuestionsAnswered() && questions.length > 0 ? 'bg-emerald-500' : 'bg-gray-200'}`}>
                      {areAllQuestionsAnswered() && questions.length > 0 ? <CheckCircle2 className="w-4 h-4 text-white" /> : <span className="w-2 h-2 bg-gray-400 rounded-full" />}
                    </div>
                    <span className={`text-sm ${areAllQuestionsAnswered() && questions.length > 0 ? 'text-gray-900' : 'text-gray-500'}`}>{content.progressSteps.answers}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${date && isValidDayOfWeek() ? 'bg-emerald-500' : 'bg-gray-200'}`}>
                      {date && isValidDayOfWeek() ? <CheckCircle2 className="w-4 h-4 text-white" /> : <span className="w-2 h-2 bg-gray-400 rounded-full" />}
                    </div>
                    <span className={`text-sm ${date && isValidDayOfWeek() ? 'text-gray-900' : 'text-gray-500'}`}>{content.progressSteps.date}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={submit}
                disabled={!isFormValid || isSubmitting}
                className="w-full bg-[#b49eff] hover:bg-[#a38ef0] disabled:bg-gray-200 disabled:cursor-not-allowed text-white py-4 rounded-xl transition-all duration-200 font-semibold flex items-center justify-center gap-3 shadow-lg shadow-[#b49eff]/25 hover:shadow-xl hover:shadow-[#b49eff]/30 disabled:shadow-none"
              >
                {isSubmitting ? (
                  <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /><span>{content.submittingButton}</span></>
                ) : (
                  <><Send className="w-5 h-5" strokeWidth={2} /><span>{content.submitButton}</span></>
                )}
              </button>

              {!isFormValid && instagram && format && date && isValidDayOfWeek() && !areAllQuestionsAnswered() && (
                <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" strokeWidth={2} />
                  <p className="text-red-700 text-sm">{content.errorMessage}</p>
                </div>
              )}

              <div className="bg-[#f8f6ff] rounded-xl p-5 border border-[#e8e3ff]">
                <p className="text-sm text-[#6b5b95] text-center">
                  {content.helpText}{" "}
                  <a href="https://instagram.com/youngflowrr" target="_blank" rel="noopener noreferrer" className="font-semibold text-[#8b6fdb] hover:text-[#b49eff] transition">@youngflowrr</a>
                  {" "}ou{" "}
                  <a href="https://instagram.com/lebrouillon.mag" target="_blank" rel="noopener noreferrer" className="font-semibold text-[#8b6fdb] hover:text-[#b49eff] transition">@lebrouillon.mag</a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}