"use client"

import { useEffect, useMemo, useState } from "react"
import { MoreHorizontal, GripVertical, Calendar, Building2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import {
  getApplications,
  type ApplicationRecord,
  updateApplicationStatus,
} from "@/lib/api"
import { toast } from "sonner"

interface Application {
  id: string
  company: string
  role: string
  appliedDateLabel: string
  lastDateToApplyLabel?: string
  notes?: string
  logo?: string
}

interface Column {
  id: string
  title: string
  color: string
  applications: Application[]
}

const EMPTY_COLUMNS: Column[] = [
  { id: "to_apply", title: "Yet To Apply", color: "bg-chart-1", applications: [] },
  { id: "applied", title: "Applied", color: "bg-primary", applications: [] },
  { id: "interview", title: "Interview", color: "bg-chart-4", applications: [] },
  { id: "offer", title: "Offer", color: "bg-chart-3", applications: [] },
  { id: "rejected", title: "Rejected", color: "bg-chart-5", applications: [] },
]

interface KanbanBoardProps {
  refreshToken: number
  activeStatus: "to_apply" | "applied" | "interview" | "offer" | "rejected"
  onApplicationUpdated: () => void
}

function toColumnItem(record: ApplicationRecord): Application {
  const appliedDate = new Date(record.appliedDate ?? record.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })

  return {
    id: record._id,
    company: record.company,
    role: record.role,
    appliedDateLabel: appliedDate,
    lastDateToApplyLabel: record.lastDateToApply
      ? new Date(record.lastDateToApply).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : undefined,
    notes: record.notes[0],
  }
}

export function KanbanBoard({ refreshToken, activeStatus, onApplicationUpdated }: KanbanBoardProps) {
  const [columns, setColumns] = useState<Column[]>(EMPTY_COLUMNS)
  const [draggedApp, setDraggedApp] = useState<{ app: Application; fromColumnId: string } | null>(null)

  useEffect(() => {
    let mounted = true

    const load = async () => {
      try {
        const response = await getApplications({ page: 1, limit: 300 })

        if (!mounted) {
          return
        }

        const nextColumns = EMPTY_COLUMNS.map((column) => ({ ...column, applications: [] as Application[] }))
        for (const item of response.items) {
          const target = nextColumns.find((column) => column.id === item.status)
          if (target) {
            target.applications.push(toColumnItem(item))
          }
        }

        setColumns(nextColumns)
      } catch {
        if (mounted) {
          setColumns(EMPTY_COLUMNS)
        }
      }
    }

    void load()

    return () => {
      mounted = false
    }
  }, [refreshToken])

  const handleDragStart = (app: Application, columnId: string) => {
    setDraggedApp({ app, fromColumnId: columnId })
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = async (toColumnId: string) => {
    if (!draggedApp || draggedApp.fromColumnId === toColumnId) {
      setDraggedApp(null)
      return
    }

    const previousColumns = columns

    setColumns((prevColumns) => {
      return prevColumns.map((col) => {
        if (col.id === draggedApp.fromColumnId) {
          return {
            ...col,
            applications: col.applications.filter((a) => a.id !== draggedApp.app.id),
          }
        }
        if (col.id === toColumnId) {
          return {
            ...col,
            applications: [...col.applications, draggedApp.app],
          }
        }
        return col
      })
    })

    try {
      await updateApplicationStatus(
        draggedApp.app.id,
        toColumnId as "to_apply" | "applied" | "interview" | "rejected" | "offer"
      )
      const destinationLabel = EMPTY_COLUMNS.find((column) => column.id === toColumnId)?.title ?? toColumnId
      toast.success(`Moved to ${destinationLabel}`)
      onApplicationUpdated()
    } catch {
      setColumns(previousColumns)
      toast.error("Failed to update application status")
    }

    setDraggedApp(null)
  }

  const visibleColumns = useMemo(
    () => columns.filter((column) => column.id === activeStatus),
    [columns, activeStatus]
  )

  const statusOptions = EMPTY_COLUMNS.map((column) => ({ id: column.id, title: column.title }))

  const moveApplication = async (
    applicationId: string,
    fromColumnId: string,
    nextStatus: "to_apply" | "applied" | "interview" | "offer" | "rejected"
  ) => {
    if (fromColumnId === nextStatus) {
      return
    }

    const app = columns
      .find((column) => column.id === fromColumnId)
      ?.applications.find((item) => item.id === applicationId)

    if (!app) {
      return
    }

    const previousColumns = columns

    setColumns((prevColumns) => {
      return prevColumns.map((col) => {
        if (col.id === fromColumnId) {
          return {
            ...col,
            applications: col.applications.filter((a) => a.id !== applicationId),
          }
        }

        if (col.id === nextStatus) {
          return {
            ...col,
            applications: [...col.applications, app],
          }
        }

        return col
      })
    })

    try {
      await updateApplicationStatus(applicationId, nextStatus)
      toast.success(`Moved to ${statusOptions.find((option) => option.id === nextStatus)?.title ?? nextStatus}`)
      onApplicationUpdated()
    } catch {
      setColumns(previousColumns)
      toast.error("Failed to update application status")
    }
  }

  return (
    <ScrollArea className="w-full whitespace-nowrap rounded-lg">
      <div className="flex gap-4 pb-4">
        {visibleColumns.map((column) => (
          <div
            key={column.id}
            className="w-75 shrink-0"
            onDragOver={handleDragOver}
            onDrop={() => void handleDrop(column.id)}
          >
            <Card className="bg-muted/30">
              <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-3">
                <div className={cn("size-3 rounded-full", column.color)} />
                <CardTitle className="text-sm font-semibold">
                  {column.title}
                </CardTitle>
                <Badge variant="secondary" className="ml-auto">
                  {column.applications.length}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                {column.applications.map((app) => (
                  <Card
                    key={app.id}
                    draggable
                    onDragStart={() => handleDragStart(app, column.id)}
                    className={cn(
                      "cursor-grab bg-card transition-all hover:shadow-md active:cursor-grabbing",
                      draggedApp?.app.id === app.id && "opacity-50"
                    )}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-3">
                          <GripVertical className="mt-0.5 size-4 text-muted-foreground" />
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Building2 className="size-4 text-muted-foreground" />
                              <p className="font-semibold">{app.company}</p>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {app.role}
                            </p>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Calendar className="size-3" />
                              {column.id === "to_apply"
                                ? `Added ${app.appliedDateLabel}`
                                : `Applied ${app.appliedDateLabel}`}
                            </div>
                            {column.id === "to_apply" && app.lastDateToApplyLabel && (
                              <div className="flex items-center gap-1 text-xs text-chart-5">
                                <Calendar className="size-3" />
                                Last Date To Apply: {app.lastDateToApplyLabel}
                              </div>
                            )}
                            {app.notes && (
                              <p className="text-xs text-muted-foreground italic mt-2 whitespace-normal">
                                {app.notes}
                              </p>
                            )}
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8 shrink-0">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {statusOptions
                              .filter((option) => option.id !== column.id)
                              .map((option) => (
                                <DropdownMenuItem
                                  key={option.id}
                                  onClick={() =>
                                    void moveApplication(
                                      app.id,
                                      column.id,
                                      option.id as "to_apply" | "applied" | "interview" | "offer" | "rejected"
                                    )
                                  }
                                >
                                  Move to {option.title}
                                </DropdownMenuItem>
                              ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {column.applications.length === 0 && (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    Drop applications here
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  )
}
