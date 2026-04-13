"use client"

import { AlertTriangle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

const weakTopics = [
  { name: "Dynamic Programming", solved: 12, total: 50, percentage: 24 },
  { name: "Graphs", solved: 8, total: 35, percentage: 23 },
  { name: "Tries", solved: 3, total: 15, percentage: 20 },
  { name: "Backtracking", solved: 5, total: 20, percentage: 25 },
]

export function WeakTopics() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <AlertTriangle className="size-4 text-chart-4" />
          Weak Topics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {weakTopics.map((topic) => (
          <div key={topic.name} className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{topic.name}</span>
              <span className="text-muted-foreground">
                {topic.solved}/{topic.total}
              </span>
            </div>
            <Progress value={topic.percentage} className="h-2" />
          </div>
        ))}
        <p className="text-xs text-muted-foreground">
          Focus on these topics to improve your overall performance.
        </p>
      </CardContent>
    </Card>
  )
}
