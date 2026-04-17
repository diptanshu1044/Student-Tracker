"use client"

import { useEffect, useMemo, useState } from "react"
import { GripVertical, MoreHorizontal } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import {
  getPlannerTasksByProfile,
  getTasks,
  type PlannerTaskRecord,
  type TaskRecord,
  updatePlannerTaskStatus,
  updateTaskCompletion,
} from "@/lib/api"
import { toast } from "sonner"

interface Task {
  id: string
  title: string
  priority: "High" | "Medium" | "Low"
  dueTime?: string
  completed: boolean
}

interface TaskListProps {
  selectedDate: Date
  refreshToken: number
  profileId?: string
}

function mapTask(record: TaskRecord): Task {
  const dueDate = record.dueDate ? new Date(record.dueDate) : null

  return {
    id: record._id,
    title: record.title,
    priority:
      record.priority === "high"
        ? "High"
        : record.priority === "medium"
          ? "Medium"
          : "Low",
    dueTime: dueDate
      ? dueDate.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        })
      : undefined,
    completed: record.completed,
  }
}

function isSameDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  )
}

function mapPlannerTask(record: PlannerTaskRecord): Task {
  const startTime = new Date(record.startTime)

  return {
    id: record._id,
    title: record.title,
    priority:
      record.priority === "high"
        ? "High"
        : record.priority === "medium"
          ? "Medium"
          : "Low",
    dueTime: startTime.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    }),
    completed: record.status === "completed",
  }
}

export function TaskList({ selectedDate, refreshToken, profileId }: TaskListProps) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    const loadTasks = async () => {
      try {
        if (profileId) {
          const response = await getPlannerTasksByProfile(profileId, { page: 1, limit: 300 })
          if (!mounted) {
            return
          }

          const nextTasks = response.items
            .filter((item) => isSameDay(new Date(item.startTime), selectedDate))
            .map(mapPlannerTask)

          setTasks(nextTasks)
          setError(null)
          return
        }

        const response = await getTasks({ page: 1, limit: 300 })
        if (!mounted) {
          return
        }

        const nextTasks = response.items
          .filter((item) => {
            if (!item.dueDate) {
              return true
            }

            return isSameDay(new Date(item.dueDate), selectedDate)
          })
          .map(mapTask)

        setTasks(nextTasks)
        setError(null)
      } catch (requestError) {
        if (mounted) {
          setError(requestError instanceof Error ? requestError.message : "Failed to load tasks")
        }
      }
    }

    void loadTasks()

    return () => {
      mounted = false
    }
  }, [profileId, refreshToken, selectedDate])

  const toggleTask = async (taskId: string, completed: boolean) => {
    setTasks((current) =>
      current.map((task) =>
        task.id === taskId ? { ...task, completed } : task
      )
    )

    try {
      if (profileId) {
        await updatePlannerTaskStatus(taskId, completed ? "completed" : "pending")
      } else {
        await updateTaskCompletion(taskId, completed)
      }
    } catch {
      setTasks((current) =>
        current.map((task) =>
          task.id === taskId ? { ...task, completed: !completed } : task
        )
      )
      toast.error("Failed to update task status")
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "High":
        return "bg-chart-5/10 text-chart-5 hover:bg-chart-5/20"
      case "Medium":
        return "bg-chart-4/10 text-chart-4 hover:bg-chart-4/20"
      case "Low":
        return "bg-chart-2/10 text-chart-2 hover:bg-chart-2/20"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  const completedCount = useMemo(() => tasks.filter((t) => t.completed).length, [tasks])

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base font-semibold">
          <span>
            {selectedDate.toLocaleDateString("en-US", {
              weekday: "long",
              month: "short",
              day: "numeric",
            })}
          </span>
          <span className="text-sm font-normal text-muted-foreground">
            {completedCount}/{tasks.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {tasks.map((task) => (
          <div
            key={task.id}
            className={cn(
              "group flex items-start gap-3 rounded-lg border p-3 transition-colors",
              task.completed && "bg-muted/50"
            )}
          >
            <GripVertical className="mt-0.5 size-4 cursor-grab text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            <Checkbox
              checked={task.completed}
              onCheckedChange={(checked) => toggleTask(task.id, checked === true)}
              className="mt-0.5"
            />
            <div className="flex-1 space-y-1">
              <p
                className={cn(
                  "text-sm font-medium leading-tight",
                  task.completed && "text-muted-foreground line-through"
                )}
              >
                {task.title}
              </p>
              <div className="flex items-center gap-2">
                <Badge
                  variant="secondary"
                  className={cn("text-xs", getPriorityColor(task.priority))}
                >
                  {task.priority}
                </Badge>
                {task.dueTime && (
                  <span className="text-xs text-muted-foreground">
                    {task.dueTime}
                  </span>
                )}
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>Edit</DropdownMenuItem>
                <DropdownMenuItem>Reschedule</DropdownMenuItem>
                <DropdownMenuItem className="text-destructive">
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}
        {tasks.length === 0 && (
          <div className="py-8 text-center text-muted-foreground">
            <p>No tasks for this day</p>
            <p className="text-sm">Click &quot;Add Task&quot; to create one</p>
          </div>
        )}
        {error && <p className="text-xs text-destructive">{error}</p>}
      </CardContent>
    </Card>
  )
}
