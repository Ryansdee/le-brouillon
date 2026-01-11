"use client"

import { useEffect, useState } from "react"
import { db } from "@/lib/firebase"
import { doc, getDoc, setDoc } from "firebase/firestore"
import { FORMATS } from "@/lib/formats"
import { Save, ArrowLeft, RefreshCcw, Type, AlignLeft, Image as ImageIcon, ChevronRight, Layers, Layout, Plus, Trash2, ArrowUp, ArrowDown, GripVertical } from "lucide-react"
import Link from "next/link"
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd"

export default function QuestionsSettings() {
  const [configs, setConfigs] = useState<any>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [activeFormat, setActiveFormat] = useState<string | null>(null)
  const [activeSubTab, setActiveSubTab] = useState<string>("common")

  useEffect(() => {
    const init = async () => {
      const docRef = doc(db, "settings", "formats")
      const docSnap = await getDoc(docRef)
      if (docSnap.exists()) {
        const data = docSnap.data()
        setConfigs(data)
        setActiveFormat(Object.keys(data)[0])
      } else {
        setConfigs(FORMATS)
        setActiveFormat(Object.keys(FORMATS)[0])
      }
    }
    init()
  }, [])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await setDoc(doc(db, "settings", "formats"), configs)
      alert("✅ Configuration sauvegardée dans Firebase !")
    } catch (error) {
      alert("❌ Erreur de sauvegarde")
    }
    setIsSaving(false)
  }

  if (!configs) return <div className="p-20 text-center font-bold text-[#a189f2]">Chargement...</div>

  // Helper pour récupérer les questions selon l'onglet actif
  const getQuestionsToEdit = () => {
    const current = configs[activeFormat!]
    if (activeFormat === "behind_brouillon") {
      if (activeSubTab === "common") return current.commonQuestions || []
      return current.subformatConfigs?.[activeSubTab]?.questions || []
    }
    return current.questions || []
  }

  // Helper pour mettre à jour les questions
  const updateQuestions = (newQs: any[]) => {
    const newConfigs = { ...configs }
    if (activeFormat === "behind_brouillon") {
      if (activeSubTab === "common") {
        newConfigs[activeFormat].commonQuestions = newQs
      } else {
        newConfigs[activeFormat].subformatConfigs[activeSubTab].questions = newQs
      }
    } else {
      newConfigs[activeFormat!].questions = newQs
    }
    setConfigs(newConfigs)
  }

  // Fonction pour ajouter une nouvelle question
  const addQuestion = () => {
    const newQuestion = {
      id: `question_${Date.now()}`,
      label: "Nouvelle question",
      type: "text"
    }
    const currentQuestions = getQuestionsToEdit()
    updateQuestions([...currentQuestions, newQuestion])
  }

  // Fonction pour supprimer une question
  const deleteQuestion = (idx: number) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette question ?")) return
    const currentQuestions = getQuestionsToEdit()
    const newQuestions = currentQuestions.filter((_: any, i: number) => i !== idx)
    updateQuestions(newQuestions)
  }

  // Fonction pour déplacer une question vers le haut
  const moveQuestionUp = (idx: number) => {
    if (idx === 0) return // Déjà en première position
    const currentQuestions = [...getQuestionsToEdit()]
    const temp = currentQuestions[idx]
    currentQuestions[idx] = currentQuestions[idx - 1]
    currentQuestions[idx - 1] = temp
    updateQuestions(currentQuestions)
  }

  // Fonction pour déplacer une question vers le bas
  const moveQuestionDown = (idx: number) => {
    const currentQuestions = [...getQuestionsToEdit()]
    if (idx === currentQuestions.length - 1) return // Déjà en dernière position
    const temp = currentQuestions[idx]
    currentQuestions[idx] = currentQuestions[idx + 1]
    currentQuestions[idx + 1] = temp
    updateQuestions(currentQuestions)
  }

  // Fonction pour gérer le drag and drop
  const onDragEnd = (result: any) => {
    if (!result.destination) return
    
    const currentQuestions = [...getQuestionsToEdit()]
    const [reorderedItem] = currentQuestions.splice(result.source.index, 1)
    currentQuestions.splice(result.destination.index, 0, reorderedItem)
    
    updateQuestions(currentQuestions)
  }

  return (
    <div className="min-h-screen bg-[#f8f6ff] flex flex-col lg:flex-row font-sans text-neutral-900">
      
      {/* SIDEBAR */}
      <aside className="w-full lg:w-96 bg-white border-r-2 border-[#b79ff8]/20 p-8 flex flex-col shadow-xl z-10">
        <Link href="/admin" className="flex items-center gap-3 text-[#a189f2] mb-10 font-black text-sm uppercase tracking-tighter hover:translate-x-1 transition-transform">
          <ArrowLeft className="w-5 h-5" /> Dashboard
        </Link>

        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-neutral-400 mb-6">Formats</h2>
        <div className="space-y-3 mb-10">
          {Object.keys(configs).map((key) => (
            <button
              key={key}
              onClick={() => { setActiveFormat(key); setActiveSubTab("common"); }}
              className={`w-full text-left p-5 rounded-2xl font-bold text-base transition-all flex items-center justify-between ${
                activeFormat === key ? "bg-[#a189f2] text-white shadow-lg shadow-[#a189f2]/30" : "bg-white text-neutral-600 hover:bg-[#a189f2]/5"
              }`}
            >
              {configs[key].label}
              {activeFormat === key && <ChevronRight className="w-5 h-5" />}
            </button>
          ))}
        </div>

        <button onClick={handleSave} disabled={isSaving} className="w-full bg-[#a189f2] text-white py-5 rounded-2xl font-black text-sm uppercase shadow-xl disabled:opacity-50 hover:bg-[#8a71d6] transition-colors">
          {isSaving ? "Sauvegarde..." : "Enregistrer tout"}
        </button>
      </aside>

      {/* ZONE D'ÉDITION */}
      <main className="flex-1 p-8 lg:p-20 overflow-y-auto bg-white">
        {activeFormat && (
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-5xl font-serif font-bold text-neutral-900 italic">{configs[activeFormat].label}</h1>
              <div className="text-xs font-black uppercase tracking-widest text-neutral-400 bg-neutral-50 px-4 py-2 rounded-full">
                {getQuestionsToEdit().length} question{getQuestionsToEdit().length > 1 ? 's' : ''}
              </div>
            </div>

            {/* SYSTÈME D'ONGLETS POUR LES SOUS-FORMATS */}
            {configs[activeFormat].subformatConfigs && (
              <div className="flex flex-wrap gap-2 mb-10 p-2 bg-[#fcfaff] rounded-3xl border-2 border-[#b79ff8]/10">
                <button 
                  onClick={() => setActiveSubTab("common")}
                  className={`px-6 py-3 rounded-2xl text-sm font-black transition-all ${activeSubTab === "common" ? "bg-white text-[#a189f2] shadow-sm" : "text-neutral-400"}`}
                >
                  QUESTIONS COMMUNES
                </button>
                {Object.keys(configs[activeFormat].subformatConfigs).map(subKey => (
                  <button 
                    key={subKey}
                    onClick={() => setActiveSubTab(subKey)}
                    className={`px-6 py-3 rounded-2xl text-sm font-black transition-all uppercase ${activeSubTab === subKey ? "bg-white text-[#a189f2] shadow-sm" : "text-neutral-400"}`}
                  >
                    {subKey}
                  </button>
                ))}
              </div>
            )}

            <div className="space-y-10">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-neutral-800 flex items-center gap-3">
                  <Layout className="text-[#a189f2]" /> 
                  {activeSubTab === "common" ? "Questions partagées par tous" : `Questions spécifiques : ${activeSubTab}`}
                </h3>
                
                {/* BOUTON AJOUTER QUESTION */}
                <button 
                  onClick={addQuestion}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#b79ff8] to-[#a189f2] text-white rounded-2xl font-bold text-sm hover:shadow-lg hover:shadow-[#b79ff8]/30 transition-all"
                >
                  <Plus className="w-5 h-5" />
                  Ajouter une question
                </button>
              </div>

              {getQuestionsToEdit().length === 0 ? (
                <div className="bg-neutral-50 border-2 border-dashed border-neutral-200 rounded-3xl p-20 text-center">
                  <Layout className="w-16 h-16 text-neutral-300 mx-auto mb-6" />
                  <h3 className="text-xl font-bold text-neutral-400 mb-3">Aucune question</h3>
                  <p className="text-neutral-400 mb-8">Commencez par ajouter votre première question</p>
                  <button 
                    onClick={addQuestion}
                    className="flex items-center gap-2 px-6 py-3 bg-[#a189f2] text-white rounded-2xl font-bold text-sm mx-auto hover:bg-[#8a71d6] transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                    Ajouter une question
                  </button>
                </div>
              ) : (
                <DragDropContext onDragEnd={onDragEnd}>
                  <Droppable droppableId="questions">
                    {(provided) => (
                      <div 
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className="grid gap-6"
                      >
                        {getQuestionsToEdit().map((q: any, idx: number) => (
                          <Draggable key={q.id} draggableId={q.id} index={idx}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={`bg-[#fcfaff] p-8 rounded-[2.5rem] border-2 transition-all group ${
                                  snapshot.isDragging 
                                    ? 'border-[#a189f2] shadow-2xl shadow-[#a189f2]/30 rotate-2 scale-105' 
                                    : 'border-transparent hover:border-[#b79ff8]/30'
                                }`}
                              >
                                <div className="space-y-6">
                                  <div className="flex items-start gap-4">
                                    {/* CONTRÔLES DE DÉPLACEMENT */}
                                    <div className="flex flex-col gap-2 pt-8">
                                      <button
                                        onClick={() => moveQuestionUp(idx)}
                                        disabled={idx === 0}
                                        className={`p-2 rounded-lg transition-all ${
                                          idx === 0 
                                            ? 'text-neutral-200 cursor-not-allowed' 
                                            : 'text-[#b79ff8] hover:bg-[#b79ff8]/10 hover:text-[#a189f2]'
                                        }`}
                                        title="Déplacer vers le haut"
                                      >
                                        <ArrowUp className="w-5 h-5" />
                                      </button>
                                      <div 
                                        {...provided.dragHandleProps}
                                        className="text-center cursor-grab active:cursor-grabbing p-2 hover:bg-[#b79ff8]/10 rounded-lg transition-all"
                                        title="Glisser pour réorganiser"
                                      >
                                        <GripVertical className="w-5 h-5 text-[#a189f2] mx-auto" />
                                      </div>
                                      <button
                                        onClick={() => moveQuestionDown(idx)}
                                        disabled={idx === getQuestionsToEdit().length - 1}
                                        className={`p-2 rounded-lg transition-all ${
                                          idx === getQuestionsToEdit().length - 1
                                            ? 'text-neutral-200 cursor-not-allowed' 
                                            : 'text-[#b79ff8] hover:bg-[#b79ff8]/10 hover:text-[#a189f2]'
                                        }`}
                                        title="Déplacer vers le bas"
                                      >
                                        <ArrowDown className="w-5 h-5" />
                                      </button>
                                    </div>

                                    <div className="flex-1">
                                      <label className="text-[10px] font-black uppercase text-neutral-400 mb-2 block">Question {idx + 1}</label>
                                      <input 
                                        type="text" 
                                        value={q.label}
                                        onChange={(e) => {
                                          const newQs = [...getQuestionsToEdit()]
                                          newQs[idx].label = e.target.value
                                          updateQuestions(newQs)
                                        }}
                                        className="w-full bg-white border-2 border-neutral-100 rounded-xl px-6 py-4 text-lg font-bold text-neutral-900 outline-none focus:border-[#a189f2] transition-colors"
                                        placeholder="Posez votre question..."
                                      />
                                    </div>
                                    
                                    {/* BOUTON SUPPRIMER */}
                                    <button
                                      onClick={() => deleteQuestion(idx)}
                                      className="p-3 rounded-xl text-neutral-300 hover:bg-red-50 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100 mt-8"
                                      title="Supprimer cette question"
                                    >
                                      <Trash2 className="w-5 h-5" />
                                    </button>
                                  </div>

                                  <div>
                                    <label className="text-[10px] font-black uppercase text-neutral-400 mb-3 block">Type de réponse</label>
                                    <div className="flex gap-3">
                                      {[
                                        { value: 'text', label: 'Texte court', icon: Type },
                                        { value: 'textarea', label: 'Texte long', icon: AlignLeft },
                                        { value: 'image', label: 'Image', icon: ImageIcon }
                                      ].map(({ value, label, icon: Icon }) => (
                                        <button 
                                          key={value}
                                          onClick={() => {
                                            const newQs = [...getQuestionsToEdit()]
                                            newQs[idx].type = value
                                            updateQuestions(newQs)
                                          }}
                                          className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-black uppercase transition-all ${
                                            q.type === value 
                                              ? 'bg-neutral-900 text-white shadow-md' 
                                              : 'bg-white text-neutral-400 border-2 border-neutral-200 hover:border-neutral-300'
                                          }`}
                                        >
                                          <Icon className="w-4 h-4" />
                                          {label}
                                        </button>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Info sur le type */}
                                  <div className="flex items-start gap-3 p-4 bg-white rounded-xl border border-neutral-100">
                                    <div className="w-2 h-2 bg-[#a189f2] rounded-full mt-1.5"></div>
                                    <p className="text-xs text-neutral-500 leading-relaxed">
                                      {q.type === 'text' && "Champ de texte court, idéal pour les réponses courtes (nom, titre, etc.)"}
                                      {q.type === 'textarea' && "Zone de texte étendue, parfaite pour les descriptions détaillées"}
                                      {q.type === 'image' && "Upload d'image, l'utilisateur pourra télécharger une photo ou un visuel"}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              )}
            </div>
            <div className="h-40"></div>
          </div>
        )}
      </main>
    </div>
  )
}