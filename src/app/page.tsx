"use client"

import { useState } from "react"
import { FORMATS, getBehindBrouillonQuestions, getSubformatConfig } from "@/lib/formats"
import { FormatKey, SubformatKey } from "@/types/form"
import { db, storage } from "@/lib/firebase"
import { collection, addDoc } from "firebase/firestore"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { CheckCircle2, FileText, Send, AlertCircle, Instagram, Upload, Feather, BookOpen, Sparkles, Calendar, Lightbulb } from "lucide-react"
import CustomCalendar from "@/components/CustomCalendar"

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
      await uploadBytes(fileRef, file, {
        contentType: file.type,
      })

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
  
  // Get questions dynamically for Behind the Brouillon based on subformat
  const getQuestions = () => {
    if (!f) return []
    
    // For Behind the Brouillon, get questions based on selected subformat
    if (format === "behind_brouillon" && subformat) {
      return getBehindBrouillonQuestions(subformat as SubformatKey)
    }
    
    // For other formats, use regular questions
    return f.questions
  }
  
  const questions = getQuestions()
  const subformatConfig = format === "behind_brouillon" && subformat ? getSubformatConfig(subformat as SubformatKey) : null

  const getAllowedDay = () => {
    if (!format) return null
    const f = FORMATS[format]
    if (!f || f.days.length === 0) return "Plusieurs jours"
    
    const dayNames = f.days.map(day => DAY_NAMES[day])
    return dayNames.join(", ")
  }

  const isValidDayOfWeek = () => {
    if (!date || !format) return true
    const f = FORMATS[format]
    if (!f) return true
    
    // Parse date more safely to avoid timezone issues
    const [year, month, day] = date.split('-').map(Number)
    const selected = new Date(year, month - 1, day).getDay()
    
    return f.days.includes(selected)
  }

  const areAllQuestionsAnswered = () => {
    if (questions.length === 0) return true
    
    return questions.every(q => {
      // Image fields are now optional
      if (q.type === "image") return true
      
      // Checkboxes are always valid
      if (q.type === "checkbox") return true
      
      // For Behind the Brouillon, cover and book_title are optional if talks_about_book is unchecked
      if (format === "behind_brouillon") {
        if ((q.id === "cover" || q.id === "book_title") && !answers["talks_about_book"]) {
          return true // These fields are not required when not talking about a book
        }
      }
      
      const answer = answers[q.id]
      if (!answer) return false
      return answer.trim().length > 0 // Text fields need non-empty content
    })
  }

  const isFormValid = instagram && format && date && isValidDayOfWeek() && areAllQuestionsAnswered() && 
    // For Behind the Brouillon, also require subformat selection
    (format !== "behind_brouillon" || subformat)

  const submit = async () => {
    if (!isFormValid) return

    setIsSubmitting(true)
    try {
      // Add submission
      await addDoc(collection(db, "submissions"), {
        instagram,
        format,
        subformat: subformat || null,
        date,
        answers,
        createdAt: new Date(),
      })
      
      setSubmitted(true)
    } catch {
      alert("Une erreur est survenue. Veuillez réessayer.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#faf9f7] flex items-center justify-center px-4 py-8">
        <div className="max-w-2xl w-full">
          {/* Success Card */}
          <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
            {/* Header with book pattern */}
            <div className="bg-gradient-to-br from-neutral-800 to-neutral-900 px-6 sm:px-8 py-10 sm:py-12 text-center relative overflow-hidden">
              <div className="absolute inset-0 opacity-5">
                <div className="absolute inset-0" style={{
                  backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 35px, rgba(255,255,255,0.1) 35px, rgba(255,255,255,0.1) 36px)`,
                }} />
              </div>
              
              <div className="relative">
                <div className="inline-flex items-center justify-center w-16 sm:w-20 h-16 sm:h-20 bg-emerald-500 rounded-full mb-4 sm:mb-6">
                  <CheckCircle2 className="w-8 sm:w-10 h-8 sm:h-10 text-white" strokeWidth={2} />
                </div>
                
                <h2 className="text-2xl sm:text-3xl font-serif font-bold text-white mb-2 sm:mb-3">
                  Soumission reçue avec succès
                </h2>
                <p className="text-neutral-300 text-base sm:text-lg max-w-md mx-auto leading-relaxed">
                  Merci d'avoir partagé votre plume avec nous
                </p>
              </div>
            </div>

            {/* Content */}
            <div className="px-6 sm:px-8 py-8 sm:py-10 space-y-6">
              <div className="bg-neutral-50 rounded-lg p-4 sm:p-6 border border-neutral-200">
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="flex-shrink-0">
                    <BookOpen className="w-5 sm:w-6 h-5 sm:h-6 text-neutral-600" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-neutral-900 mb-2 text-sm sm:text-base">Prochaines étapes</h3>
                    <p className="text-neutral-600 leading-relaxed text-xs sm:text-sm">
                      Notre équipe éditoriale examinera votre soumission avec attention. 
                      Vous serez contacté sur Instagram dans les prochains jours.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4 sm:pt-6 border-t border-neutral-200">
                <button
                  onClick={() => {
                    setSubmitted(false)
                    setInstagram("")
                    setFormat("")
                    setSubformat("")
                    setAnswers({})
                    setDate("")
                  }}
                  className="group w-full bg-neutral-900 hover:bg-neutral-800 text-white py-3 sm:py-3.5 px-6 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 font-medium text-sm sm:text-base"
                >
                  <Feather className="w-4 h-4 group-hover:rotate-12 transition-transform" strokeWidth={2} />
                  <span>Nouvelle soumission</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#faf9f7] flex flex-col">
      {/* Mobile Header */}
      <div className="lg:hidden bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 text-white p-4 flex items-center justify-between sticky top-0 z-20 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center backdrop-blur-sm border border-white/20">
            <Feather className="w-5 h-5" strokeWidth={1.5} />
          </div>
          <div>
            <span className="font-serif font-bold text-lg">Le Brouillon</span>
            <p className="text-neutral-400 text-xs">Formulaire de soumission</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12">
          {/* Header */}
          <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden mb-6">
            <div className="bg-gradient-to-br from-neutral-800 to-neutral-900 px-6 sm:px-8 lg:px-12 py-8 sm:py-10 lg:py-14 relative overflow-hidden">
              {/* Subtle book lines pattern */}
              <div className="absolute inset-0 opacity-5">
                <div className="absolute inset-0" style={{
                  backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 35px, rgba(255,255,255,0.1) 35px, rgba(255,255,255,0.1) 36px)`,
                }} />
              </div>
              
              <div className="relative">
                <div className="flex items-center gap-3 mb-4 sm:mb-6">
                  <div className="w-10 sm:w-12 h-10 sm:h-12 bg-white/10 rounded-lg flex items-center justify-center backdrop-blur-sm border border-white/20">
                    <Feather className="w-5 sm:w-6 h-5 sm:h-6 text-white" strokeWidth={1.5} />
                  </div>
                  <BookOpen className="w-5 sm:w-6 h-5 sm:h-6 text-white/40" strokeWidth={1.5} />
                </div>
                
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-bold text-white mb-3 sm:mb-4">
                  Formulaire de soumission
                </h1>
                <p className="text-neutral-300 text-sm sm:text-base lg:text-lg max-w-2xl leading-relaxed">
                  Partagez votre création littéraire avec notre équipe éditoriale. 
                  Remplissez le formulaire ci-dessous pour soumettre votre contenu.
                </p>
              </div>
            </div>
          </div>

          {/* Form Container */}
          <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
            <div className="p-4 sm:p-6 lg:p-10 space-y-6 sm:space-y-8">
              {/* Step 1: Identity */}
              <section className="space-y-3 sm:space-y-4">
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="flex-shrink-0 w-8 sm:w-10 h-8 sm:h-10 bg-neutral-900 rounded-lg flex items-center justify-center text-white font-serif shadow-sm text-sm sm:text-base">
                    1
                  </div>
                  <div className="flex-1">
                    <h2 className="text-lg sm:text-xl font-serif font-semibold text-neutral-900 mb-1">
                      Votre identité
                    </h2>
                    <p className="text-neutral-600 text-xs sm:text-sm">
                      Quel est votre pseudo Instagram ?
                    </p>
                  </div>
                </div>
                
                <div className="pl-0 sm:pl-14">
                  <div className="relative group">
                    <Instagram className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 sm:w-5 h-4 sm:h-5 text-neutral-400 group-focus-within:text-neutral-900 transition-colors" strokeWidth={1.5} />
                    <input
                      className="w-full border border-neutral-300 bg-white text-neutral-900 rounded-lg pl-10 sm:pl-12 pr-3 sm:pr-4 py-2.5 sm:py-3 focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10 focus:outline-none transition-all placeholder:text-neutral-400 text-sm sm:text-base"
                      placeholder="@votre_instagram"
                      value={instagram}
                      onChange={e => setInstagram(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </section>

              {/* Step 2: Format */}
              <section className="space-y-3 sm:space-y-4">
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="flex-shrink-0 w-8 sm:w-10 h-8 sm:h-10 bg-neutral-900 rounded-lg flex items-center justify-center text-white font-serif shadow-sm text-sm sm:text-base">
                    2
                  </div>
                  <div className="flex-1">
                    <h2 className="text-lg sm:text-xl font-serif font-semibold text-neutral-900 mb-1">
                      Choix du format
                    </h2>
                    <p className="text-neutral-600 text-xs sm:text-sm mb-4 sm:mb-6">
                      Sélectionnez le format qui correspond le mieux à votre contenu
                    </p>
                    
                    <div className="space-y-2 sm:space-y-3">
                  {Object.entries(FORMATS).map(([key, value]) => {
                    const isSelected = format === key;
                    
                    const getDescription = (formatKey: string) => {
                      switch(formatKey) {
                        case 'meet_author':
                          return "Réponds à des questions et participe à une interview pour présenter ton univers, ton parcours et ton rapport à l'écriture.";
                        case 'story_week':
                          return "Partage ton roman à travers une présentation esthétique créée par Laure (youngflowrr), mêlant ambiance visuelle et extraits choisis.";
                        case 'behind_brouillon':
                          return "Montre les coulisses de ton écriture : brouillons, conseils, réflexions, doutes et confidences d'auteur.";
                        case 'other':
                          return "Tu as une autre idée de format ? Propose-la nous en message privé !";
                        default:
                          return "";
                      }
                    };
                    
                    return (
                      <button
                        key={key}
                        onClick={() => {
                          setFormat(key as FormatKey);
                          setSubformat("");
                          setDate("");
                        }}
                        className={`w-full text-left p-4 sm:p-5 rounded-lg border transition-all duration-200 group ${
                          isSelected 
                            ? 'border-neutral-900 bg-neutral-50 shadow-sm ring-1 ring-neutral-900' 
                            : 'border-neutral-200 hover:border-neutral-400 hover:bg-neutral-50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3 sm:gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                              <h3 className={`font-semibold text-sm sm:text-base ${
                                isSelected ? 'text-neutral-900' : 'text-neutral-700 group-hover:text-neutral-900'
                              }`}>
                                {value.label}
                              </h3>
                              {isSelected && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-neutral-900 text-white text-xs font-medium rounded-full whitespace-nowrap w-fit">
                                  <Calendar className="w-3 h-3" strokeWidth={2} />
                                  <span className="hidden sm:inline">{getAllowedDay()}</span>
                                  <span className="sm:hidden">{f?.days.length === 1 ? DAY_NAMES[f.days[0]] : `${f?.days.length} jours`}</span>
                                </span>
                              )}
                            </div>
                            <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
                              {getDescription(key)}
                            </p>
                          </div>
                          <div className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all mt-0.5 sm:mt-1 ${
                            isSelected 
                              ? 'border-neutral-900 bg-neutral-900' 
                              : 'border-neutral-300 group-hover:border-neutral-500'
                          }`}>
                            {isSelected && (
                              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {format && FORMATS[format as FormatKey]?.subformats && (
                  <div className="mt-5 space-y-3 pl-0">
                    <label className="text-sm font-medium text-neutral-900 block">
                      Type de post :
                    </label>
                    <div className="relative">
                      <select
                        className="w-full border border-neutral-300 bg-white text-neutral-900 rounded-lg px-4 py-3 pr-10 appearance-none focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10 focus:outline-none transition-all cursor-pointer"
                        value={subformat}
                        onChange={e => {
                          setSubformat(e.target.value as SubformatKey)
                          setAnswers({})
                        }}
                      >
                        <option value="">Choisissez un sous-format</option>
                        {Object.entries(FORMATS[format as FormatKey].subformats!).map(([k, v]) => (
                          <option key={k} value={k}>{v}</option>
                        ))}
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        <svg className="w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                    
                    {subformat && subformat !== "other" && subformatConfig && (
                      <div className="space-y-2">
                        <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4">
                          <p className="text-sm text-neutral-700 leading-relaxed">
                            {subformatConfig.description}
                          </p>
                        </div>
                        {format === "behind_brouillon" && subformatConfig.example && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                              <Lightbulb className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                              <div>
                                <p className="text-xs font-semibold text-blue-900 mb-1.5">Exemple d'angle :</p>
                                <p className="text-sm text-blue-800 leading-relaxed italic">
                                  {subformatConfig.example}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {subformat === "other" && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p className="text-sm text-blue-900">
                          <span className="font-semibold">Projet unique ?</span> Contactez-nous sur{" "}
                          <a href="https://instagram.com/youngflowrr" className="underline hover:text-blue-700 transition">@youngflowrr</a>
                          {" "}ou{" "}
                          <a href="https://instagram.com/lebrouillon.mag" className="underline hover:text-blue-700 transition">@lebrouillon.mag</a>
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Step 3: Questions */}
          {format === "behind_brouillon" && !subformat && (
            <section className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-neutral-900 rounded-lg flex items-center justify-center text-white font-serif shadow-sm">
                  3
                </div>
                <div className="flex-1">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
                    <Lightbulb className="w-10 h-10 text-blue-600 mx-auto mb-3" strokeWidth={1.5} />
                    <h3 className="font-serif text-lg font-semibold text-blue-900 mb-2">
                      Sélectionnez un type de post
                    </h3>
                    <p className="text-blue-700 text-sm">
                      Choisissez d'abord le type de contenu que vous souhaitez partager ci-dessus
                    </p>
                  </div>
                </div>
              </div>
            </section>
          )}
          
          {(f && questions.length > 0) && (
            <section className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-neutral-900 rounded-lg flex items-center justify-center text-white font-serif shadow-sm">
                  3
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-serif font-semibold text-neutral-900 mb-1">
                    Vos réponses
                  </h2>
                  <p className="text-neutral-600 text-sm mb-4">
                    {format === "behind_brouillon" && subformatConfig 
                      ? subformatConfig.description 
                      : f.consigne}
                  </p>
                  
                  <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4 mb-6">
                    {format === "meet_author" && (
                      <p className="text-sm text-neutral-700 flex items-start gap-2">
                        <FileText className="w-4 h-4 text-neutral-600 mt-0.5 flex-shrink-0" strokeWidth={1.5} />
                        <span>
                          <strong className="font-semibold">Requis :</strong> une photo de vous (ou qui vous représente), 
                          ainsi que la photo de la couverture de votre roman. Les images peuvent être téléchargées 
                          directement dans ce formulaire ou envoyées par message privé sur Instagram (
                          <a href="https://instagram.com/youngflowrr" target="_blank" rel="noopener noreferrer" className="underline hover:text-neutral-900">@youngflowrr</a> / 
                          <a href="https://instagram.com/lebrouillon.mag" target="_blank" rel="noopener noreferrer" className="underline hover:text-neutral-900">@lebrouillon.mag</a>).
                        </span>
                      </p>
                    )}
                    {format === "story_week" && (
                      <p className="text-sm text-neutral-700 flex items-start gap-2">
                        <FileText className="w-4 h-4 text-neutral-600 mt-0.5 flex-shrink-0" strokeWidth={1.5} />
                        <span><strong className="font-semibold">Photo requise :</strong> la couverture de votre roman</span>
                      </p>
                    )}
                    {format === "behind_brouillon" && (
                      <p className="text-sm text-neutral-700 flex items-start gap-2">
                        <FileText className="w-4 h-4 text-neutral-600 mt-0.5 flex-shrink-0" strokeWidth={1.5} />
                        <span>Les questions s'adaptent selon le type de post que vous avez choisi</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="pl-0 sm:pl-14 space-y-4 sm:space-y-5">
                {questions.map((q, idx) => {
                  if (format === "behind_brouillon" && (q.id === "cover" || q.id === "book_title") && !answers["talks_about_book"]) {
                    return null
                  }
                  
                  const isRequired = q.type === "image" 
                    ? false
                    : format === "behind_brouillon" 
                      ? (q.id !== "cover" && q.id !== "book_title") 
                      : true
                  
                  return (
                    <div key={q.id} className="space-y-2 sm:space-y-3">
                      <label className="flex items-center gap-2 sm:gap-2.5 text-neutral-900">
                        <span className="flex-shrink-0 w-6 sm:w-7 h-6 sm:h-7 bg-neutral-100 rounded-full flex items-center justify-center text-xs sm:text-sm text-neutral-700 font-medium border border-neutral-200">
                          {idx + 1}
                        </span>
                        <span className="font-medium text-xs sm:text-sm">
                          {q.label}
                          {isRequired && <span className="text-red-500 ml-1">*</span>}
                          {!isRequired && <span className="text-neutral-400 ml-1 text-xs font-normal">(optionnel)</span>}
                        </span>
                      </label>
                      
                      {q.type === "checkbox" ? (
                        <div className="flex items-center gap-3 p-3 sm:p-4 bg-neutral-50 rounded-lg border border-neutral-200">
                          <input
                            type="checkbox"
                            id={q.id}
                            checked={!!answers[q.id]}
                            onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.checked ? "true" : "" }))}
                            className="w-4 h-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900 focus:ring-offset-0 cursor-pointer"
                          />
                          <label htmlFor={q.id} className="text-xs sm:text-sm text-neutral-700 cursor-pointer flex-1">
                            {q.label}
                          </label>
                        </div>
                      ) : q.type === "image" ? (
                        <div className="space-y-2 sm:space-y-3">
                          <div className="relative">
                            <input
                              type="file"
                              accept=".png,.jpg,.jpeg,.pdf"
                              onChange={e => e.target.files && uploadFile(e.target.files[0], q.id)}
                              className="hidden"
                              id={`file-${q.id}`}
                              disabled={uploadingFiles[q.id]}
                            />
                            <label
                              htmlFor={`file-${q.id}`}
                              className={`flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 w-full border-2 border-dashed rounded-lg px-4 sm:px-6 py-6 sm:py-8 cursor-pointer transition-all ${
                                answers[q.id]
                                  ? "border-emerald-300 bg-emerald-50"
                                  : "border-neutral-300 bg-white hover:border-neutral-900 hover:bg-neutral-50"
                              }`}
                            >
                              {uploadingFiles[q.id] ? (
                                <>
                                  <div className="w-5 h-5 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin" />
                                  <span className="text-neutral-600 font-medium text-sm sm:text-base">Envoi en cours...</span>
                                </>
                              ) : answers[q.id] ? (
                                <>
                                  <CheckCircle2 className="w-5 sm:w-6 h-5 sm:h-6 text-emerald-600" strokeWidth={2} />
                                  <span className="text-emerald-700 font-medium text-sm sm:text-base">Fichier téléchargé</span>
                                </>
                              ) : (
                                <>
                                  <Upload className="w-5 sm:w-6 h-5 sm:h-6 text-neutral-400" strokeWidth={1.5} />
                                  <div className="text-center">
                                    <p className="text-neutral-700 font-medium text-sm sm:text-base">Cliquez pour importer</p>
                                    <p className="text-xs text-neutral-500 mt-1">PNG, JPG, JPEG ou PDF</p>
                                  </div>
                                </>
                              )}
                            </label>
                          </div>
                          {answers[q.id] && (
                            <a
                              href={answers[q.id]}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 text-xs sm:text-sm text-neutral-600 hover:text-neutral-900 underline transition"
                            >
                              <FileText className="w-3 sm:w-4 h-3 sm:h-4" strokeWidth={1.5} />
                              Voir le fichier
                            </a>
                          )}
                        </div>
                      ) : (
                        <textarea
                          className="w-full border border-neutral-300 bg-white rounded-lg px-3 sm:px-4 py-2.5 sm:py-3 focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10 focus:outline-none transition-all resize-none placeholder:text-neutral-400 text-neutral-900 text-sm sm:text-base"
                          rows={q.type === "textarea" ? 5 : 2}
                          placeholder={q.placeholder || "Votre réponse..."}
                          value={answers[q.id] || ""}
                          onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))}
                          required={isRequired}
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* Step 4: Date */}
          <section className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-neutral-900 rounded-lg flex items-center justify-center text-white font-serif shadow-sm">
                {f ? "4" : "3"}
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-serif font-semibold text-neutral-900 mb-1">
                  Date de publication
                </h2>
                <p className="text-neutral-600 text-sm">
                  Quand souhaitez-vous publier votre création ?
                </p>
              </div>
            </div>
            
            <div className="pl-14">
              {format && FORMATS[format] ? (
                <CustomCalendar
                  selectedDate={date}
                  onSelectDate={setDate}
                  allowedDays={FORMATS[format].days}
                  format={format}
                />
              ) : (
                <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-8 text-center">
                  <Calendar className="w-10 h-10 text-neutral-400 mx-auto mb-3" strokeWidth={1.5} />
                  <p className="text-neutral-700 font-medium">
                    Sélectionnez d'abord un format pour voir les dates disponibles
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Submit Button */}
          <div className="pl-14 pt-6 space-y-4">
            {/* Validation checklist */}
            {!isFormValid && (instagram || format || date) && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm font-semibold text-blue-900 mb-3">Pour soumettre votre création :</p>
                <div className="space-y-2 text-sm text-blue-800">
                  <div className="flex items-center gap-2">
                    <span className={instagram ? "text-green-600" : "text-blue-600"}>
                      {instagram ? "✓" : "○"}
                    </span>
                    <span>Renseigner votre pseudo Instagram</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={format ? "text-green-600" : "text-blue-600"}>
                      {format ? "✓" : "○"}
                    </span>
                    <span>Choisir un format</span>
                  </div>
                  {format === "behind_brouillon" && (
                    <div className="flex items-center gap-2">
                      <span className={subformat ? "text-green-600" : "text-blue-600"}>
                        {subformat ? "✓" : "○"}
                      </span>
                      <span>Sélectionner un type de post</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className={date ? "text-green-600" : "text-blue-600"}>
                      {date ? "✓" : "○"}
                    </span>
                    <span>Choisir une date</span>
                  </div>
                  {date && (
                    <div className="flex items-center gap-2">
                      <span className={isValidDayOfWeek() ? "text-green-600" : "text-red-600"}>
                        {isValidDayOfWeek() ? "✓" : "✗"}
                      </span>
                      <span>Date valide pour ce format</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className={areAllQuestionsAnswered() ? "text-green-600" : "text-blue-600"}>
                      {areAllQuestionsAnswered() ? "✓" : "○"}
                    </span>
                    <span>Répondre aux questions obligatoires</span>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={submit}
              disabled={!isFormValid || isSubmitting}
              className="group w-full bg-neutral-900 hover:bg-neutral-800 text-white py-4 rounded-lg transition-all duration-200 disabled:bg-neutral-300 disabled:cursor-not-allowed font-semibold text-base flex items-center justify-center gap-3 shadow-sm hover:shadow-md disabled:shadow-none"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Envoi en cours...</span>
                </>
              ) : (
                <>
                  <Send className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" strokeWidth={2} />
                  <span>Soumettre votre création</span>
                </>
              )}
            </button>
            
            {/* Error message */}
            {!isFormValid && instagram && format && date && isValidDayOfWeek() && !areAllQuestionsAnswered() && (
              <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg p-4">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" strokeWidth={2} />
                <p className="text-red-900 text-sm leading-relaxed">
                  Veuillez remplir toutes les questions obligatoires avant de soumettre.
                </p>
              </div>
            )}
          </div>

          {/* Help text */}
          <div className="pl-14 pt-6 border-t border-neutral-200 mt-6">
            <p className="text-center text-sm text-neutral-600">
              Des questions ? Contactez-nous sur{" "}
              <a
                href="https://instagram.com/youngflowrr"
                target="_blank"
                rel="noopener noreferrer"
                className="text-neutral-900 font-semibold hover:underline transition"
              >
                @youngflowrr
              </a>
              {" "}ou{" "}
              <a
                href="https://instagram.com/lebrouillon.mag"
                target="_blank"
                rel="noopener noreferrer"
                className="text-neutral-900 font-semibold hover:underline transition"
              >
                @lebrouillon.mag
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
  )
}