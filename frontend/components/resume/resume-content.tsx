"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ResumeGrid } from "./resume-grid"
import { CreateResumeDialog } from "./create-resume-dialog"

export function ResumeContent() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [refreshToken, setRefreshToken] = useState(0)

  const refreshResumes = () => {
    setRefreshToken((value) => value + 1)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            Resume Manager
          </h1>
          <p className="text-muted-foreground">
            Manage multiple resume versions tailored for different roles.
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="size-4" />
          Create Resume
        </Button>
      </div>

      {/* Resume Grid */}
      <ResumeGrid refreshToken={refreshToken} />

      {/* Create Resume Dialog */}
      <CreateResumeDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onResumeCreated={refreshResumes}
      />
    </div>
  )
}
