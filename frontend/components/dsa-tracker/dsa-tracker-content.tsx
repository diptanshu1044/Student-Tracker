"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ProblemFilters } from "./problem-filters"
import { ProblemsTable } from "./problems-table"
import { ActivityHeatmap } from "./activity-heatmap"
import { WeakTopics } from "./weak-topics"
import { AddProblemDialog } from "./add-problem-dialog"
import { useDsaStats } from "@/hooks/use-dsa-tracker"

export function DSATrackerContent() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const { data: stats } = useDsaStats()
  const [filters, setFilters] = useState({
    search: "",
    difficulty: "all",
    topic: "all",
    status: "all",
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            DSA Tracker
          </h1>
          <p className="text-muted-foreground">
            Track your problem-solving progress and identify weak areas.
          </p>
          <p className="text-xs text-muted-foreground">
            {stats?.totalSolved ?? 0} solved, {stats?.totalAttempted ?? 0} attempted, streak {stats?.currentStreak ?? 0}
          </p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="size-4" />
          Add Problem
        </Button>
      </div>

      {/* Heatmap and Weak Topics */}
      <div className="grid gap-4 lg:grid-cols-3">
        <ActivityHeatmap className="lg:col-span-2" />
        <WeakTopics />
      </div>

      {/* Filters */}
      <ProblemFilters filters={filters} onFiltersChange={setFilters} />

      {/* Table */}
      <ProblemsTable filters={filters} />

      {/* Add Problem Dialog */}
      <AddProblemDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
      />
    </div>
  )
}
