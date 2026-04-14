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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { type ProblemRecord } from "@/lib/api"
import { useCreateDsaProblemLog, useDsaProblemCatalog } from "@/hooks/use-dsa-tracker"

interface AddProblemDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddProblemDialog({ open, onOpenChange }: AddProblemDialogProps) {
  const [entryMode, setEntryMode] = useState<"existing" | "new">("existing")
  const [problemId, setProblemId] = useState("")
  const [newTitle, setNewTitle] = useState("")
  const [newDifficulty, setNewDifficulty] = useState<"easy" | "medium" | "hard">("medium")
  const [newTopic, setNewTopic] = useState("")
  const [newPlatform, setNewPlatform] = useState<"leetcode" | "gfg">("leetcode")
  const [status, setStatus] = useState<"solved" | "attempted" | "revision">("attempted")
  const [attempts, setAttempts] = useState("1")
  const [notes, setNotes] = useState("")
  const [error, setError] = useState<string | null>(null)
  const { data: catalogData } = useDsaProblemCatalog(500)
  const createLogMutation = useCreateDsaProblemLog()

  const problems = useMemo<ProblemRecord[]>(() => catalogData?.items ?? [], [catalogData?.items])

  useEffect(() => {
    if (!open) {
      return
    }

    if (problems.length > 0) {
      if (!problemId) {
        setProblemId(problems[0]._id)
      }
      return
    }

    setEntryMode("new")
  }, [open, problemId, problems])

  useEffect(() => {
    if (open) {
      setError(null)
    }
  }, [open])

  const selectedProblem = useMemo(
    () => problems.find((problem) => problem._id === problemId),
    [problemId, problems]
  )

  const handleSubmit = async () => {
    if (entryMode === "existing") {
      if (!problemId) {
        setError("Please select a problem")
        return
      }
    } else {
      if (!newTitle.trim()) {
        setError("Please enter a problem title")
        return
      }

      if (!newTopic.trim()) {
        setError("Please enter a topic")
        return
      }
    }

    setError(null)

    try {
      const basePayload = {
        status,
        attempts: Number(attempts) || 1,
        date: new Date().toISOString(),
        notes: notes.trim() || undefined,
      }

      if (entryMode === "new") {
        await createLogMutation.mutateAsync({
          ...basePayload,
          createProblem: {
            title: newTitle.trim(),
            difficulty: newDifficulty,
            topic: newTopic.trim(),
            platform: newPlatform,
          },
        })
      } else {
        await createLogMutation.mutateAsync({
          ...basePayload,
          problemId,
        })
      }

      toast.success("Problem logged successfully")
      setStatus("attempted")
      setNotes("")
      setAttempts("1")
      setNewTitle("")
      setNewTopic("")
      setNewDifficulty("medium")
      setNewPlatform("leetcode")
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
            <Label>Problem Source</Label>
            <Tabs
              value={entryMode}
              onValueChange={(value) => setEntryMode(value as "existing" | "new")}
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="existing" disabled={problems.length === 0}>
                  Existing
                </TabsTrigger>
                <TabsTrigger value="new">Create New</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {entryMode === "existing" ? (
            <>
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
            </>
          ) : (
            <>
              <div className="grid gap-2">
                <Label htmlFor="new-title">Problem Title</Label>
                <Input
                  id="new-title"
                  placeholder="e.g. Two Sum"
                  value={newTitle}
                  onChange={(event) => setNewTitle(event.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="new-difficulty">Difficulty</Label>
                  <Select
                    value={newDifficulty}
                    onValueChange={(value: "easy" | "medium" | "hard") => setNewDifficulty(value)}
                  >
                    <SelectTrigger id="new-difficulty">
                      <SelectValue placeholder="Select difficulty" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">Easy</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="new-platform">Platform</Label>
                  <Select
                    value={newPlatform}
                    onValueChange={(value: "leetcode" | "gfg") => setNewPlatform(value)}
                  >
                    <SelectTrigger id="new-platform">
                      <SelectValue placeholder="Select platform" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="leetcode">LeetCode</SelectItem>
                      <SelectItem value="gfg">GFG</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="new-topic">Topic</Label>
                <Input
                  id="new-topic"
                  placeholder="e.g. Arrays"
                  value={newTopic}
                  onChange={(event) => setNewTopic(event.target.value)}
                />
              </div>
            </>
          )}
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
