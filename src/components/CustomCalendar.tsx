"use client"

import { useEffect, useState } from "react"
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react"
import { collection, getDocs, query, where } from "firebase/firestore"
import { db } from "@/lib/firebase"

interface CustomCalendarProps {
  selectedDate: string
  onSelectDate: (date: string) => void
  allowedDays: number[] // 0 = Sunday, 1 = Monday, etc.
  format: string
}

const MONTH_NAMES = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
]

const DAY_NAMES = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"]

// Helper function to format date as YYYY-MM-DD without timezone issues
const formatDateString = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default function CustomCalendar({ selectedDate, onSelectDate, allowedDays, format }: CustomCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [bookedDates, setBookedDates] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch booked dates from Firestore
  useEffect(() => {
    const fetchBookedDates = async () => {
      setLoading(true)
      try {
        // Get dates from submissions
        const submissionsRef = collection(db, "submissions")
        const submissionsSnapshot = await getDocs(submissionsRef)
        const submissionDates = submissionsSnapshot.docs.map(doc => doc.data().date)
        
        // Get manually blocked dates from admin
        const blockedDatesRef = collection(db, "blocked_dates")
        const blockedSnapshot = await getDocs(blockedDatesRef)
        const adminBlockedDates = blockedSnapshot.docs.map(doc => doc.data().date)
        
        // Combine both arrays and remove duplicates
        const allBlockedDates = [...new Set([...submissionDates, ...adminBlockedDates])]
        
        setBookedDates(allBlockedDates)
      } catch (error) {
        console.error("Error fetching booked dates:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchBookedDates()
    
    // Refresh every 10 seconds
    const interval = setInterval(fetchBookedDates, 10000)
    return () => clearInterval(interval)
  }, [])

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    return { daysInMonth, startingDayOfWeek, year, month }
  }

  const isDateAvailable = (date: Date) => {
    const dayOfWeek = date.getDay()
    const dateString = formatDateString(date)
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    // Check if date is in the past
    if (date < today) return false
    
    // Check if day of week is allowed for this format
    if (!allowedDays.includes(dayOfWeek)) return false
    
    // Check if date is blocked (either by a submission OR manually blocked by admin)
    // bookedDates includes both submissions.date and blocked_dates.date
    if (bookedDates.includes(dateString)) return false
    
    return true
  }

  const handlePreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
  }

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))
  }

  const handleDateClick = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
    if (isDateAvailable(date)) {
      const dateString = formatDateString(date)
      
      console.log('Calendar date click:', {
        day,
        date,
        dateString,
        dayOfWeek: date.getDay()
      })
      
      onSelectDate(dateString)
    }
  }

  const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentMonth)

  // Create array of calendar days including empty spaces
  const calendarDays = []
  
  // Add empty spaces for days before month starts
  for (let i = 0; i < startingDayOfWeek; i++) {
    calendarDays.push(null)
  }
  
  // Add all days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day)
  }

  const canGoPrevious = () => {
    const today = new Date()
    const previousMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1)
    return previousMonth.getMonth() >= today.getMonth() || previousMonth.getFullYear() > today.getFullYear()
  }

  return (
    <div className="bg-white rounded-2xl border-2 border-stone-200 overflow-hidden">
      {/* Calendar Header */}
      <div className="bg-gradient-to-r from-stone-900 to-stone-800 px-6 py-4 flex items-center justify-between">
        <button
          onClick={handlePreviousMonth}
          disabled={!canGoPrevious()}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>
        
        <div className="text-center">
          <h3 className="text-white font-serif text-xl">
            {MONTH_NAMES[month]} {year}
          </h3>
        </div>
        
        <button
          onClick={handleNextMonth}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Calendar Body */}
      <div className="p-6">
        {/* Day names */}
        <div className="grid grid-cols-7 gap-2 mb-3">
          {DAY_NAMES.map(day => (
            <div key={day} className="text-center text-xs font-medium text-stone-500 py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-2">
          {calendarDays.map((day, index) => {
            if (day === null) {
              return <div key={`empty-${index}`} className="aspect-square" />
            }

            const date = new Date(year, month, day)
            const dateString = formatDateString(date)
            const isAvailable = isDateAvailable(date)
            const isSelected = selectedDate === dateString
            const isBooked = bookedDates.includes(dateString)
            const isPast = date < new Date(new Date().setHours(0, 0, 0, 0))
            const isWrongDay = !allowedDays.includes(date.getDay())

            return (
              <button
                key={day}
                onClick={() => handleDateClick(day)}
                disabled={!isAvailable || loading}
                className={`
                  aspect-square rounded-xl flex items-center justify-center text-sm font-medium transition-all
                  ${isSelected 
                    ? 'bg-stone-900 text-white shadow-lg ring-2 ring-stone-900 ring-offset-2' 
                    : isAvailable
                      ? 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100 hover:shadow-md border-2 border-emerald-200'
                      : isBooked
                        ? 'bg-red-50 text-red-400 border border-red-200 cursor-not-allowed line-through'
                        : isWrongDay
                          ? 'bg-stone-50 text-stone-300 cursor-not-allowed'
                          : isPast
                            ? 'bg-stone-50 text-stone-300 cursor-not-allowed'
                            : 'bg-stone-100 text-stone-400 cursor-not-allowed'
                  }
                  ${!isAvailable && !isSelected ? 'opacity-50' : ''}
                `}
              >
                {day}
              </button>
            )
          })}
        </div>

        {/* Legend */}
        <div className="mt-6 pt-4 border-t border-stone-200 space-y-2">
          <div className="flex items-center gap-2 text-xs">
            <div className="w-6 h-6 rounded-lg bg-emerald-50 border-2 border-emerald-200" />
            <span className="text-stone-600">Disponible</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-6 h-6 rounded-lg bg-red-50 border border-red-200 flex items-center justify-center">
              <span className="text-red-400 text-xs line-through">15</span>
            </div>
            <span className="text-stone-600">Réservé ou bloqué</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-6 h-6 rounded-lg bg-stone-50" />
            <span className="text-stone-600">Jour non autorisé pour ce format</span>
          </div>
        </div>
      </div>
    </div>
  )
}