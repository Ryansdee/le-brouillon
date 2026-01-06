"use client"

import { useEffect, useState } from "react"
import { db } from "@/lib/firebase"
import { doc, getDoc, setDoc } from "firebase/firestore"
import { FORMATS } from "@/lib/formats"
import { Save, ArrowLeft, RefreshCcw, Type, AlignLeft, Image as ImageIcon, ChevronRight, Layers, Layout } from "lucide-react"
import Link from "next/link"

export default function QuestionsSettings() {
  const [configs, setConfigs] = useState<any>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [activeFormat, setActiveFormat] = useState<string | null>(null)
  // État pour gérer le sous-format sélectionné (ex: 'conseils' dans 'behind_brouillon')
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

        <button onClick={handleSave} disabled={isSaving} className="w-full bg-[#a189f2] text-white py-5 rounded-2xl font-black text-sm uppercase shadow-xl disabled:opacity-50">
          {isSaving ? "Sauvegarde..." : "Enregistrer tout"}
        </button>
      </aside>

      {/* ZONE D'ÉDITION */}
      <main className="flex-1 p-8 lg:p-20 overflow-y-auto bg-white">
        {activeFormat && (
          <div className="max-w-4xl mx-auto">
            <h1 className="text-5xl font-serif font-bold text-neutral-900 mb-8 italic">{configs[activeFormat].label}</h1>

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
              <h3 className="text-xl font-bold text-neutral-800 flex items-center gap-3">
                <Layout className="text-[#a189f2]" /> 
                {activeSubTab === "common" ? "Questions partagées par tous" : `Questions spécifiques : ${activeSubTab}`}
              </h3>

              <div className="grid gap-6">
                {getQuestionsToEdit().map((q: any, idx: number) => (
                  <div key={q.id} className="bg-[#fcfaff] p-8 rounded-[2.5rem] border-2 border-transparent hover:border-[#b79ff8]/30 transition-all">
                    <div className="space-y-6">
                      <div>
                        <label className="text-[10px] font-black uppercase text-neutral-400 mb-2 block">Question {idx + 1}</label>
                        <input 
                          type="text" 
                          value={q.label}
                          onChange={(e) => {
                            const newQs = [...getQuestionsToEdit()]
                            newQs[idx].label = e.target.value
                            updateQuestions(newQs)
                          }}
                          className="w-full bg-white border-2 border-neutral-100 rounded-xl px-6 py-4 text-lg font-bold text-neutral-900 outline-none focus:border-[#a189f2]"
                        />
                      </div>

                      <div className="flex gap-3">
                        {['text', 'textarea', 'image'].map(type => (
                          <button 
                            key={type}
                            onClick={() => {
                              const newQs = [...getQuestionsToEdit()]
                              newQs[idx].type = type
                              updateQuestions(newQs)
                            }}
                            className={`px-5 py-2 rounded-xl text-xs font-black uppercase ${q.type === type ? 'bg-neutral-900 text-white' : 'bg-white text-neutral-400 border border-neutral-200'}`}
                          >
                            {type}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="h-40"></div>
          </div>
        )}
      </main>
    </div>
  )
}