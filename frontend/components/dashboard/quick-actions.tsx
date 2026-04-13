"use client"

import Link from "next/link"
import { Plus, Play, FileEdit, Briefcase } from "lucide-react"
import { Button } from "@/components/ui/button"

export function QuickActions() {
  return (
    <div className="flex flex-wrap gap-2">
      <Button asChild>
        <Link href="/dsa-tracker">
          <Plus className="size-4" />
          Log Problem
        </Link>
      </Button>
      <Button variant="secondary" asChild>
        <Link href="/planner">
          <Play className="size-4" />
          Start Session
        </Link>
      </Button>
      <Button variant="outline" asChild>
        <Link href="/resume">
          <FileEdit className="size-4" />
          Edit Resume
        </Link>
      </Button>
      <Button variant="outline" asChild>
        <Link href="/applications">
          <Briefcase className="size-4" />
          Add Application
        </Link>
      </Button>
    </div>
  )
}
