"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { KanbanBoard } from "./kanban-board"
import { AddApplicationDialog } from "./add-application-dialog"
import { ApplicationStats } from "./application-stats"

export function ApplicationsContent() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)

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
      <ApplicationStats />

      {/* Kanban Board */}
      <KanbanBoard />

      {/* Add Application Dialog */}
      <AddApplicationDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
      />
    </div>
  )
}
