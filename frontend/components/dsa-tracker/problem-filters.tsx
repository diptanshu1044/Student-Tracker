"use client"

import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface ProblemFiltersProps {
  filters: {
    difficulty: string
    topic: string
    status: string
  }
  onFiltersChange: (filters: { difficulty: string; topic: string; status: string }) => void
}

export function ProblemFilters({ filters, onFiltersChange }: ProblemFiltersProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search problems..."
          className="pl-9"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Select
          value={filters.difficulty}
          onValueChange={(value) =>
            onFiltersChange({ ...filters, difficulty: value })
          }
        >
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Difficulty" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Difficulty</SelectItem>
            <SelectItem value="easy">Easy</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="hard">Hard</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.topic}
          onValueChange={(value) =>
            onFiltersChange({ ...filters, topic: value })
          }
        >
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Topic" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Topics</SelectItem>
            <SelectItem value="arrays">Arrays</SelectItem>
            <SelectItem value="strings">Strings</SelectItem>
            <SelectItem value="trees">Trees</SelectItem>
            <SelectItem value="graphs">Graphs</SelectItem>
            <SelectItem value="dp">Dynamic Programming</SelectItem>
            <SelectItem value="recursion">Recursion</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.status}
          onValueChange={(value) =>
            onFiltersChange({ ...filters, status: value })
          }
        >
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="solved">Solved</SelectItem>
            <SelectItem value="attempted">Attempted</SelectItem>
            <SelectItem value="todo">To Do</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
