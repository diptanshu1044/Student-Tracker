"use client"

import { useEffect, useMemo, useState } from "react"
import { ExternalLink, MoreHorizontal } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  useDeleteDsaProblemLog,
  useDsaProblems,
  useUpdateDsaProblemLog,
} from "@/hooks/use-dsa-tracker"

interface DisplayProblem {
  id: string
  name: string
  difficulty: "Easy" | "Medium" | "Hard"
  topic: string
  status: "Solved" | "Attempted" | "Revision"
  date: string
}

interface ProblemsTableProps {
  filters: {
    search: string
    difficulty: string
    topic: string
    status: string
  }
}

function mapStatus(status: string): DisplayProblem["status"] {
  if (status === "solved") return "Solved"
  if (status === "attempted") return "Attempted"
  return "Revision"
}

export function ProblemsTable({ filters }: ProblemsTableProps) {
  const [page, setPage] = useState(1)
  const limit = 20
  const [debouncedSearch, setDebouncedSearch] = useState(filters.search)
  const updateMutation = useUpdateDsaProblemLog()
  const deleteMutation = useDeleteDsaProblemLog()

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(filters.search)
      setPage(1)
    }, 300)

    return () => window.clearTimeout(timer)
  }, [filters.search])

  useEffect(() => {
    setPage(1)
  }, [filters.difficulty, filters.topic, filters.status])

  const { data, isLoading } = useDsaProblems({
    page,
    limit,
    difficulty: filters.difficulty,
    topic: filters.topic,
    status: filters.status,
    search: debouncedSearch,
  })

  const problems = useMemo<DisplayProblem[]>(
    () =>
      (data?.items ?? []).map((record) => ({
        id: record._id,
        name: record.problemId?.title ?? "Untitled Problem",
        difficulty:
          record.problemId?.difficulty === "easy"
            ? "Easy"
            : record.problemId?.difficulty === "hard"
              ? "Hard"
              : "Medium",
        topic: record.problemId?.topic ?? "General",
        status: mapStatus(record.status),
        date: record.date ?? record.updatedAt,
      })),
    [data?.items]
  )

  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / limit))

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [page, totalPages])

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Easy":
        return "bg-chart-3/10 text-chart-3 hover:bg-chart-3/20"
      case "Medium":
        return "bg-chart-4/10 text-chart-4 hover:bg-chart-4/20"
      case "Hard":
        return "bg-chart-5/10 text-chart-5 hover:bg-chart-5/20"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Solved":
        return "bg-chart-3/10 text-chart-3 hover:bg-chart-3/20"
      case "Attempted":
        return "bg-chart-4/10 text-chart-4 hover:bg-chart-4/20"
      case "Revision":
        return "bg-chart-5/10 text-chart-5 hover:bg-chart-5/20"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  const handleMarkSolved = async (id: string) => {
    try {
      await updateMutation.mutateAsync({ id, input: { status: "solved", date: new Date().toISOString() } })
      toast.success("Updated to solved")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update")
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id)
      toast.success("Problem log deleted")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete")
    }
  }

  return (
    <Card>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-75">Problem</TableHead>
              <TableHead>Difficulty</TableHead>
              <TableHead>Topic</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="w-12.5"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {problems.map((problem) => (
              <TableRow key={problem.id}>
                <TableCell>
                  <div className="flex items-center gap-2 font-medium">
                    {problem.name}
                    <ExternalLink className="size-3 text-muted-foreground" />
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="secondary"
                    className={getDifficultyColor(problem.difficulty)}
                  >
                    {problem.difficulty}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {problem.topic}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="secondary"
                    className={getStatusColor(problem.status)}
                  >
                    {problem.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(problem.date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-8">
                        <MoreHorizontal className="size-4" />
                        <span className="sr-only">Actions</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => void handleMarkSolved(problem.id)}>
                        Mark as Solved
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={() => void handleDelete(problem.id)}>
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
            {!isLoading && problems.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  No problems found for the selected filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-muted-foreground">
        <span>
          Page {page} of {totalPages} ({data?.total ?? 0} total)
        </span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((value) => value + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </Card>
  )
}
