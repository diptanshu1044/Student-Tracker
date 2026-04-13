"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { useState } from "react"

interface WeeklyCalendarProps {
  selectedDate: Date
  onSelectDate: (date: Date) => void
  className?: string
}

// Mock task data
const tasksForDates: Record<string, { count: number; hasHigh: boolean }> = {
  "2026-04-13": { count: 3, hasHigh: true },
  "2026-04-14": { count: 2, hasHigh: false },
  "2026-04-15": { count: 1, hasHigh: true },
  "2026-04-16": { count: 4, hasHigh: false },
  "2026-04-17": { count: 0, hasHigh: false },
  "2026-04-18": { count: 2, hasHigh: true },
  "2026-04-19": { count: 1, hasHigh: false },
}

export function WeeklyCalendar({
  selectedDate,
  onSelectDate,
  className,
}: WeeklyCalendarProps) {
  const [weekOffset, setWeekOffset] = useState(0)

  // Get the start of the week (Monday)
  const getWeekStart = (date: Date, offset: number) => {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1) + offset * 7
    d.setDate(diff)
    return d
  }

  const weekStart = getWeekStart(new Date(), weekOffset)
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(weekStart)
    date.setDate(weekStart.getDate() + i)
    return date
  })

  const formatDateKey = (date: Date) => {
    return date.toISOString().split("T")[0]
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const isSelected = (date: Date) => {
    return date.toDateString() === selectedDate.toDateString()
  }

  const formatMonthYear = () => {
    const start = weekDays[0]
    const end = weekDays[6]
    if (start.getMonth() === end.getMonth()) {
      return start.toLocaleDateString("en-US", { month: "long", year: "numeric" })
    }
    return `${start.toLocaleDateString("en-US", { month: "short" })} - ${end.toLocaleDateString("en-US", { month: "short", year: "numeric" })}`
  }

  return (
    <Card className={cn(className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-semibold">
          {formatMonthYear()}
        </CardTitle>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={() => setWeekOffset(weekOffset - 1)}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setWeekOffset(0)}
          >
            Today
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={() => setWeekOffset(weekOffset + 1)}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-2">
          {/* Day headers */}
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
            <div
              key={day}
              className="py-2 text-center text-xs font-medium text-muted-foreground"
            >
              {day}
            </div>
          ))}
          {/* Day cells */}
          {weekDays.map((date) => {
            const dateKey = formatDateKey(date)
            const taskInfo = tasksForDates[dateKey]
            const selected = isSelected(date)
            const today = isToday(date)

            return (
              <button
                key={dateKey}
                onClick={() => onSelectDate(date)}
                className={cn(
                  "relative flex h-20 flex-col items-center justify-start rounded-xl p-2 transition-colors",
                  selected
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent",
                  today && !selected && "ring-2 ring-primary ring-offset-2 ring-offset-background"
                )}
              >
                <span
                  className={cn(
                    "text-lg font-semibold",
                    !selected && today && "text-primary"
                  )}
                >
                  {date.getDate()}
                </span>
                {taskInfo && taskInfo.count > 0 && (
                  <div className="mt-auto flex gap-1">
                    {taskInfo.hasHigh && (
                      <div
                        className={cn(
                          "size-2 rounded-full",
                          selected ? "bg-primary-foreground" : "bg-chart-5"
                        )}
                      />
                    )}
                    <span
                      className={cn(
                        "text-xs",
                        selected
                          ? "text-primary-foreground/80"
                          : "text-muted-foreground"
                      )}
                    >
                      {taskInfo.count} tasks
                    </span>
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
