"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { createResume, uploadResume } from "@/lib/api"

interface CreateResumeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onResumeCreated: () => void
}

const DEFAULT_LATEX = `\\documentclass{resume}
\\begin{document}
\\name{Your Name}
\\section{Experience}
Add your experience here.
\\section{Projects}
Add your projects here.
\\section{Skills}
Add your skills here.
\\end{document}`

export function CreateResumeDialog({
  open,
  onOpenChange,
  onResumeCreated,
}: CreateResumeDialogProps) {
  const [mode, setMode] = useState<"latex" | "upload">("latex")
  const [name, setName] = useState("")
  const [rolesInput, setRolesInput] = useState("")
  const [latexSource, setLatexSource] = useState(DEFAULT_LATEX)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const parseRoles = () =>
    Array.from(
      new Set(
        rolesInput
          .split(",")
          .map((role) => role.trim().toLowerCase())
          .filter(Boolean)
      )
    )

  const resetForm = () => {
    setMode("latex")
    setName("")
    setRolesInput("")
    setLatexSource(DEFAULT_LATEX)
    setSelectedFile(null)
    setError(null)
    setSubmitting(false)
  }

  const handleSubmit = async () => {
    if (!name.trim()) {
      const message = "Resume name is required"
      setError(message)
      toast.error(message)
      return
    }

    if (mode === "upload" && !selectedFile) {
      const message = "Please choose a PDF or DOCX file"
      setError(message)
      toast.error(message)
      return
    }

    if (mode === "latex" && !latexSource.trim()) {
      const message = "LaTeX content is required"
      setError(message)
      toast.error(message)
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const roles = parseRoles()

      if (mode === "upload") {
        const file = selectedFile as File
        const lowerName = file.name.toLowerCase()
        const isPdf = file.type === "application/pdf" || lowerName.endsWith(".pdf")
        const isDocx =
          file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
          lowerName.endsWith(".docx")

        if (!isPdf && !isDocx) {
          throw new Error("Only PDF and DOCX files are supported")
        }

        await uploadResume({
          name: name.trim(),
          file,
          tags: roles,
        })
      } else {
        await createResume({
          name: name.trim(),
          content: latexSource,
          tags: roles,
        })
      }

      resetForm()
      onResumeCreated()
      onOpenChange(false)
      toast.success(mode === "upload" ? "Resume uploaded successfully" : "Resume created successfully")
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Failed to create resume"
      setError(message)
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          resetForm()
        }
        onOpenChange(nextOpen)
      }}
    >
      <DialogContent className="sm:max-w-106.25">
        <DialogHeader>
          <DialogTitle>Create Resume</DialogTitle>
          <DialogDescription>
            Create with LaTeX in-app or upload an existing PDF/DOCX resume.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Resume Name</Label>
            <Input
              id="name"
              placeholder="e.g., SDE Resume v3"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="roles">Roles / Tags</Label>
            <Input
              id="roles"
              placeholder="backend, internship, ml"
              value={rolesInput}
              onChange={(event) => setRolesInput(event.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Add multiple roles or tags separated by commas.
            </p>
          </div>

          <Tabs value={mode} onValueChange={(value) => setMode(value as "latex" | "upload")}>
            <TabsList>
              <TabsTrigger value="latex">LaTeX Editor</TabsTrigger>
              <TabsTrigger value="upload">Upload File</TabsTrigger>
            </TabsList>

            <TabsContent value="latex" className="mt-2 grid gap-2">
              <Label htmlFor="latexSource">Resume LaTeX Source</Label>
              <Textarea
                id="latexSource"
                className="min-h-70 font-mono text-xs"
                value={latexSource}
                onChange={(event) => setLatexSource(event.target.value)}
                placeholder="Write your LaTeX resume source"
              />
            </TabsContent>

            <TabsContent value="upload" className="mt-2 grid gap-2">
              <Label htmlFor="resumeFile">Resume File (PDF or DOCX)</Label>
              <Input
                id="resumeFile"
                type="file"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
              />
              {selectedFile ? (
                <p className="text-xs text-muted-foreground">Selected: {selectedFile.name}</p>
              ) : null}
            </TabsContent>
          </Tabs>

          {error ? <p className="text-xs text-destructive">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={submitting}>
            {submitting ? (mode === "upload" ? "Uploading..." : "Creating...") : mode === "upload" ? "Upload Resume" : "Create Resume"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
