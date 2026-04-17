"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  addJobApplication,
  deleteJob,
  getJobFunnel,
  getJobInsights,
  getJobs,
  getJobStats,
  getResumes,
  updateJob,
  updateJobStatus,
  uploadResume,
  type JobPriority,
  type JobStatus,
  type InterviewType,
} from "@/lib/api"

export function useJobs(query?: {
  page?: number
  limit?: number
  status?: JobStatus
  company?: string
  startDate?: string
  endDate?: string
  priority?: JobPriority
  search?: string
}) {
  return useQuery({
    queryKey: ["jobs", query],
    queryFn: () => getJobs(query),
  })
}

export function useJobStats() {
  return useQuery({
    queryKey: ["jobStats"],
    queryFn: getJobStats,
  })
}

export function useJobFunnel() {
  return useQuery({
    queryKey: ["jobFunnel"],
    queryFn: getJobFunnel,
  })
}

export function useJobInsights() {
  return useQuery({
    queryKey: ["jobInsights"],
    queryFn: getJobInsights,
  })
}

export function useResumeLibrary() {
  return useQuery({
    queryKey: ["resumes"],
    queryFn: getResumes,
  })
}

export function useJobMutations() {
  const queryClient = useQueryClient()

  const invalidateJobs = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["jobs"] }),
      queryClient.invalidateQueries({ queryKey: ["jobStats"] }),
      queryClient.invalidateQueries({ queryKey: ["jobFunnel"] }),
      queryClient.invalidateQueries({ queryKey: ["jobInsights"] }),
    ])
  }

  const createJob = useMutation({
    mutationFn: addJobApplication,
    onSuccess: () => void invalidateJobs(),
  })

  const patchJobStatus = useMutation({
    mutationFn: ({ jobId, status }: { jobId: string; status: JobStatus }) => updateJobStatus(jobId, status),
    onSuccess: () => void invalidateJobs(),
  })

  const patchJob = useMutation({
    mutationFn: ({
      jobId,
      input,
    }: {
      jobId: string
      input: Partial<{
        companyName: string
        role: string
        jobLink: string
        referral: boolean
        notes: string
        resumeVersion: string
        followUpDate: string | null
        priority: JobPriority
        interviewDate: string | null
        interviewType: InterviewType | null
        tags: string[]
      }>
    }) => updateJob(jobId, input),
    onSuccess: () => void invalidateJobs(),
  })

  const removeJob = useMutation({
    mutationFn: deleteJob,
    onSuccess: () => void invalidateJobs(),
  })

  const uploadResumeFile = useMutation({
    mutationFn: uploadResume,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["resumes"] })
    },
  })

  return {
    createJob,
    patchJobStatus,
    patchJob,
    removeJob,
    uploadResumeFile,
  }
}
