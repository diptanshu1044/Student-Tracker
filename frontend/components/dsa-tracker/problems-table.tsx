"use client"

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

const problems = [
  {
    id: 1,
    name: "Two Sum",
    difficulty: "Easy",
    topic: "Arrays",
    status: "Solved",
    date: "2024-01-15",
    link: "https://leetcode.com/problems/two-sum",
  },
  {
    id: 2,
    name: "Add Two Numbers",
    difficulty: "Medium",
    topic: "Linked Lists",
    status: "Solved",
    date: "2024-01-14",
    link: "https://leetcode.com/problems/add-two-numbers",
  },
  {
    id: 3,
    name: "Longest Substring Without Repeating Characters",
    difficulty: "Medium",
    topic: "Strings",
    status: "Attempted",
    date: "2024-01-13",
    link: "https://leetcode.com/problems/longest-substring-without-repeating-characters",
  },
  {
    id: 4,
    name: "Median of Two Sorted Arrays",
    difficulty: "Hard",
    topic: "Arrays",
    status: "To Do",
    date: "2024-01-12",
    link: "https://leetcode.com/problems/median-of-two-sorted-arrays",
  },
  {
    id: 5,
    name: "Longest Palindromic Substring",
    difficulty: "Medium",
    topic: "Dynamic Programming",
    status: "Solved",
    date: "2024-01-11",
    link: "https://leetcode.com/problems/longest-palindromic-substring",
  },
  {
    id: 6,
    name: "Container With Most Water",
    difficulty: "Medium",
    topic: "Arrays",
    status: "Solved",
    date: "2024-01-10",
    link: "https://leetcode.com/problems/container-with-most-water",
  },
  {
    id: 7,
    name: "Binary Tree Level Order Traversal",
    difficulty: "Medium",
    topic: "Trees",
    status: "Solved",
    date: "2024-01-09",
    link: "https://leetcode.com/problems/binary-tree-level-order-traversal",
  },
  {
    id: 8,
    name: "Word Search II",
    difficulty: "Hard",
    topic: "Tries",
    status: "Attempted",
    date: "2024-01-08",
    link: "https://leetcode.com/problems/word-search-ii",
  },
]

interface ProblemsTableProps {
  filters: {
    difficulty: string
    topic: string
    status: string
  }
}

export function ProblemsTable({ filters }: ProblemsTableProps) {
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
              <TableHead className="w-[300px]">Problem</TableHead>
              <TableHead>Difficulty</TableHead>
              <TableHead>Topic</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProblems.map((problem) => (
              <TableRow key={problem.id}>
                <TableCell>
                  <a
                    href={problem.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 font-medium hover:text-primary transition-colors"
                  >
                    {problem.name}
                    <ExternalLink className="size-3 text-muted-foreground" />
                  </a>
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
