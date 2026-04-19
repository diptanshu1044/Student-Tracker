"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Copy,
  Download,
  Edit,
  FileText,
  MoreHorizontal,
  Star,
  Trash2,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { getResumes, type ResumeRecord } from "@/lib/api"

interface ResumeGridProps {
  refreshToken: number
  onCreateResume: () => void
}

export function ResumeGrid({ refreshToken, onCreateResume }: ResumeGridProps) {
  const [resumes, setResumes] = useState<ResumeRecord[]>([])
  const router = useRouter()

  useEffect(() => {
    let mounted = true

    const load = async () => {
      try {
        const data = await getResumes()
        if (mounted) {
          setResumes(data)
        }
      } catch {
        if (mounted) {
          setResumes([])
        }
      }
    }

    void load()

    return () => {
      mounted = false
    }
  }, [refreshToken])

  const getTagColor = (tag: string) => {
    const colors: Record<string, string> = {
      "Full Stack": "bg-primary/10 text-primary",
      Frontend: "bg-chart-2/10 text-chart-2",
      Backend: "bg-chart-3/10 text-chart-3",
      React: "bg-chart-4/10 text-chart-4",
      "Node.js": "bg-chart-3/10 text-chart-3",
      Python: "bg-chart-4/10 text-chart-4",
      FAANG: "bg-chart-5/10 text-chart-5",
      "DSA Heavy": "bg-primary/10 text-primary",
      Startup: "bg-chart-2/10 text-chart-2",
      General: "bg-muted text-muted-foreground",
    }
    return colors[tag] || "bg-muted text-muted-foreground"
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {resumes.map((resume) => (
        <Card
          key={resume._id}
          className={cn(
            "group cursor-pointer transition-all hover:shadow-md",
            resume.version === 1 && "ring-2 ring-primary"
          )}
          role="button"
          tabIndex={0}
          onClick={() => router.push(`/resume/${resume._id}`)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault()
              router.push(`/resume/${resume._id}`)
            }
          }}
        >
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
            <div className="flex items-center gap-2">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                <FileText className="size-5 text-primary" />
              </div>
              {resume.version === 1 && (
                <Star className="size-4 fill-primary text-primary" />
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={(event) => event.stopPropagation()}
                >
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(event) => event.stopPropagation()}>
                <DropdownMenuItem onClick={() => router.push(`/resume/${resume._id}`)}>
                  <Edit className="mr-2 size-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Copy className="mr-2 size-4" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Download className="mr-2 size-4" />
                  Export PDF
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Star className="mr-2 size-4" />
                  Set as Primary
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive">
                  <Trash2 className="mr-2 size-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </CardHeader>
          <CardContent className="pb-2">
            <h3 className="font-semibold">{resume.name}</h3>
            <div className="mt-2 flex flex-wrap gap-1">
              {resume.tags.map((tag: string) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className={cn("text-xs", getTagColor(tag))}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </CardContent>
          <CardFooter className="pt-2">
            <p className="text-xs text-muted-foreground">
              Last updated:{" "}
              {new Date(resume.updatedAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </CardFooter>
        </Card>
      ))}

      {/* Empty state for adding new resume */}
      <Card
        className="flex min-h-50 cursor-pointer items-center justify-center border-dashed transition-colors hover:border-primary hover:bg-primary/5"
        role="button"
        tabIndex={0}
        onClick={onCreateResume}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault()
            onCreateResume()
          }
        }}
      >
        <CardContent className="flex flex-col items-center gap-2 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted">
            <FileText className="size-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">Create New Resume</p>
          <p className="text-xs text-muted-foreground">
            Start from scratch or duplicate existing
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
