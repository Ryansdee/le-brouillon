export type FormatKey = "meet_author" | "story_week" | "behind_brouillon" | "other"

export type SubformatKey =
  | "conseils"
  | "confessions"
  | "mythes"
  | "sensible"
  | "other"

export interface Question {
  id: string
  label: string
  type: "text" | "textarea" | "image" | "checkbox"
  description?: string
  placeholder?: string
}

export interface SubformatConfig {
  label: string
  description: string
  example: string
  questions: Question[] // Questions spécifiques à ce sous-format
}

export interface Format {
  label: string
  days: number[]
  questions: Question[]
  images?: string[]
  subformats?: Record<SubformatKey, string> // For simple formats (just labels)
  subformatConfigs?: Record<SubformatKey, SubformatConfig> // For complex formats (BTB)
  commonQuestions?: Question[] // Questions communes à tous les sous-formats
  consigne: string
}