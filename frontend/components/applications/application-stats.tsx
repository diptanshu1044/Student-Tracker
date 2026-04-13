"use client"

import { Briefcase, FileCheck, MessageSquare, Trophy } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

const stats = [
  {
    label: "Total Applied",
    value: 24,
    icon: Briefcase,
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    label: "Online Assessments",
    value: 8,
    icon: FileCheck,
    color: "text-chart-2",
    bgColor: "bg-chart-2/10",
  },
  {
    label: "Interviews",
    value: 5,
    icon: MessageSquare,
    color: "text-chart-4",
    bgColor: "bg-chart-4/10",
  },
  {
    label: "Offers",
    value: 2,
    icon: Trophy,
    color: "text-chart-3",
    bgColor: "bg-chart-3/10",
  },
]

export function ApplicationStats() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
