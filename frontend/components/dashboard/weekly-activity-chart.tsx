"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { cn } from "@/lib/utils"
import { getWeeklySolved, type WeeklySolvedPoint } from "@/lib/api"

interface WeeklyActivityChartProps {
  className?: string
}

export function WeeklyActivityChart({ className }: WeeklyActivityChartProps) {
  const [points, setPoints] = useState<WeeklySolvedPoint[]>([])

  useEffect(() => {
    let mounted = true

    const load = async () => {
      try {
        const response = await getWeeklySolved()
        if (mounted) {
          setPoints(response)
        }
      } catch {
        if (mounted) {
          setPoints([])
        }
      }
    }

    void load()

    return () => {
      mounted = false
    }
  }, [])

  const data = useMemo(
    () =>
      points.slice(-8).map((point) => ({
        day: `W${point.week}`,
        problems: point.solvedCount,
      })),
    [points]
  )

  return (
    <Card className={cn(className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Weekly Activity</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="mb-4 flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="size-3 rounded-full bg-primary" />
            <span className="text-muted-foreground">Problems</span>
          </div>
        </div>
        <div className="h-70">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorProblems" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
              <XAxis
                dataKey="day"
                axisLine={false}
                tickLine={false}
                className="text-xs fill-muted-foreground"
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                className="text-xs fill-muted-foreground"
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="rounded-lg border bg-popover p-3 shadow-md">
                        <p className="mb-2 font-medium">{label}</p>
                        {payload.map((entry, index) => (
                          <p key={index} className="text-sm" style={{ color: entry.color }}>
                            {entry.name}: {entry.value}
                          </p>
                        ))}
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Area
                type="monotone"
                dataKey="problems"
                name="Problems"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#colorProblems)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
