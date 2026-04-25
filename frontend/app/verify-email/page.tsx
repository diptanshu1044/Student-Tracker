"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { verifyEmailToken } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [message, setMessage] = useState<string>("")

  useEffect(() => {
    let mounted = true

    const run = async () => {
      if (!token) {
        setStatus("error")
        setMessage("Missing verification token.")
        return
      }

      setStatus("loading")
      setMessage("")

      try {
        await verifyEmailToken(token)
        if (!mounted) {
          return
        }
        setStatus("success")
        setMessage("Email verified successfully. You can return to settings now.")
      } catch (error) {
        if (!mounted) {
          return
        }
        setStatus("error")
        setMessage(error instanceof Error ? error.message : "Email verification failed.")
      }
    }

    void run()

    return () => {
      mounted = false
    }
  }, [token])

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-xl items-center justify-center px-4 py-10">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Verify Email</CardTitle>
          <CardDescription>
            Complete your account verification to unlock planner features.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === "loading" ? <p className="text-sm text-muted-foreground">Verifying...</p> : null}
          {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/settings">Go to Settings</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/login">Go to Login</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<main className="mx-auto flex min-h-[70vh] w-full max-w-xl items-center justify-center px-4 py-10"><p className="text-sm text-muted-foreground">Loading...</p></main>}>
      <VerifyEmailContent />
    </Suspense>
  )
}
