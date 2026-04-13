"use client"

import { useEffect, useMemo, useState } from "react"
import { ExternalLink, MoreHorizontal } from "lucide-react"
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
import { getUserProblems, type UserProblemRecord } from "@/lib/api"

interface DisplayProblem {
  id: string
  name: string
  difficulty: "Easy" | "Medium" | "Hard"
  topic: string
  status: "Solved" | "Attempted"
  date: string
}

interface ProblemsTableProps {
  filters: {
    difficulty: string
    topic: string
    status: string
  }
  refreshToken: number
}

export function ProblemsTable({ filters, refreshToken }: ProblemsTableProps) {
  const [records, setRecords] = useState<UserProblemRecord[]>([])

  useEffect(() => {
    let mounted = true

    const load = async () => {
      try {
        const response = await getUserProblems({ page: 1, limit: 500 })
        if (mounted) {
          setRecords(response.items)
        }
      } catch {
        if (mounted) {
          setRecords([])
        }
      }
    }

    void load()

    return () => {
      mounted = false
    }
  }, [refreshToken])

  const problems = useMemo<DisplayProblem[]>(
    () =>
      records.map((record) => ({
        id: record._id,
        name: record.problemId?.title ?? "Untitled Problem",
        difficulty:
          record.problemId?.difficulty === "easy"
            ? "Easy"
            : record.problemId?.difficulty === "hard"
              ? "Hard"
              : "Medium",
        topic: record.problemId?.topic ?? "General",
        status: record.status === "solved" ? "Solved" : "Attempted",
        date: record.updatedAt,
      })),
    [records]
  )

  const filteredProblems = problems.filter((problem) => {
    if (filters.difficulty !== "all" && problem.difficulty.toLowerCase() !== filters.difficulty) {
      return false
    }
    if (filters.status !== "all" && problem.status.toLowerCase().replace(" ", "") !== filters.status) {
      return false
    }
    return true
  })

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
      case "To Do":
        return "bg-muted text-muted-foreground hover:bg-muted/80"
      default:
        return "bg-muted text-muted-foreground"
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
            {filteredProblems.map((problem) => (
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
                      <DropdownMenuItem>Edit</DropdownMenuItem>
                      <DropdownMenuItem>Mark as Solved</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  )
}
