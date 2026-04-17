"use client"

import { useEffect, useMemo, useState } from "react"
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
import { usePlannerMutations, usePlannerProfiles, useGlobalPlanner, usePlannerTasks } from "@/hooks/use-planner"
import { getAuthUser, getGooglePlannerConnectUrl } from "@/lib/api"
import { toast } from "sonner"
import { WeeklyCalendar } from "./weekly-calendar"
import { TaskList } from "./task-list"
import { AddTaskDialog } from "./add-task-dialog"

type PlannerViewMode = "day" | "week" | "month"

const GOOGLE_PENDING_SYNC_KEY = "studentos_planner_pending_google_sync"

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

function getRangeForView(date: Date, view: PlannerViewMode) {
  if (view === "day") {
    return { startDate: startOfDay(date), endDate: endOfDay(date) }
  }

  if (view === "month") {
    return { startDate: startOfMonth(date), endDate: endOfMonth(date) }
  }

  return { startDate: startOfWeek(date), endDate: endOfWeek(date) }
}

function toIso(date: Date) {
  return date.toISOString()
}

export function PlannerContent() {
  const searchParams = useSearchParams()
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<PlannerViewMode>("week")
  const [refreshToken, setRefreshToken] = useState(0)
  const [selectedProfileId, setSelectedProfileId] = useState<string | undefined>(undefined)
  const [lastImportResult, setLastImportResult] = useState<string | null>(null)
  const [isCreateProfileDialogOpen, setIsCreateProfileDialogOpen] = useState(false)
  const [newProfileName, setNewProfileName] = useState("Study Planner")
  const [isCreatingProfile, setIsCreatingProfile] = useState(false)
  const [isGoogleConnected, setIsGoogleConnected] = useState(() => Boolean(getAuthUser()?.googleCalendarConnected))
  const [pendingGoogleSync, setPendingGoogleSync] = useState<string | null>(null)

  const { data: profiles } = usePlannerProfiles()
  const currentRange = useMemo(() => getRangeForView(selectedDate, viewMode), [selectedDate, viewMode])
  const plannerQuery = {
    page: 1,
    limit: 500,
    startDate: toIso(currentRange.startDate),
    endDate: toIso(currentRange.endDate),
  }
  const { data: globalPlanner } = useGlobalPlanner(selectedProfileId ? undefined : plannerQuery)
  const { data: scopedPlanner } = usePlannerTasks(selectedProfileId, selectedProfileId ? plannerQuery : undefined)
  const plannerMutations = usePlannerMutations()
  const visiblePlannerItems = selectedProfileId ? scopedPlanner?.items ?? [] : globalPlanner?.items ?? []

  useEffect(() => {
    const google = searchParams.get("google")
    if (google === "connected") {
      toast.success("Google Calendar connected")
      setIsGoogleConnected(true)
      const pending = window.sessionStorage.getItem(GOOGLE_PENDING_SYNC_KEY)
      if (pending) {
        setPendingGoogleSync(pending)
        window.sessionStorage.removeItem(GOOGLE_PENDING_SYNC_KEY)
      }
      return
    }

    if (google === "error") {
      toast.error("Google Calendar connection failed")
    }
  }, [searchParams])

  useEffect(() => {
    if (!profiles || profiles.length === 0) {
      return
    }

    if (!selectedProfileId) {
      setSelectedProfileId(profiles[0]._id)
      return
    }

    const profileExists = profiles.some((profile) => profile._id === selectedProfileId)
    if (!profileExists) {
      setSelectedProfileId(profiles[0]._id)
    }
  }, [profiles, selectedProfileId])

  useEffect(() => {
    if (!pendingGoogleSync || !isGoogleConnected) {
      return
    }

    const runSync = async () => {
      try {
        const payload = pendingGoogleSync ? JSON.parse(pendingGoogleSync) as { profileId?: string } : {}
        const result = await plannerMutations.syncGoogle.mutateAsync(payload.profileId)

        if (result.syncedCount === 0) {
          toast.message("No pending tasks were synced")
        } else {
          toast.success(`Synced ${result.syncedCount} of ${result.total} tasks to Google Calendar`)
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to sync Google Calendar"
        toast.error(message)
      } finally {
        setPendingGoogleSync(null)
      }
    }

    void runSync()
  }, [pendingGoogleSync, isGoogleConnected, plannerMutations.syncGoogle])

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
    if (!isGoogleConnected) {
      const pendingSync = JSON.stringify({ profileId: selectedProfileId })
      window.sessionStorage.setItem(GOOGLE_PENDING_SYNC_KEY, pendingSync)
      setPendingGoogleSync(pendingSync)

      try {
        const { url } = await getGooglePlannerConnectUrl()
        window.location.assign(url)
      } catch (error) {
        window.sessionStorage.removeItem(GOOGLE_PENDING_SYNC_KEY)
        setPendingGoogleSync(null)
        const message = error instanceof Error ? error.message : "Failed to start Google connection"
        toast.error(message)
      }

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

      <div className="grid gap-3 md:grid-cols-5">
        <Select value={viewMode} onValueChange={(value: PlannerViewMode) => setViewMode(value)}>
          <SelectTrigger>
            <SelectValue placeholder="View" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="day">Daily</SelectItem>
            <SelectItem value="week">Weekly</SelectItem>
            <SelectItem value="month">Monthly</SelectItem>
          </SelectContent>
        </Select>
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
          {isGoogleConnected ? "Sync Google Calendar" : "Connect Google & Sync"}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span>Visible tasks: {visiblePlannerItems.length}</span>
        {lastImportResult ? <span>{lastImportResult}</span> : null}
      </div>

      {/* Calendar and Tasks */}
      <div className="grid gap-6 lg:grid-cols-3">
        <WeeklyCalendar
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          viewMode={viewMode}
          profileId={selectedProfileId}
          refreshToken={refreshToken}
          className="lg:col-span-2"
        />
        <TaskList
          selectedDate={selectedDate}
          refreshToken={refreshToken}
          profileId={selectedProfileId}
          onTaskMutated={refreshTasks}
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
