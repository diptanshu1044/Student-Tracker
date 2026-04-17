"use client"

import { useEffect, useRef, useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { KanbanBoard } from "./kanban-board"
import { AddApplicationDialog } from "./add-application-dialog"
import { ApplicationStats } from "./application-stats"

const STATUS_OPTIONS = [
  { id: "to_apply", label: "Yet To Apply" },
  { id: "applied", label: "Applied" },
  { id: "interview", label: "Interview" },
  { id: "offer", label: "Offer" },
  { id: "rejected", label: "Rejected" },
] as const

type ApplicationStatusView = (typeof STATUS_OPTIONS)[number]["id"]

export function ApplicationsContent() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [refreshToken, setRefreshToken] = useState(0)
  const [activeStatus, setActiveStatus] = useState<ApplicationStatusView>("to_apply")
  const queuedRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const refreshApplications = () => {
    setRefreshToken((value) => value + 1)
  }

  const queueRefreshApplications = () => {
    if (queuedRefreshTimerRef.current) {
      clearTimeout(queuedRefreshTimerRef.current)
    }

    queuedRefreshTimerRef.current = setTimeout(() => {
      setRefreshToken((value) => value + 1)
      queuedRefreshTimerRef.current = null
    }, 250)
  }

  useEffect(() => {
    return () => {
      if (queuedRefreshTimerRef.current) {
        clearTimeout(queuedRefreshTimerRef.current)
      }
    }
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            Job Applications
          </h1>
          <p className="text-muted-foreground">
            Track and manage your job applications in one place.
          </p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="size-4" />
          Add Application
        </Button>
      </div>

      {/* Stats */}
      <ApplicationStats refreshToken={refreshToken} />

      <div className="flex flex-wrap gap-2">
        {STATUS_OPTIONS.map((statusOption) => (
          <Button
            key={statusOption.id}
            type="button"
            variant={activeStatus === statusOption.id ? "default" : "outline"}
            onClick={() => setActiveStatus(statusOption.id)}
          >
            {statusOption.label}
          </Button>
        ))}
      </div>

      {/* Kanban Board */}
      <KanbanBoard
        refreshToken={refreshToken}
        activeStatus={activeStatus}
        onApplicationUpdated={queueRefreshApplications}
      />

      {/* Add Application Dialog */}
      <AddApplicationDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onApplicationCreated={refreshApplications}
      />
    </div>
  )
}
