"use client"

import { useState } from "react"
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

const initialColumns: Column[] = [
  {
    id: "applied",
    title: "Applied",
    color: "bg-primary",
    applications: [
      {
        id: "1",
        company: "Google",
        role: "Software Engineer Intern",
        date: "Apr 10, 2026",
        notes: "Referred by alumni",
      },
      {
        id: "2",
        company: "Meta",
        role: "Frontend Engineer",
        date: "Apr 8, 2026",
      },
      {
        id: "3",
        company: "Amazon",
        role: "SDE Intern",
        date: "Apr 5, 2026",
        notes: "Applied through portal",
      },
    ],
  },
  {
    id: "oa",
    title: "Online Assessment",
    color: "bg-chart-2",
    applications: [
      {
        id: "4",
        company: "Microsoft",
        role: "Software Engineer",
        date: "Apr 3, 2026",
        notes: "OA scheduled for Apr 15",
      },
      {
        id: "5",
        company: "Apple",
        role: "iOS Developer Intern",
        date: "Apr 1, 2026",
      },
    ],
  },
  {
    id: "interview",
    title: "Interview",
    color: "bg-chart-4",
    applications: [
      {
        id: "6",
        company: "Netflix",
        role: "Full Stack Engineer",
        date: "Mar 28, 2026",
        notes: "Phone screen completed, on-site next week",
      },
      {
        id: "7",
        company: "Stripe",
        role: "Backend Engineer",
        date: "Mar 25, 2026",
      },
    ],
  },
  {
    id: "offer",
    title: "Offer",
    color: "bg-chart-3",
    applications: [
      {
        id: "8",
        company: "Vercel",
        role: "Software Engineer",
        date: "Mar 20, 2026",
        notes: "Offer received! $150k base",
      },
    ],
  },
]

export function KanbanBoard() {
  const [columns, setColumns] = useState<Column[]>(initialColumns)
  const [draggedApp, setDraggedApp] = useState<{ app: Application; fromColumnId: string } | null>(null)

  const handleDragStart = (app: Application, columnId: string) => {
    setDraggedApp({ app, fromColumnId: columnId })
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (toColumnId: string) => {
    if (!draggedApp || draggedApp.fromColumnId === toColumnId) {
      setDraggedApp(null)
      return
    }

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

    setDraggedApp(null)
  }

  return (
    <ScrollArea className="w-full whitespace-nowrap rounded-lg">
      <div className="flex gap-4 pb-4">
        {columns.map((column) => (
          <div
            key={column.id}
            className="w-[300px] shrink-0"
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(column.id)}
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
