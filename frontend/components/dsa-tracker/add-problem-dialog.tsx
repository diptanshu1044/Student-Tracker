"use client"

import { useEffect, useMemo, useState } from "react"
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
import { getProblems, trackUserProblem, type ProblemRecord } from "@/lib/api"

interface AddProblemDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onProblemTracked: () => void
}

export function AddProblemDialog({ open, onOpenChange, onProblemTracked }: AddProblemDialogProps) {
  const [problems, setProblems] = useState<ProblemRecord[]>([])
  const [problemId, setProblemId] = useState("")
  const [status, setStatus] = useState<"solved" | "revise">("solved")
  const [attempts, setAttempts] = useState("1")
  const [notes, setNotes] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let mounted = true

    const loadProblems = async () => {
      try {
        const response = await getProblems({ page: 1, limit: 500 })
        if (mounted) {
          setProblems(response.items)
          if (!problemId && response.items.length > 0) {
            setProblemId(response.items[0]._id)
          }
        }
      } catch {
        if (mounted) {
          setProblems([])
        }
      }
    }

    void loadProblems()

    return () => {
      mounted = false
    }
  }, [open])

  const selectedProblem = useMemo(
    () => problems.find((problem) => problem._id === problemId),
    [problemId, problems]
  )

  const handleSubmit = async () => {
    if (!problemId) {
      setError("Please select a problem")
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      await trackUserProblem({
        problemId,
        status,
        attempts: Number(attempts) || 1,
        lastSolvedAt: status === "solved" ? new Date().toISOString() : undefined,
      })

      setNotes("")
      setAttempts("1")
      onProblemTracked()
      onOpenChange(false)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to track problem")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-125">
        <DialogHeader>
          <DialogTitle>Add Problem</DialogTitle>
          <DialogDescription>
            Log a new problem you&apos;ve worked on. Fill in the details below.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="problem">Select Existing Problem</Label>
            <Select value={problemId} onValueChange={setProblemId}>
              <SelectTrigger id="problem">
                <SelectValue placeholder="Select problem" />
              </SelectTrigger>
              <SelectContent>
                {problems.map((problem) => (
                  <SelectItem key={problem._id} value={problem._id}>
                    {problem.title ?? "Untitled"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
            <div className="grid gap-2">
              <Label htmlFor="difficulty">Difficulty</Label>
              <Input id="difficulty" value={selectedProblem?.difficulty ?? "-"} readOnly />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="topic">Topic</Label>
              <Input id="topic" value={selectedProblem?.topic ?? "-"} readOnly />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={(value: "solved" | "revise") => setStatus(value)}>
              <SelectTrigger id="status">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="solved">Solved</SelectItem>
                <SelectItem value="revise">Need Revision</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="attempts">Attempts</Label>
            <Input
              id="attempts"
              type="number"
              min={1}
              value={attempts}
              onChange={(event) => setAttempts(event.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Any notes about your approach or solution..."
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
            {submitting ? "Saving..." : "Add Problem"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
