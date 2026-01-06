"use client"

import { useState, useEffect } from "react"
import { db } from "@/lib/firebase"
import { doc, onSnapshot } from "firebase/firestore"
import { defaultContent, SiteContent } from "@/lib/site-content"

export function useSiteContent() {
  const [content, setContent] = useState<SiteContent>(defaultContent)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const docRef = doc(db, "settings", "site-content")
    
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as Partial<SiteContent>
        setContent({ ...defaultContent, ...data })
      } else {
        setContent(defaultContent)
      }
      setIsLoading(false)
    }, (error) => {
      console.error("Erreur lors du chargement du contenu:", error)
      setContent(defaultContent)
      setIsLoading(false)
    })

    return () => unsubscribe()
  }, [])

  return { content, isLoading }
}