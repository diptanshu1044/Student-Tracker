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

interface Application {
  id: string
  company: string
  role: string
  date: string
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
  { id: "applied", title: "Applied", color: "bg-primary", applications: [] },
  { id: "interview", title: "Interview", color: "bg-chart-4", applications: [] },
  { id: "offer", title: "Offer", color: "bg-chart-3", applications: [] },
  { id: "rejected", title: "Rejected", color: "bg-chart-5", applications: [] },
]

interface KanbanBoardProps {
  refreshToken: number
}

function toColumnItem(record: ApplicationRecord): Application {
  return {
    id: record._id,
    company: record.company,
    role: record.role,
    date: new Date(record.appliedDate ?? record.createdAt).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    notes: record.notes[0],
  }
}

export function KanbanBoard({ refreshToken }: KanbanBoardProps) {
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
        toColumnId as "applied" | "interview" | "rejected" | "offer"
      )
    } catch {
      setColumns(previousColumns)
    }

    setDraggedApp(null)
  }

  const visibleColumns = useMemo(() => columns, [columns])

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
                              {app.date}
                            </div>
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
                            <DropdownMenuItem>Edit</DropdownMenuItem>
                            <DropdownMenuItem>Add Notes</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">
                              Delete
                            </DropdownMenuItem>
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
