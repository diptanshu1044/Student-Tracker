"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import {
  createResume,
  deleteResume,
  getResumeFileUrl,
  getResumes,
  setDefaultResume,
  type ResumeRecord,
} from "@/lib/api"

interface ResumeGridProps {
  refreshToken: number
  onCreateResume: () => void
  onResumeChanged: () => void
}

export function ResumeGrid({ refreshToken, onCreateResume, onResumeChanged }: ResumeGridProps) {
  const [resumes, setResumes] = useState<ResumeRecord[]>([])
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
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

  const handleDuplicate = async (resume: ResumeRecord) => {
    setActionLoadingId(resume._id)

    try {
      const duplicatedName = `${resume.name} Copy`

      await createResume({
        name: duplicatedName,
        content: resume.content,
        fileUrl: resume.fileUrl,
        tags: resume.tags,
      })

      toast.success("Resume duplicated")
      onResumeChanged()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to duplicate resume")
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleExport = async (resume: ResumeRecord) => {
    setActionLoadingId(resume._id)

    try {
      if (resume.fileUrl) {
        const response = await getResumeFileUrl(resume._id)
        window.open(response.url, "_blank", "noopener,noreferrer")
        return
      }

      const source =
        typeof resume.content === "string"
          ? resume.content
          : JSON.stringify(resume.content ?? {}, null, 2)

      const extension = typeof resume.content === "string" ? "tex" : "json"
      const safeName = resume.name.trim().replace(/[^a-zA-Z0-9._-]/g, "-") || "resume"

      const blob = new Blob([source], { type: "text/plain;charset=utf-8" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `${safeName}.${extension}`
      link.click()
      URL.revokeObjectURL(url)

      toast.success("Source exported")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to export resume")
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleSetPrimary = async (resumeId: string) => {
    setActionLoadingId(resumeId)

    try {
      await setDefaultResume(resumeId)
      toast.success("Primary resume updated")
      onResumeChanged()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to set primary resume")
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleDelete = async (resumeId: string) => {
    setActionLoadingId(resumeId)

    try {
      await deleteResume(resumeId)
      toast.success("Resume deleted")
      onResumeChanged()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete resume")
    } finally {
      setActionLoadingId(null)
    }
  }

  const pendingDeleteName =
    resumes.find((resume) => resume._id === pendingDeleteId)?.name ?? "this resume"

  return (
    <>
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
                    disabled={actionLoadingId === resume._id}
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
                  <DropdownMenuItem onClick={() => void handleDuplicate(resume)}>
                    <Copy className="mr-2 size-4" />
                    Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => void handleExport(resume)}>
                    <Download className="mr-2 size-4" />
                    Export PDF
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => void handleSetPrimary(resume._id)}>
                    <Star className="mr-2 size-4" />
                    Set as Primary
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive" onClick={() => setPendingDeleteId(resume._id)}>
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

      <AlertDialog open={Boolean(pendingDeleteId)} onOpenChange={(open) => !open && setPendingDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Resume?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDeleteName} will be permanently deleted. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingDeleteId) {
                  void handleDelete(pendingDeleteId)
                }
                setPendingDeleteId(null)
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
