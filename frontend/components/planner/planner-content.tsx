"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { WeeklyCalendar } from "./weekly-calendar"
import { TaskList } from "./task-list"
import { AddTaskDialog } from "./add-task-dialog"

export function PlannerContent() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [refreshToken, setRefreshToken] = useState(0)

  const refreshTasks = () => {
    setRefreshToken((value) => value + 1)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            Planner
          </h1>
          <p className="text-muted-foreground">
            Plan your study sessions and track your daily tasks.
          </p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="size-4" />
          Add Task
        </Button>
      </div>

      {/* Calendar and Tasks */}
      <div className="grid gap-6 lg:grid-cols-3">
        <WeeklyCalendar
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          className="lg:col-span-2"
        />
        <TaskList selectedDate={selectedDate} refreshToken={refreshToken} />
      </div>

      {/* Add Task Dialog */}
      <AddTaskDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        selectedDate={selectedDate}
        onTaskCreated={refreshTasks}
      />
    </div>
  )
}
