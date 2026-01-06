// Configuration centralisée de tous les textes du formulaire
// Ce fichier est modifié par le dashboard admin

export interface SiteContent {
  // Header
  siteName: string
  siteTagline: string
  headerBadge: string

  // Hero section
  heroWelcome: string
  heroTitle: string
  heroSubtitle: string

  // Section titles
  section1Title: string
  section1Label: string
  section1Placeholder: string

  section2Title: string

  section3Title: string
  section3Subtitle: string

  section4Title: string
  section4Empty: string

  // Format descriptions
  formatDescriptions: {
    meet_author: string
    story_week: string
    behind_brouillon: string
    other: string
  }

  // Format instructions
  formatInstructions: {
    other: string
    meet_author: string
    story_week: string
    behind_brouillon: string
  }

  // Progress labels
  progressTitle: string
  progressSteps: {
    instagram: string
    format: string
    subformat: string
    answers: string
    date: string
  }

  // Submit section
  submitButton: string
  submittingButton: string
  errorMessage: string

  // Help section
  helpText: string

  // Success page
  successTitle: string
  successSubtitle: string
  successNextTitle: string
  successNextText: string
  successNewButton: string

  // Misc
  requiredLabel: string
  optionalLabel: string
  exampleLabel: string
  uploadText: string
  uploadSubtext: string
  uploadSuccess: string
  uploadLoading: string
  viewFile: string
}

// Valeurs par défaut
export const defaultContent: SiteContent = {
  // Header
  siteName: "Le Brouillon",
  siteTagline: "Magazine littéraire",
  headerBadge: "Formulaire de soumission",

  // Hero section
  heroWelcome: "Bienvenue",
  heroTitle: "Partage ta création littéraire",
  heroSubtitle: "Remplis ce formulaire pour soumettre ton contenu à notre équipe éditoriale. Nous avons hâte de découvrir ton univers !",

  // Section titles
  section1Title: "Ton identité",
  section1Label: "Pseudo Instagram",
  section1Placeholder: "@ton_pseudo",

  section2Title: "Choix du format",

  section3Title: "Tes réponses",
  section3Subtitle: "Les questions s'adaptent selon le type de post choisi",

  section4Title: "Date de publication",
  section4Empty: "Sélectionne d'abord un format pour voir les dates disponibles",

  // Format descriptions
  formatDescriptions: {
    meet_author: "Réponds à des questions et participe à une interview pour présenter ton univers, ton parcours et ton rapport à l'écriture.",
    story_week: "Partage ton roman à travers une présentation esthétique créée par Laure (youngflowrr), mêlant ambiance visuelle et extraits choisis.",
    behind_brouillon: "Montre les coulisses de ton écriture : brouillons, conseils, réflexions, doutes et confidences d'auteur.",
    other: "Tu as une autre idée de format ? Propose-la nous en message privé !",
  },

  // Format instructions
  formatInstructions: {
    meet_author: "Requis : une photo de toi (ou qui te représente) et la couverture de ton roman. Les images peuvent être téléchargées ici ou envoyées par DM.",
    story_week: "Photo requise : la couverture de ton roman",
    behind_brouillon: "Les questions s'adaptent selon le type de post choisi",
    other: "Les questions s'adaptent selon le type de post choisi",
  },

  // Progress labels
  progressTitle: "Progression",
  progressSteps: {
    instagram: "Pseudo Instagram",
    format: "Format choisi",
    subformat: "Type de post",
    answers: "Réponses complètes",
    date: "Date sélectionnée",
  },

  // Submit section
  submitButton: "Soumettre",
  submittingButton: "Envoi en cours...",
  errorMessage: "Remplis toutes les questions obligatoires avant de soumettre.",

  // Help section
  helpText: "Des questions ? Contacte-nous sur",

  // Success page
  successTitle: "Soumission reçue !",
  successSubtitle: "Merci d'avoir partagé ta plume avec nous ✨",
  successNextTitle: "Prochaines étapes",
  successNextText: "Notre équipe éditoriale examinera ta soumission avec attention. Tu seras contacté(e) sur Instagram dans les prochains jours.",
  successNewButton: "Nouvelle soumission",

  // Misc
  requiredLabel: "*",
  optionalLabel: "(optionnel)",
  exampleLabel: "Exemple d'angle",
  uploadText: "Clique pour importer",
  uploadSubtext: "PNG, JPG, JPEG ou PDF",
  uploadSuccess: "Fichier téléchargé ✓",
  uploadLoading: "Envoi en cours...",
  viewFile: "Voir le fichier",
}

export async function loadContent(): Promise<SiteContent> {
  return defaultContent
}

export type ContentUpdate = Partial<SiteContent>