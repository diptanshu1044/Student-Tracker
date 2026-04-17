"use client"

import { useEffect, useMemo, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { getGlobalPlanner, getPlannerTasksByProfile, type PlannerTaskRecord } from "@/lib/api"
import { Badge } from "@/components/ui/badge"

interface WeeklyCalendarProps {
  selectedDate: Date
  onSelectDate: (date: Date) => void
  viewMode: "day" | "week" | "month"
  profileId?: string
  refreshToken?: number
  className?: string
}

type TaskBucket = Record<string, PlannerTaskRecord[]>

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0)
}

function endOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999)
}

function startOfWeek(date: Date) {
  const next = startOfDay(date)
  const day = next.getDay()
  const offset = day === 0 ? -6 : 1 - day
  next.setDate(next.getDate() + offset)
  return next
}

function endOfWeek(date: Date) {
  const next = startOfWeek(date)
  next.setDate(next.getDate() + 6)
  return endOfDay(next)
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0)
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999)
}

function toIso(date: Date) {
  return date.toISOString()
}

function formatDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

function getRange(date: Date, viewMode: WeeklyCalendarProps["viewMode"]) {
  if (viewMode === "day") {
    return { startDate: startOfDay(date), endDate: endOfDay(date) }
  }

  if (viewMode === "month") {
    return { startDate: startOfMonth(date), endDate: endOfMonth(date) }
  }

  return { startDate: startOfWeek(date), endDate: endOfWeek(date) }
}

function getNavigateDate(date: Date, viewMode: WeeklyCalendarProps["viewMode"], step: number) {
  const next = new Date(date)

  if (viewMode === "day") {
    next.setDate(next.getDate() + step)
    return next
  }

  if (viewMode === "month") {
    next.setMonth(next.getMonth() + step)
    return next
  }

  next.setDate(next.getDate() + step * 7)
  return next
}

function buildCalendarBuckets(tasks: PlannerTaskRecord[]) {
  return tasks.reduce<TaskBucket>((buckets, task) => {
    const taskDate = new Date(task.startTime)
    const key = formatDateKey(taskDate)
    buckets[key] = [...(buckets[key] ?? []), task]
    return buckets
  }, {})
}

export function WeeklyCalendar({
  selectedDate,
  onSelectDate,
  viewMode,
  profileId,
  refreshToken,
  className,
}: WeeklyCalendarProps) {
  const [tasks, setTasks] = useState<PlannerTaskRecord[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const range = useMemo(() => getRange(selectedDate, viewMode), [selectedDate, viewMode])

  useEffect(() => {
    let mounted = true

    const loadTasks = async () => {
      setIsLoading(true)
      try {
        const query = {
          page: 1,
          limit: 500,
          startDate: toIso(range.startDate),
          endDate: toIso(range.endDate),
        }

        const response = profileId
          ? await getPlannerTasksByProfile(profileId, query)
          : await getGlobalPlanner(query)

        if (!mounted) {
          return
        }

        setTasks(response.items)
        setError(null)
      } catch (requestError) {
        if (mounted) {
          setError(requestError instanceof Error ? requestError.message : "Failed to load planner tasks")
        }
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    void loadTasks()

    return () => {
      mounted = false
    }
  }, [profileId, range.endDate, range.startDate, refreshToken])

  const taskBuckets = useMemo(() => buildCalendarBuckets(tasks), [tasks])

  const weekDays = useMemo(() => {
    const base = viewMode === "month" ? startOfMonth(selectedDate) : startOfWeek(selectedDate)
    const days = viewMode === "month" ? 42 : 7
    return Array.from({ length: days }, (_, index) => {
      const date = new Date(base)
      date.setDate(base.getDate() + index)
      return date
    })
  }, [selectedDate, viewMode])

  const monthDays = useMemo(() => {
    const firstDay = startOfMonth(selectedDate)
    const weekStart = startOfWeek(firstDay)
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(weekStart)
      date.setDate(weekStart.getDate() + index)
      return date
    })
  }, [selectedDate])

  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const isSelected = (date: Date) => {
    return date.toDateString() === selectedDate.toDateString()
  }

  const formatTitle = () => {
    if (viewMode === "day") {
      return selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })
    }

    if (viewMode === "month") {
      return selectedDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })
    }

    const start = weekDays[0]
    const end = weekDays[6]
    return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
  }

  return (
    <Card className={cn(className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-semibold">
          {formatTitle()}
        </CardTitle>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={() => onSelectDate(getNavigateDate(selectedDate, viewMode, -1))}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSelectDate(new Date())}
          >
            Today
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={() => onSelectDate(getNavigateDate(selectedDate, viewMode, 1))}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {viewMode === "day" ? (
          <div className="space-y-3">
            <div className="grid gap-2">
              {tasks.length === 0 ? (
                <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                  No tasks for this day
                </div>
              ) : (
                tasks
                  .slice()
                  .sort((left, right) => new Date(left.startTime).getTime() - new Date(right.startTime).getTime())
                  .map((task) => (
                    <div key={task._id} className="rounded-xl border p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">{task.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(task.startTime).toLocaleTimeString("en-US", {
                              hour: "numeric",
                              minute: "2-digit",
                            })} - {new Date(task.endTime).toLocaleTimeString("en-US", {
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                        <Badge variant="secondary">{task.priority}</Badge>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-2">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
              <div key={day} className="py-2 text-center text-xs font-medium text-muted-foreground">
                {day}
              </div>
            ))}

            {(viewMode === "month" ? monthDays : weekDays).map((date) => {
              const dateKey = formatDateKey(date)
              const dayTasks = taskBuckets[dateKey] ?? []
              const selected = isSelected(date)
              const today = isToday(date)
              const inCurrentMonth = viewMode !== "month" || date.getMonth() === selectedDate.getMonth()

              return (
                <button
                  key={dateKey}
                  onClick={() => onSelectDate(date)}
                  className={cn(
                    "relative flex min-h-24 flex-col items-start rounded-xl border p-2 text-left transition-colors",
                    selected ? "bg-primary text-primary-foreground" : "hover:bg-accent",
                    today && !selected && "ring-2 ring-primary ring-offset-2 ring-offset-background",
                    viewMode === "month" && !inCurrentMonth && "opacity-40"
                  )}
                >
                  <span className={cn("text-sm font-semibold", !selected && today && "text-primary")}>{date.getDate()}</span>
                  <span className={cn("mt-1 text-[11px]", selected ? "text-primary-foreground/75" : "text-muted-foreground")}>{dayTasks.length} tasks</span>
                  {dayTasks.slice(0, 2).map((task) => (
                    <span key={task._id} className={cn("mt-1 line-clamp-1 w-full text-[11px]", selected ? "text-primary-foreground/80" : "text-foreground")}>{task.title}</span>
                  ))}
                </button>
              )
            })}
          </div>
        )}
        {error && <p className="mt-3 text-xs text-destructive">{error}</p>}
        {isLoading && <p className="mt-3 text-xs text-muted-foreground">Loading tasks...</p>}
      </CardContent>
    </Card>
  )
}
