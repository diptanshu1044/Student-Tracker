"use client"

import { useEffect, useMemo, useState } from "react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { type ProblemRecord } from "@/lib/api"
import { useCreateDsaProblemLog, useDsaProblemCatalog } from "@/hooks/use-dsa-tracker"

interface AddProblemDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddProblemDialog({ open, onOpenChange }: AddProblemDialogProps) {
  const [problemId, setProblemId] = useState("")
  const [status, setStatus] = useState<"solved" | "attempted" | "revision">("attempted")
  const [attempts, setAttempts] = useState("1")
  const [notes, setNotes] = useState("")
  const [error, setError] = useState<string | null>(null)
  const { data: catalogData } = useDsaProblemCatalog(500)
  const createLogMutation = useCreateDsaProblemLog()

  const problems = useMemo<ProblemRecord[]>(() => catalogData?.items ?? [], [catalogData?.items])

  useEffect(() => {
    if (open && !problemId && problems.length > 0) {
      setProblemId(problems[0]._id)
    }
  }, [open, problemId, problems])

  const selectedProblem = useMemo(
    () => problems.find((problem) => problem._id === problemId),
    [problemId, problems]
  )

  const handleSubmit = async () => {
    if (!problemId) {
      setError("Please select a problem")
      return
    }

    setError(null)

    try {
      await createLogMutation.mutateAsync({
        problemId,
        status,
        attempts: Number(attempts) || 1,
        date: new Date().toISOString(),
        notes: notes.trim() || undefined,
      })

      toast.success("Problem logged successfully")
      setStatus("attempted")
      setNotes("")
      setAttempts("1")
      onOpenChange(false)
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Failed to track problem"
      setError(message)
      toast.error(message)
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
            <Select
              value={status}
              onValueChange={(value: "solved" | "attempted" | "revision") => setStatus(value)}
            >
              <SelectTrigger id="status">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="solved">Solved</SelectItem>
                <SelectItem value="attempted">Attempted</SelectItem>
                <SelectItem value="revision">Need Revision</SelectItem>
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
          <Button onClick={() => void handleSubmit()} disabled={createLogMutation.isPending}>
            {createLogMutation.isPending ? "Saving..." : "Add Problem"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
