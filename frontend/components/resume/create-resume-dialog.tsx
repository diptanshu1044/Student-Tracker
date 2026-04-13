"use client"

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

interface CreateResumeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateResumeDialog({
  open,
  onOpenChange,
}: CreateResumeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Resume</DialogTitle>
          <DialogDescription>
            Create a new resume version. You can customize it later.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Resume Name</Label>
            <Input id="name" placeholder="e.g., Frontend Developer" />
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
            <Select>
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
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => onOpenChange(false)}>Create Resume</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
