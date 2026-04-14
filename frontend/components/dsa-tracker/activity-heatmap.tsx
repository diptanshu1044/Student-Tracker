"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useDsaActivity } from "@/hooks/use-dsa-tracker"

interface ActivityHeatmapProps {
  className?: string
}

export function ActivityHeatmap({ className }: ActivityHeatmapProps) {
  const { data: activity = [], isLoading } = useDsaActivity()

  const heatmapData = useMemo(() => {
    return activity.map((point) => ({
      date: new Date(`${point.date}T00:00:00.000Z`),
      count: point.count,
    }))
  }, [activity])

  // Group data by weeks
  const weeks: { date: Date; count: number }[][] = []
  for (let i = 0; i < heatmapData.length; i += 7) {
    weeks.push(heatmapData.slice(i, i + 7))
  }

  const getIntensity = (count: number) => {
    if (count === 0) return "bg-muted"
    if (count <= 2) return "bg-primary/20"
    if (count <= 4) return "bg-primary/40"
    if (count <= 6) return "bg-primary/60"
    return "bg-primary"
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  return (
    <Card className={cn(className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <TooltipProvider>
          <div className="overflow-x-auto">
            <div className="flex gap-1">
              {weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="flex flex-col gap-1">
                  {week.map((day, dayIndex) => (
                    <Tooltip key={dayIndex}>
                      <TooltipTrigger asChild>
                        <div
                          className={cn(
                            "size-3 rounded-sm transition-colors cursor-default",
                            getIntensity(day.count)
                          )}
                        />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="font-medium">{day.count} problems</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(day.date)}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </TooltipProvider>
        {!isLoading && heatmapData.length === 0 && (
          <p className="mt-3 text-sm text-muted-foreground">No activity yet. Start by adding your first problem.</p>
        )}
        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <span>180 days ago</span>
          <div className="flex items-center gap-1">
            <span>Less</span>
            <div className="flex gap-0.5">
              <div className="size-3 rounded-sm bg-muted" />
              <div className="size-3 rounded-sm bg-primary/20" />
              <div className="size-3 rounded-sm bg-primary/40" />
              <div className="size-3 rounded-sm bg-primary/60" />
              <div className="size-3 rounded-sm bg-primary" />
            </div>
            <span>More</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
