"use client"

import { StreakCard } from "./streak-card"
import { ProblemsCard } from "./problems-card"
import { TasksCard } from "./tasks-card"
import { TopicDistributionChart } from "./topic-distribution-chart"
import { WeeklyActivityChart } from "./weekly-activity-chart"
import { QuickActions } from "./quick-actions"

export function DashboardContent() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          Welcome back, John
        </h1>
        <p className="text-muted-foreground">
          Here&apos;s your progress overview for today.
        </p>
      </div>

      {/* Quick Actions */}
      <QuickActions />

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StreakCard />
        <ProblemsCard />
        <TasksCard />
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-7">
        <WeeklyActivityChart className="lg:col-span-4" />
        <TopicDistributionChart className="lg:col-span-3" />
      </div>
    </div>
  )
}
