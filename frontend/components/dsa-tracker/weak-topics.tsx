"use client"

import { useMemo } from "react"
import { AlertTriangle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { useDsaWeakTopics } from "@/hooks/use-dsa-tracker"

export function WeakTopics() {
  const { data: weakTopics = [] } = useDsaWeakTopics()

  const displayTopics = useMemo(
    () =>
      weakTopics.map((topic) => {
        const percentage = Math.round(topic.solveRate * 100)

        return {
          name: topic.topic,
          solved: topic.totalSolved,
          total: topic.totalProblems,
          attempts: topic.avgAttempts.toFixed(1),
          percentage,
        }
      }),
    [weakTopics]
  )

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <AlertTriangle className="size-4 text-chart-4" />
          Weak Topics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {displayTopics.map((topic) => (
          <div key={topic.name} className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{topic.name}</span>
              <span className="text-muted-foreground">{topic.percentage}% solved</span>
            </div>
            <Progress value={topic.percentage} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {topic.solved}/{topic.total} solved, avg attempts {topic.attempts}
            </p>
          </div>
        ))}
        {displayTopics.length === 0 && (
          <p className="text-sm text-muted-foreground">No topic data yet.</p>
        )}
        <p className="text-xs text-muted-foreground">
          Focus on these topics to improve your overall performance.
        </p>
      </CardContent>
    </Card>
  )
}
