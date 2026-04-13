"use client"

import { Code2, TrendingUp } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

export function ProblemsCard() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">
              Problems Solved
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold tabular-nums">247</span>
              <span className="text-lg text-muted-foreground">total</span>
            </div>
          </div>
          <div className="flex size-14 items-center justify-center rounded-2xl bg-chart-2/10">
            <Code2 className="size-7 text-chart-2" />
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="space-y-1 rounded-lg bg-secondary/50 p-3">
            <p className="text-xs text-muted-foreground">Today</p>
            <p className="text-xl font-semibold">3</p>
          </div>
          <div className="space-y-1 rounded-lg bg-secondary/50 p-3">
            <p className="text-xs text-muted-foreground">This Week</p>
            <div className="flex items-center gap-1">
              <p className="text-xl font-semibold">18</p>
              <span className="flex items-center text-xs text-chart-3">
                <TrendingUp className="size-3" />
                +12%
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
