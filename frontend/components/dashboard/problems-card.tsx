"use client"

import { useEffect, useMemo, useState } from "react"
import { Code2, TrendingUp } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { getUserProblems, type UserProblemRecord } from "@/lib/api"

export function ProblemsCard() {
  const [items, setItems] = useState<UserProblemRecord[]>([])
  const [total, setTotal] = useState(0)

  useEffect(() => {
    let mounted = true

    const load = async () => {
      try {
        const response = await getUserProblems({ page: 1, limit: 500, status: "solved" })
        if (mounted) {
          setItems(response.items)
          setTotal(response.total)
        }
      } catch {
        if (mounted) {
          setItems([])
          setTotal(0)
        }
      }
    }

    void load()

    return () => {
      mounted = false
    }
  }, [])

  const { today, thisWeek } = useMemo(() => {
    const now = new Date()
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay())
    startOfWeek.setHours(0, 0, 0, 0)

    let todayCount = 0
    let weekCount = 0

    for (const item of items) {
      const date = new Date(item.createdAt)

      if (date.toDateString() === now.toDateString()) {
        todayCount += 1
      }

      if (date >= startOfWeek) {
        weekCount += 1
      }
    }

    return { today: todayCount, thisWeek: weekCount }
  }, [items])

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">
              Problems Solved
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold tabular-nums">{total}</span>
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
            <p className="text-xl font-semibold">{today}</p>
          </div>
          <div className="space-y-1 rounded-lg bg-secondary/50 p-3">
            <p className="text-xs text-muted-foreground">This Week</p>
            <div className="flex items-center gap-1">
              <p className="text-xl font-semibold">{thisWeek}</p>
              <span className="flex items-center text-xs text-chart-3">
                <TrendingUp className="size-3" />
                live
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
