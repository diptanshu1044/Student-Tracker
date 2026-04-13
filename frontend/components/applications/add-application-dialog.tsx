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
import { Textarea } from "@/components/ui/textarea"
import { createApplication } from "@/lib/api"

interface AddApplicationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onApplicationCreated: () => void
}

export function AddApplicationDialog({
  open,
  onOpenChange,
  onApplicationCreated,
}: AddApplicationDialogProps) {
  const [company, setCompany] = useState("")
  const [role, setRole] = useState("")
  const [status, setStatus] = useState<"applied" | "interview" | "rejected" | "offer">("applied")
  const [date, setDate] = useState("")
  const [notes, setNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!company.trim() || !role.trim()) {
      setError("Company and role are required")
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      await createApplication({
        company: company.trim(),
        role: role.trim(),
        status,
        appliedDate: date ? new Date(date).toISOString() : undefined,
        notes: notes.trim() ? [notes.trim()] : undefined,
      })

      setCompany("")
      setRole("")
      setDate("")
      setNotes("")
      onApplicationCreated()
      onOpenChange(false)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to create application")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-125">
        <DialogHeader>
          <DialogTitle>Add Application</DialogTitle>
          <DialogDescription>
            Track a new job application. Fill in the details below.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="company">Company Name</Label>
            <Input
              id="company"
              placeholder="e.g., Google"
              value={company}
              onChange={(event) => setCompany(event.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="role">Role / Position</Label>
            <Input
              id="role"
              placeholder="e.g., Software Engineer Intern"
              value={role}
              onChange={(event) => setRole(event.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={status}
                onValueChange={(value: "applied" | "interview" | "rejected" | "offer") =>
                  setStatus(value)
                }
              >
                <SelectTrigger id="status">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="applied">Applied</SelectItem>
                  <SelectItem value="interview">Interview</SelectItem>
                  <SelectItem value="offer">Offer</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="date">Application Date</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="link">Job Posting Link (optional)</Label>
            <Input id="link" placeholder="https://..." />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Any notes about the application..."
              className="resize-none"
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={submitting}>
            {submitting ? "Adding..." : "Add Application"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
