"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"
import { cn } from "@/lib/utils"
import { getTopicBreakdown, type TopicBreakdownPoint } from "@/lib/api"

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
]

interface TopicDistributionChartProps {
  className?: string
}

export function TopicDistributionChart({ className }: TopicDistributionChartProps) {
  const [points, setPoints] = useState<TopicBreakdownPoint[]>([])

  useEffect(() => {
    let mounted = true

    const load = async () => {
      try {
        const response = await getTopicBreakdown()
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
      points.map((item, index) => ({
        name: item.topic,
        value: item.solvedCount,
        color: COLORS[index % COLORS.length],
      })),
    [points]
  )

  const total = data.reduce((sum, item) => sum + item.value, 0)

  return (
    <Card className={cn(className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Topic Distribution</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-col items-center gap-4 lg:flex-row">
          <div className="h-50 w-50">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload
                      return (
                        <div className="rounded-lg border bg-popover p-3 shadow-md">
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {item.value} problems ({Math.round((item.value / total) * 100)}%)
                          </p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 space-y-2">
            {data.map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="size-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm">{item.name}</span>
                </div>
                <span className="text-sm font-medium tabular-nums">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
