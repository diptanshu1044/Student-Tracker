import { DashboardLayout } from "@/components/dashboard-layout"
import { ResumeEditorPage } from "@/components/resume/resume-editor-page"

interface ResumeEditorRouteProps {
  params: Promise<{
    resumeId: string
  }>
}

export default async function ResumeEditorRoute({ params }: ResumeEditorRouteProps) {
  const { resumeId } = await params

  return (
    <DashboardLayout>
      <ResumeEditorPage resumeId={resumeId} />
    </DashboardLayout>
  )
}