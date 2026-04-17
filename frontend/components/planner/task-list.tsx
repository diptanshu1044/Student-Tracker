"use client"

import { useEffect, useMemo, useState } from "react"
import { GripVertical, MoreHorizontal } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import {
  deletePlannerTask,
  getPlannerTasksByProfile,
  getTasks,
  type PlannerTaskRecord,
  type TaskRecord,
  updatePlannerTask,
  updatePlannerTaskStatus,
  updateTaskCompletion,
} from "@/lib/api"
import { toast } from "sonner"

interface Task {
  id: string
  title: string
  priority: "High" | "Medium" | "Low"
  rawPriority: "low" | "medium" | "high"
  dueTime?: string
  startTime?: string
  endTime?: string
  completed: boolean
}

interface TaskListProps {
  selectedDate: Date
  refreshToken: number
  profileId?: string
  onTaskMutated?: () => void
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
    rawPriority: record.priority,
    dueTime: dueDate
      ? dueDate.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        })
      : undefined,
    startTime: record.dueDate,
    endTime: record.dueDate ? new Date(new Date(record.dueDate).getTime() + 60 * 60 * 1000).toISOString() : undefined,
    completed: record.completed,
  }
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0)
}

function endOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999)
}

function toIso(date: Date) {
  return date.toISOString()
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
    rawPriority: record.priority,
    dueTime: startTime.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    }),
    startTime: record.startTime,
    endTime: record.endTime,
    completed: record.status === "completed",
  }
}

function priorityToApi(priority: Task["priority"]): "low" | "medium" | "high" {
  if (priority === "High") {
    return "high"
  }

  if (priority === "Medium") {
    return "medium"
  }

  return "low"
}

function reorderList<T>(list: T[], fromIndex: number, toIndex: number) {
  const next = [...list]
  const [item] = next.splice(fromIndex, 1)
  next.splice(toIndex, 0, item)
  return next
}

function toDatetimeLocal(iso?: string) {
  if (!iso) {
    return ""
  }

  const date = new Date(iso)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  const hours = String(date.getHours()).padStart(2, "0")
  const minutes = String(date.getMinutes()).padStart(2, "0")
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

function fromDatetimeLocal(localDateTime: string) {
  return new Date(localDateTime).toISOString()
}

export function TaskList({ selectedDate, refreshToken, profileId, onTaskMutated }: TaskListProps) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [error, setError] = useState<string | null>(null)
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState("")
  const [editingPriority, setEditingPriority] = useState<"high" | "medium" | "low">("medium")
  const [reschedulingTaskId, setReschedulingTaskId] = useState<string | null>(null)
  const [rescheduleStart, setRescheduleStart] = useState("")
  const [rescheduleEnd, setRescheduleEnd] = useState("")
  const [submittingAction, setSubmittingAction] = useState(false)
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    const loadTasks = async () => {
      try {
        const dayRange = {
          startDate: toIso(startOfDay(selectedDate)),
          endDate: toIso(endOfDay(selectedDate)),
        }

        if (profileId) {
          const response = await getPlannerTasksByProfile(profileId, { page: 1, limit: 300, ...dayRange })
          if (!mounted) {
            return
          }

          const nextTasks = response.items.map(mapPlannerTask)

          setTasks(nextTasks)
          setError(null)
          return
        }

        const response = await getTasks({ page: 1, limit: 300, completed: undefined })
        if (!mounted) {
          return
        }

        const nextTasks = response.items
          .filter((item) => {
            if (!item.dueDate) {
              return false
            }

            const dueDate = new Date(item.dueDate)
            return dueDate >= startOfDay(selectedDate) && dueDate <= endOfDay(selectedDate)
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

  const runPlannerOnlyAction = async (action: () => Promise<void>) => {
    if (!profileId) {
      toast.error("This action is available only for planner profile tasks")
      return
    }

    try {
      setSubmittingAction(true)
      await action()
      onTaskMutated?.()
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Failed to update task"
      toast.error(message)
    } finally {
      setSubmittingAction(false)
    }
  }

  const handleOpenEdit = (task: Task) => {
    setEditingTaskId(task.id)
    setEditingTitle(task.title)
    setEditingPriority(task.rawPriority)
  }

  const handleSaveEdit = async () => {
    if (!editingTaskId || !editingTitle.trim()) {
      return
    }

    await runPlannerOnlyAction(async () => {
      await updatePlannerTask(editingTaskId, {
        title: editingTitle.trim(),
        priority: editingPriority,
      })

      setTasks((current) =>
        current.map((task) =>
          task.id === editingTaskId
            ? {
                ...task,
                title: editingTitle.trim(),
                rawPriority: editingPriority,
                priority: editingPriority === "high" ? "High" : editingPriority === "medium" ? "Medium" : "Low",
              }
            : task
        )
      )

      setEditingTaskId(null)
      toast.success("Task updated")
    })
  }

  const handleOpenReschedule = (task: Task) => {
    setReschedulingTaskId(task.id)
    setRescheduleStart(toDatetimeLocal(task.startTime))
    setRescheduleEnd(toDatetimeLocal(task.endTime))
  }

  const handleSaveReschedule = async () => {
    if (!reschedulingTaskId || !rescheduleStart || !rescheduleEnd) {
      return
    }

    const startIso = fromDatetimeLocal(rescheduleStart)
    const endIso = fromDatetimeLocal(rescheduleEnd)

    if (new Date(endIso) <= new Date(startIso)) {
      toast.error("End time must be after start time")
      return
    }

    await runPlannerOnlyAction(async () => {
      await updatePlannerTask(reschedulingTaskId, {
        startTime: startIso,
        endTime: endIso,
      })

      setTasks((current) =>
        current.map((task) =>
          task.id === reschedulingTaskId
            ? {
                ...task,
                startTime: startIso,
                endTime: endIso,
                dueTime: new Date(startIso).toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                }),
              }
            : task
        )
      )

      setReschedulingTaskId(null)
      toast.success("Task rescheduled")
    })
  }

  const handleDelete = async (taskId: string) => {
    await runPlannerOnlyAction(async () => {
      await deletePlannerTask(taskId)
      setTasks((current) => current.filter((task) => task.id !== taskId))
      toast.success("Task deleted")
    })
  }

  const handleReorder = async (fromTaskId: string, toTaskId: string) => {
    if (fromTaskId === toTaskId) {
      return
    }

    const fromIndex = tasks.findIndex((task) => task.id === fromTaskId)
    const toIndex = tasks.findIndex((task) => task.id === toTaskId)

    if (fromIndex < 0 || toIndex < 0) {
      return
    }

    const next = reorderList(tasks, fromIndex, toIndex)
    setTasks(next)

    if (!profileId) {
      toast.message("Reorder is only persisted for planner profile tasks")
      return
    }

    await runPlannerOnlyAction(async () => {
      const datedTasks = next.filter((task) => task.startTime && task.endTime)
      if (datedTasks.length === 0) {
        return
      }

      let cursor = new Date(
        Math.min(...datedTasks.map((task) => new Date(task.startTime!).getTime()))
      )

      for (const task of datedTasks) {
        const currentStart = new Date(task.startTime!)
        const currentEnd = new Date(task.endTime!)
        const durationMs = Math.max(5 * 60 * 1000, currentEnd.getTime() - currentStart.getTime())
        const nextStart = new Date(cursor)
        const nextEnd = new Date(nextStart.getTime() + durationMs)

        await updatePlannerTask(task.id, {
          startTime: nextStart.toISOString(),
          endTime: nextEnd.toISOString(),
        })

        cursor = new Date(nextEnd)
      }

      toast.success("Task order updated")
    })
  }

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
            draggable
            onDragStart={() => setDraggingTaskId(task.id)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => {
              if (!draggingTaskId) {
                return
              }

              void handleReorder(draggingTaskId, task.id)
              setDraggingTaskId(null)
            }}
            onDragEnd={() => setDraggingTaskId(null)}
            className={cn(
              "group flex items-start gap-3 rounded-lg border p-3 transition-colors",
              task.completed && "bg-muted/50",
              draggingTaskId === task.id && "opacity-60"
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
                <DropdownMenuItem onClick={() => handleOpenEdit(task)}>Edit</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleOpenReschedule(task)}>Reschedule</DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => {
                    if (window.confirm("Delete this task?")) {
                      void handleDelete(task.id)
                    }
                  }}
                >
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}
        {tasks.length === 0 && (
          <div className="py-8 text-center text-muted-foreground">
            <p>No tasks for this date</p>
            <p className="text-sm">Click &quot;Add Task&quot; to create one</p>
          </div>
        )}
        {error && <p className="text-xs text-destructive">{error}</p>}
      </CardContent>

      <Dialog open={Boolean(editingTaskId)} onOpenChange={(open) => !open && setEditingTaskId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={editingTitle}
                onChange={(event) => setEditingTitle(event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-priority">Priority</Label>
              <Select value={editingPriority} onValueChange={(value: "high" | "medium" | "low") => setEditingPriority(value)}>
                <SelectTrigger id="edit-priority">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTaskId(null)}>Cancel</Button>
            <Button onClick={() => void handleSaveEdit()} disabled={submittingAction}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(reschedulingTaskId)} onOpenChange={(open) => !open && setReschedulingTaskId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reschedule Task</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="reschedule-start">Start</Label>
              <Input
                id="reschedule-start"
                type="datetime-local"
                value={rescheduleStart}
                onChange={(event) => setRescheduleStart(event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="reschedule-end">End</Label>
              <Input
                id="reschedule-end"
                type="datetime-local"
                value={rescheduleEnd}
                onChange={(event) => setRescheduleEnd(event.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReschedulingTaskId(null)}>Cancel</Button>
            <Button onClick={() => void handleSaveReschedule()} disabled={submittingAction}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
