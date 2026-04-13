"use client"

import { useEffect, useMemo, useState } from "react"
import { CheckCircle2, Circle, ListTodo } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { getTasks, type TaskRecord } from "@/lib/api"

export function TasksCard() {
  const [tasks, setTasks] = useState<TaskRecord[]>([])

  useEffect(() => {
    let mounted = true

    const load = async () => {
      try {
        const response = await getTasks({ page: 1, limit: 300 })
        if (mounted) {
          setTasks(response.items)
        }
      } catch {
        if (mounted) {
          setTasks([])
        }
      }
    }

    void load()

    return () => {
      mounted = false
    }
  }, [])

  const { completed, total } = useMemo(() => {
    const done = tasks.filter((task) => task.completed).length
    return { completed: done, total: tasks.length }
  }, [tasks])

  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">
              Tasks Overview
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold tabular-nums">{completed}</span>
              <span className="text-lg text-muted-foreground">/ {total}</span>
            </div>
          </div>
          <div className="flex size-14 items-center justify-center rounded-2xl bg-chart-4/10">
            <ListTodo className="size-7 text-chart-4" />
          </div>
        </div>
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{percentage}%</span>
          </div>
          <Progress value={percentage} className="h-2" />
        </div>
        <div className="mt-4 flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="size-4 text-chart-3" />
            <span className="text-muted-foreground">{completed} done</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Circle className="size-4 text-muted-foreground" />
            <span className="text-muted-foreground">{total - completed} pending</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
