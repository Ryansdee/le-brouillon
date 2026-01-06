import { Format, FormatKey, SubformatKey, SubformatConfig } from "@/types/form"

// Descriptions courtes des sous-formats (utilisées dans le sélecteur)
export const SUBFORMAT_DESCRIPTIONS: Record<SubformatKey, string> = {
  conseils: "Partage des conseils pratiques pour d'autres auteurs",
  confessions: "Un format personnel et honnête sur tes doutes",
  mythes: "Démonte les idées reçues sur l'écriture",
  sensible: "Aborde un thème délicat avec bienveillance",
  other: "Contacte-nous pour proposer un format différent",
}

// Exemples détaillés pour chaque sous-format (affichés après sélection)
export const SUBFORMAT_EXAMPLES: Record<SubformatKey, string> = {
  conseils: "Exemple : Comment j'aborde les sujets sensibles comme l'inceste dans mon roman, conseils pour traiter ce thème avec respect",
  confessions: "Exemple : J'avoue avoir peur de mes statistiques, le syndrome de l'imposteur me ronge, je doute de mon écriture chaque jour",
  mythes: "Exemple : La réalité d'être publié vs les idées reçues, ce que personne ne te dit sur l'édition",
  sensible: "Exemple : Comment j'ai traité le thème du deuil dans mon histoire, l'importance de la recherche documentaire",
  other: "Propose ton propre angle créatif pour parler de ton expérience d'auteur",
}

export const FORMATS: Record<FormatKey, Format> = {
  meet_author: {
    label: "Meet the Author",
    days: [1],
    consigne: "Répondez en 3 à 5 phrases aux questions suivantes.",
    questions: [
      { id: "pfp", label: "Image de vous ou qui vous représente", type: "image" },
      { id: "cover", label: "Couverture de ton histoire", type: "image" },
      { id: "writing_since", label: "Depuis quand écris-tu ?", type: "text" },
      { id: "first_draft", label: "À quoi ressemblait ton tout premier brouillon ?", type: "textarea" },
      { id: "favorite_moment", label: "Ton moment préféré pour écrire ?", type: "text" },
      { id: "love_hate", label: "Ce que tu aimes le moins (-) et le plus (+) dans l'écriture ?", type: "textarea" },
      { id: "suffering_character", label: "Un personnage que tu fais souffrir ?", type: "text" },
      { id: "this_or_that", label: "Jouons a un petit jeu: Slow burn ou fast burn ? Happy ou sad ending ? Cliffhanger ou chapitre safe? Explique brièvement ton choix.", type: "textarea" },
      { id: "fun_fact", label: "Un fun fact sur toi ?", type: "text" },
    ],
    images: ["author_photo", "cover_photo"],
  },

  story_week: {
    label: "Story of the Week",
    days: [3],
    consigne: "Répondez en 3 à 5 phrases aux questions suivantes.",
    questions: [
      { id: "cover", label: "Couverture de ton histoire", type: "image" },
      { id: "title", label: "Titre de ton histoire", type: "text" },
      { id: "author", label: "Pseudo Wattpad", type: "text" },
      { id: "summary", label: "Résumé de ton histoire", type: "textarea" },
      { id: "tropes", label: "Tropes (À lire si tu aimes…)", type: "textarea" },
      { id: "quotes", label: "Citation / scène clé", type: "textarea" },
      { id: "vibe", label: "Type de photos / vibe souhaitée (par ex. : groupe d'amis, boîte de nuit,..)", type: "textarea" },
      { id: "story_link", label: "Lien vers l'histoire sur Wattpad", type: "text" },
      {
        id: "pinterest",
        label: "Lien Pinterest (optionnel — merci d'indiquer « / » si non applicable)",
        type: "text"
      },
      { id: "socials", label: "Autres réseaux sociaux (TikTok, Instagram, Wattpad, Fyctia)", type: "text" },
    ],
  },

  behind_brouillon: {
    label: "Behind the Brouillon",
    days: [6],
    consigne: "Partage ton expérience d'auteur de manière créative et authentique.",
    questions: [], // Vide car les questions dépendent du sous-format sélectionné
    
    // Pour la compatibilité avec le sélecteur de sous-formats
    subformats: {
      conseils: "Conseils d'auteurs",
      confessions: "Confessions d'auteurs",
      mythes: "Mythes vs réalité littéraire",
      sensible: "Sujet sensible",
      other: "Autre format",
    },
    
    // Questions communes à TOUS les sous-formats BTB
    commonQuestions: [
      { id: "wattpad", label: "Pseudo Wattpad", type: "text" },
      { id: "talks_about_book", label: "Je parle de mon roman dans ce post", type: "checkbox" },
      { id: "cover", label: "Couverture de ton roman (si tu en parles)", type: "image" },
      { id: "book_title", label: "Titre de ton roman (si tu en parles)", type: "text" },
      { id: "socials", label: "Autres réseaux sociaux (TikTok, Instagram, Fyctia) — indique « / » si non applicable", type: "text" },
    ],
    
    // Configuration détaillée pour chaque sous-format
    subformatConfigs: {
      conseils: {
        label: "Conseils d'auteurs",
        description: "Partage des conseils pratiques pour d'autres auteurs",
        example: "Exemple : Comment j'aborde les sujets sensibles comme l'inceste dans mon roman, conseils pour traiter ce thème avec respect",
        questions: [
          { 
            id: "advice_topic", 
            label: "Quel conseil veux-tu partager ?", 
            type: "text",
            placeholder: "Ex: Comment créer des personnages crédibles, Gérer le syndrome de la page blanche..."
          },
          { 
            id: "advice_content", 
            label: "Développe tes conseils (ton expérience, ce qui a marché pour toi)", 
            type: "textarea",
            placeholder: "Partage ton processus, tes astuces, ce que tu as appris..."
          },
          { 
            id: "advice_target", 
            label: "À qui s'adresse ce conseil ? (débutants, auteurs confirmés, tous...)", 
            type: "text",
            placeholder: "Ex: Tous les auteurs, Débutants, Auteurs de romance..."
          },
        ]
      },
      
      confessions: {
        label: "Confessions d'auteurs",
        description: "Un format personnel et honnête sur tes doutes",
        example: "Exemple : J'avoue avoir peur de mes statistiques, le syndrome de l'imposteur me ronge, je doute de mon écriture chaque jour",
        questions: [
          { 
            id: "confession_topic", 
            label: "De quoi veux-tu parler ?", 
            type: "text",
            placeholder: "Ex: Ma peur des statistiques, Le syndrome de l'imposteur, Mes doutes..."
          },
          { 
            id: "confession_content", 
            label: "Partage ton expérience (sois authentique, on est tous passés par là)", 
            type: "textarea",
            placeholder: "Raconte ce que tu ressens, tes difficultés, comment tu gères..."
          },
          { 
            id: "confession_overcome", 
            label: "Comment tu gères/surmontes cette difficulté ? (ou pas, c'est ok aussi)", 
            type: "textarea",
            placeholder: "Partage tes stratégies, ou avoue que c'est toujours difficile..."
          },
        ]
      },
      
      mythes: {
        label: "Mythes vs réalité littéraire",
        description: "Démonte les idées reçues sur l'écriture",
        example: "Exemple : La réalité d'être publié vs les idées reçues, ce que personne ne te dit sur l'édition",
        questions: [
          { 
            id: "myth_topic", 
            label: "Quel mythe veux-tu déconstruire ?", 
            type: "text",
            placeholder: "Ex: 'Il faut écrire tous les jours', 'La publication = succès garanti'..."
          },
          { 
            id: "myth_belief", 
            label: "Qu'est-ce qu'on croit généralement ? (le mythe)", 
            type: "textarea",
            placeholder: "Explique l'idée reçue répandue..."
          },
          { 
            id: "myth_reality", 
            label: "Quelle est la réalité selon ton expérience ?", 
            type: "textarea",
            placeholder: "Partage ce qui se passe vraiment, ta vérité d'auteur..."
          },
        ]
      },
      
      sensible: {
        label: "Sujet sensible",
        description: "Aborde un thème délicat avec bienveillance",
        example: "Exemple : Comment j'ai traité le thème du deuil dans mon histoire, l'importance de la recherche documentaire",
        questions: [
          { 
            id: "sensitive_topic", 
            label: "Quel sujet sensible abordes-tu ?", 
            type: "text",
            placeholder: "Ex: Le deuil, Les troubles alimentaires, L'abus, La santé mentale..."
          },
          { 
            id: "sensitive_approach", 
            label: "Comment tu as abordé ce thème dans ton écriture ?", 
            type: "textarea",
            placeholder: "Ton processus de recherche, tes précautions, ton approche respectueuse..."
          },
          { 
            id: "sensitive_advice", 
            label: "Quels conseils donnerais-tu à d'autres auteurs sur ce sujet ?", 
            type: "textarea",
            placeholder: "Comment traiter ce thème avec respect et authenticité..."
          },
        ]
      },
      
      other: {
        label: "Autre format",
        description: "Contacte-nous pour proposer un format différent",
        example: "Propose ton propre angle créatif pour parler de ton expérience d'auteur",
        questions: [
          { 
            id: "other_topic", 
            label: "Sujet de ton post", 
            type: "text",
            placeholder: "De quoi veux-tu parler ?"
          },
          { 
            id: "other_content", 
            label: "Développe ton contenu", 
            type: "textarea",
            placeholder: "Partage ton expérience, tes réflexions..."
          },
        ]
      },
    },
  },

  other: {
    label: "Autre format",
    days: [0, 2, 4, 5],
    consigne: "Décris ton format en quelques phrases.",
    questions: [{ id: "description", label: "Décris ton format", type: "textarea" }],
  },
}

// Helper function pour obtenir toutes les questions d'un sous-format BTB
export function getBehindBrouillonQuestions(subformat: SubformatKey) {
  const btbFormat = FORMATS.behind_brouillon
  const subformatConfig = btbFormat.subformatConfigs?.[subformat]
  
  if (!subformatConfig) return []
  
  // Combine: questions spécifiques du sous-format + questions communes
  return [
    ...subformatConfig.questions,
    ...(btbFormat.commonQuestions || [])
  ]
}

// Helper function pour obtenir la config complète d'un sous-format
export function getSubformatConfig(subformat: SubformatKey): SubformatConfig | null {
  return FORMATS.behind_brouillon.subformatConfigs?.[subformat] || null
}