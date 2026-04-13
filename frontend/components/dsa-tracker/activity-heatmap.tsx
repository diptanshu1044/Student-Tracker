"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

// Generate mock data for the heatmap (last 20 weeks)
function generateHeatmapData() {
  const data: { date: Date; count: number }[] = []
  const today = new Date()
  
  for (let i = 139; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    // Random count between 0 and 8
    const count = Math.random() < 0.3 ? 0 : Math.floor(Math.random() * 8) + 1
    data.push({ date, count })
  }
  
  return data
}

const heatmapData = generateHeatmapData()

interface ActivityHeatmapProps {
  className?: string
}

export function ActivityHeatmap({ className }: ActivityHeatmapProps) {
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
        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <span>20 weeks ago</span>
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
