"use client"

import { useState } from "react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createResume } from "@/lib/api"

interface CreateResumeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onResumeCreated: () => void
}

export function CreateResumeDialog({
  open,
  onOpenChange,
  onResumeCreated,
}: CreateResumeDialogProps) {
  const [name, setName] = useState("")
  const [targetRole, setTargetRole] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("Resume name is required")
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      await createResume({
        name: name.trim(),
        content: {},
        tags: targetRole ? [targetRole] : [],
      })

      setName("")
      setTargetRole("")
      onResumeCreated()
      onOpenChange(false)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to create resume")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-106.25">
        <DialogHeader>
          <DialogTitle>Create Resume</DialogTitle>
          <DialogDescription>
            Create a new resume version. You can customize it later.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Resume Name</Label>
            <Input
              id="name"
              placeholder="e.g., Frontend Developer"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="template">Start From</Label>
            <Select defaultValue="blank">
              <SelectTrigger id="template">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="blank">Blank Resume</SelectItem>
                <SelectItem value="duplicate">
                  Duplicate Existing Resume
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="target">Target Role</Label>
            <Select value={targetRole} onValueChange={setTargetRole}>
              <SelectTrigger id="target">
                <SelectValue placeholder="Select target role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="frontend">Frontend Developer</SelectItem>
                <SelectItem value="backend">Backend Developer</SelectItem>
                <SelectItem value="fullstack">Full Stack Developer</SelectItem>
                <SelectItem value="sde">Software Engineer</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={submitting}>
            {submitting ? "Creating..." : "Create Resume"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
