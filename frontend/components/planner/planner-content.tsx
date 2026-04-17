"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Plus } from "lucide-react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { usePlannerMutations, usePlannerProfiles, useGlobalPlanner } from "@/hooks/use-planner"
import { toast } from "sonner"
import { WeeklyCalendar } from "./weekly-calendar"
import { TaskList } from "./task-list"
import { AddTaskDialog } from "./add-task-dialog"

export function PlannerContent() {
  const searchParams = useSearchParams()
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [refreshToken, setRefreshToken] = useState(0)
  const [selectedProfileId, setSelectedProfileId] = useState<string | undefined>(undefined)
  const [lastImportResult, setLastImportResult] = useState<string | null>(null)
  const [isCreateProfileDialogOpen, setIsCreateProfileDialogOpen] = useState(false)
  const [newProfileName, setNewProfileName] = useState("Study Planner")
  const [isCreatingProfile, setIsCreatingProfile] = useState(false)

  const { data: profiles } = usePlannerProfiles()
  const { data: globalPlanner } = useGlobalPlanner({ page: 1, limit: 500 })
  const plannerMutations = usePlannerMutations()

  useEffect(() => {
    const google = searchParams.get("google")
    if (google === "connected") {
      toast.success("Google Calendar connected")
      return
    }

    if (google === "error") {
      toast.error("Google Calendar connection failed")
    }
  }, [searchParams])

  const refreshTasks = () => {
    setRefreshToken((value) => value + 1)
  }

  const createProfileQuickly = async () => {
    if (!newProfileName.trim()) {
      toast.error("Profile name is required")
      return
    }

    setIsCreatingProfile(true)

    try {
      const profile = await plannerMutations.createProfile.mutateAsync({
        name: newProfileName.trim(),
        color: "#2563eb",
      })

      setSelectedProfileId(profile._id)
      setIsCreateProfileDialogOpen(false)
      setNewProfileName("Study Planner")
      toast.success("Planner profile created")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create planner profile"
      toast.error(message)
    } finally {
      setIsCreatingProfile(false)
    }
  }

  const handleImport = async (file: File | undefined) => {
    if (!file || !selectedProfileId) {
      return
    }

    try {
      const result = await plannerMutations.uploadImport.mutateAsync({
        profileId: selectedProfileId,
        file,
      })

      setLastImportResult(
        `Imported ${result.successCount} tasks. Failed rows: ${result.failedRows.length}`
      )
      toast.success(`Imported ${result.successCount} tasks`)
      refreshTasks()
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to import tasks"
      toast.error(message)
    }
  }

  const handleGoogleSync = async () => {
    if (!selectedProfileId) {
      toast.error("Select a planner profile first")
      return
    }

    try {
      const result = await plannerMutations.syncGoogle.mutateAsync(selectedProfileId)

      if (result.syncedCount === 0) {
        toast.message("No pending tasks were synced")
        return
      }

      toast.success(`Synced ${result.syncedCount} of ${result.total} tasks to Google Calendar`)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to sync Google Calendar"
      toast.error(message)
    }
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

      <div className="grid gap-3 md:grid-cols-4">
        <Select value={selectedProfileId} onValueChange={setSelectedProfileId}>
          <SelectTrigger>
            <SelectValue placeholder="Select planner profile" />
          </SelectTrigger>
          <SelectContent>
            {(profiles ?? []).map((profile) => (
              <SelectItem key={profile._id} value={profile._id}>
                {profile.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => setIsCreateProfileDialogOpen(true)}>
          Create Profile
        </Button>
        <Input
          type="file"
          accept=".csv,.json,.xlsx"
          onChange={(event) => void handleImport(event.target.files?.[0])}
        />
        <Button
          variant="outline"
          onClick={() => void handleGoogleSync()}
        >
          Sync Google Calendar
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span>Global tasks: {globalPlanner?.total ?? 0}</span>
        {lastImportResult ? <span>{lastImportResult}</span> : null}
      </div>

      {/* Calendar and Tasks */}
      <div className="grid gap-6 lg:grid-cols-3">
        <WeeklyCalendar
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          className="lg:col-span-2"
        />
        <TaskList
          selectedDate={selectedDate}
          refreshToken={refreshToken}
          profileId={selectedProfileId}
        />
      </div>

      {/* Add Task Dialog */}
      <AddTaskDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        selectedDate={selectedDate}
        onTaskCreated={refreshTasks}
        profileId={selectedProfileId}
      />

      <Dialog open={isCreateProfileDialogOpen} onOpenChange={setIsCreateProfileDialogOpen}>
        <DialogContent className="sm:max-w-106.25">
          <DialogHeader>
            <DialogTitle>Create Planner Profile</DialogTitle>
            <DialogDescription>
              Add a profile to organize calendar sync and tasks.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-2">
            <Input
              value={newProfileName}
              onChange={(event) => setNewProfileName(event.target.value)}
              placeholder="Profile name"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateProfileDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void createProfileQuickly()} disabled={isCreatingProfile}>
              {isCreatingProfile ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
