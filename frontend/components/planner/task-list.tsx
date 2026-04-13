"use client"

import { useState } from "react"
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

interface Task {
  id: string
  title: string
  priority: "High" | "Medium" | "Low"
  dueTime?: string
  completed: boolean
}

const initialTasks: Task[] = [
  {
    id: "1",
    title: "Solve 3 LeetCode problems",
    priority: "High",
    dueTime: "10:00 AM",
    completed: false,
  },
  {
    id: "2",
    title: "Review Binary Trees notes",
    priority: "Medium",
    dueTime: "2:00 PM",
    completed: false,
  },
  {
    id: "3",
    title: "Watch system design video",
    priority: "Low",
    dueTime: "4:00 PM",
    completed: true,
  },
  {
    id: "4",
    title: "Update resume with new project",
    priority: "High",
    dueTime: "6:00 PM",
    completed: false,
  },
]

interface TaskListProps {
  selectedDate: Date
}

export function TaskList({ selectedDate }: TaskListProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)

  const toggleTask = (taskId: string) => {
    setTasks(
      tasks.map((task) =>
        task.id === taskId ? { ...task, completed: !task.completed } : task
      )
    )
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

  const completedCount = tasks.filter((t) => t.completed).length

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
              onCheckedChange={() => toggleTask(task.id)}
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
      </CardContent>
    </Card>
  )
}
