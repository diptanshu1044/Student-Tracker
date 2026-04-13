"use client"

import { useEffect, useMemo, useState } from "react"
import { AlertTriangle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { getWeakTopics, type WeakTopicPoint } from "@/lib/api"

export function WeakTopics() {
  const [weakTopics, setWeakTopics] = useState<WeakTopicPoint[]>([])

  useEffect(() => {
    let mounted = true

    const load = async () => {
      try {
        const response = await getWeakTopics()
        if (mounted) {
          setWeakTopics(response.slice(0, 4))
        }
      } catch {
        if (mounted) {
          setWeakTopics([])
        }
      }
    }

    void load()

    return () => {
      mounted = false
    }
  }, [])

  const displayTopics = useMemo(
    () =>
      weakTopics.map((topic) => {
        const total = topic.solvedCount + topic.reviseCount
        const percentage = total > 0 ? Math.round((topic.solvedCount / total) * 100) : 0

        return {
          name: topic.topic,
          solved: topic.solvedCount,
          total,
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
