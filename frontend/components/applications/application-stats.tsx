"use client"

import { useEffect, useMemo, useState } from "react"
import { Briefcase, Clock3, FileCheck, MessageSquare, Trophy } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { getApplications, type ApplicationRecord } from "@/lib/api"

interface ApplicationStatsProps {
  refreshToken: number
}

export function ApplicationStats({ refreshToken }: ApplicationStatsProps) {
  const [applications, setApplications] = useState<ApplicationRecord[]>([])

  useEffect(() => {
    let mounted = true

    const load = async () => {
      try {
        const response = await getApplications({ page: 1, limit: 300 })
        if (mounted) {
          setApplications(response.items)
        }
      } catch {
        if (mounted) {
          setApplications([])
        }
      }
    }

    void load()

    return () => {
      mounted = false
    }
  }, [refreshToken])

  const counts = useMemo(() => {
    const byStatus = {
      toApply: 0,
      applied: 0,
      interview: 0,
      offer: 0,
    }

    for (const item of applications) {
      if (item.status === "to_apply") {
        byStatus.toApply += 1
      }

      if (item.status === "applied") {
        byStatus.applied += 1
      }

      if (item.status === "interview") {
        byStatus.interview += 1
      }

      if (item.status === "offer") {
        byStatus.offer += 1
      }
    }

    return {
      total: applications.length,
      toApply: byStatus.toApply,
      applied: byStatus.applied,
      interview: byStatus.interview,
      offer: byStatus.offer,
    }
  }, [applications])

  const stats = [
    {
      label: "Total Tracked",
      value: counts.total,
      icon: Briefcase,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: "Yet To Apply",
      value: counts.toApply,
      icon: Clock3,
      color: "text-chart-1",
      bgColor: "bg-chart-1/10",
    },
    {
      label: "Applied",
      value: counts.applied,
      icon: FileCheck,
      color: "text-chart-2",
      bgColor: "bg-chart-2/10",
    },
    {
      label: "Interviews",
      value: counts.interview,
      icon: MessageSquare,
      color: "text-chart-4",
      bgColor: "bg-chart-4/10",
    },
    {
      label: "Offers",
      value: counts.offer,
      icon: Trophy,
      color: "text-chart-3",
      bgColor: "bg-chart-3/10",
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardContent className="flex items-center gap-4 p-4">
            <div className={`flex size-12 items-center justify-center rounded-xl ${stat.bgColor}`}>
              <stat.icon className={`size-6 ${stat.color}`} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="text-2xl font-bold">{stat.value}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
