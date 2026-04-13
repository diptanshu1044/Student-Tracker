"use client"

import { Flame } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { useEffect, useState } from "react"

export function StreakCard() {
  const [count, setCount] = useState(0)
  const targetCount = 12

  useEffect(() => {
    const duration = 1000
    const steps = 20
    const increment = targetCount / steps
    let current = 0

    const timer = setInterval(() => {
      current += increment
      if (current >= targetCount) {
        setCount(targetCount)
        clearInterval(timer)
      } else {
        setCount(Math.floor(current))
      }
    }, duration / steps)

    return () => clearInterval(timer)
  }, [])

  return (
    <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background">
      <div className="absolute -top-10 -right-10 size-32 rounded-full bg-primary/10 blur-2xl" />
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">
              Current Streak
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold tabular-nums text-primary">
                {count}
              </span>
              <span className="text-lg text-muted-foreground">days</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Personal best: 21 days
            </p>
          </div>
          <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10">
            <Flame className="size-7 text-primary" />
          </div>
        </div>
        <div className="mt-4 flex gap-1">
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className={`h-2 flex-1 rounded-full ${
                i < 5 ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          5 of 7 days completed this week
        </p>
      </CardContent>
    </Card>
  )
}
