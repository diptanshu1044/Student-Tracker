"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createPlannerTask, createTask } from "@/lib/api"
import { toast } from "sonner"

type SchedulingMode = "single" | "range" | "selective"

interface AddTaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedDate: Date
  onTaskCreated: () => void
  profileId?: string
}

export function AddTaskDialog({
  open,
  onOpenChange,
  selectedDate,
  onTaskCreated,
  profileId,
}: AddTaskDialogProps) {
  const [title, setTitle] = useState("")
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium")
  const [type, setType] = useState<"dsa" | "job" | "study">("study")
  const [time, setTime] = useState("")
  const [schedulingMode, setSchedulingMode] = useState<SchedulingMode>("single")
  const [rangeStart, setRangeStart] = useState(selectedDate.toISOString().slice(0, 10))
  const [rangeEnd, setRangeEnd] = useState(selectedDate.toISOString().slice(0, 10))
  const [selectedDates, setSelectedDates] = useState<string[]>([selectedDate.toISOString().slice(0, 10)])
  const [draftDate, setDraftDate] = useState(selectedDate.toISOString().slice(0, 10))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const buildDate = (dateString: string) => {
    const date = new Date(`${dateString}T00:00:00`)
    if (time) {
      const [hours, minutes] = time.split(":").map(Number)
      date.setHours(hours, minutes, 0, 0)
    } else {
      date.setHours(9, 0, 0, 0)
    }
    return date
  }

  const uniqueDates = (dates: string[]) => Array.from(new Set(dates)).sort()

  const addDraftDate = () => {
    if (!draftDate) {
      return
    }

    setSelectedDates((current) => uniqueDates([...current, draftDate]))
    setDraftDate("")
  }

  const handleSubmit = async () => {
    if (!title.trim()) {
      const message = "Task title is required"
      setError(message)
      toast.error(message)
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      let datesToCreate: string[] = []

      if (schedulingMode === "single") {
        datesToCreate = [selectedDate.toISOString().slice(0, 10)]
      }

      if (schedulingMode === "range") {
        const current = new Date(`${rangeStart}T00:00:00`)
        const end = new Date(`${rangeEnd}T00:00:00`)

        if (Number.isNaN(current.getTime()) || Number.isNaN(end.getTime()) || current > end) {
          throw new Error("Select a valid date range")
        }

        while (current <= end) {
          datesToCreate.push(current.toISOString().slice(0, 10))
          current.setDate(current.getDate() + 1)
        }
      }

      if (schedulingMode === "selective") {
        datesToCreate = uniqueDates(selectedDates)
      }

      if (datesToCreate.length === 0) {
        throw new Error("Add at least one date")
      }

      for (const dateString of datesToCreate) {
        const startDate = buildDate(dateString)
        const endDate = new Date(startDate.getTime() + 60 * 60 * 1000)

        if (profileId) {
          await createPlannerTask({
            profileId,
            title: title.trim(),
            description: `${type.toUpperCase()} task`,
            startTime: startDate.toISOString(),
            endTime: endDate.toISOString(),
            priority,
          })
          continue
        }

        await createTask({
          title: title.trim(),
          type,
          priority,
          dueDate: startDate.toISOString(),
        })
      }

      setTitle("")
      setTime("")
      setSchedulingMode("single")
      setRangeStart(selectedDate.toISOString().slice(0, 10))
      setRangeEnd(selectedDate.toISOString().slice(0, 10))
      setSelectedDates([selectedDate.toISOString().slice(0, 10)])
      onTaskCreated()
      onOpenChange(false)
      toast.success("Task added successfully")
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Failed to create task"
      setError(message)
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-106.25">
        <DialogHeader>
          <DialogTitle>Add Task</DialogTitle>
          <DialogDescription>
            Create a new task for{" "}
            {selectedDate.toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Task Title</Label>
            <Input
              id="title"
              placeholder="e.g., Solve LeetCode problems"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={priority}
                onValueChange={(value: "low" | "medium" | "high") => setPriority(value)}
              >
                <SelectTrigger id="priority">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="time">Due Time</Label>
              <Input
                id="time"
                type="time"
                value={time}
                onChange={(event) => setTime(event.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Schedule Type</Label>
            <Select
              value={schedulingMode}
              onValueChange={(value: SchedulingMode) => setSchedulingMode(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select schedule type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single">Single date</SelectItem>
                <SelectItem value="range">Date range</SelectItem>
                <SelectItem value="selective">Selective dates</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {schedulingMode === "range" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="range-start">Start Date</Label>
                <Input
                  id="range-start"
                  type="date"
                  value={rangeStart}
                  onChange={(event) => setRangeStart(event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="range-end">End Date</Label>
                <Input
                  id="range-end"
                  type="date"
                  value={rangeEnd}
                  onChange={(event) => setRangeEnd(event.target.value)}
                />
              </div>
            </div>
          )}
          {schedulingMode === "selective" && (
            <div className="grid gap-3 rounded-lg border p-3">
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <Input
                  type="date"
                  value={draftDate}
                  onChange={(event) => setDraftDate(event.target.value)}
                />
                <Button type="button" variant="outline" onClick={addDraftDate}>
                  Add Date
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedDates.map((date) => (
                  <Button
                    key={date}
                    type="button"
                    variant="secondary"
                    className="h-8"
                    onClick={() => setSelectedDates((current) => current.filter((item) => item !== date))}
                  >
                    {date}
                  </Button>
                ))}
              </div>
            </div>
          )}
          <div className="grid gap-2">
            <Label htmlFor="category">Category</Label>
            <Select
              value={type}
              onValueChange={(value: "dsa" | "job" | "study") => setType(value)}
            >
              <SelectTrigger id="category">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dsa">DSA Practice</SelectItem>
                <SelectItem value="study">Study</SelectItem>
                <SelectItem value="job">Job Application</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={submitting}>
            {submitting ? "Adding..." : "Add Task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
