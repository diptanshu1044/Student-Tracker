"use client"

import Link from "next/link"
import { useState } from "react"
import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { resetPassword } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

function ResetPasswordContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    setError(null)
    setMessage(null)

    if (!token) {
      setError("Missing reset token.")
      return
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.")
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }

    setLoading(true)

    try {
      await resetPassword({ token, password })
      setMessage("Password reset successful. You can login with your new password.")
      setPassword("")
      setConfirmPassword("")
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to reset password.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-xl items-center justify-center px-4 py-10">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Reset Password</CardTitle>
          <CardDescription>Choose a new password for your account.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="password">New Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void handleSubmit()} disabled={loading}>
              {loading ? "Please wait..." : "Reset Password"}
            </Button>
            <Button asChild variant="outline">
              <Link href="/login">Back to Login</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<main className="mx-auto flex min-h-[70vh] w-full max-w-xl items-center justify-center px-4 py-10"><p className="text-sm text-muted-foreground">Loading...</p></main>}>
      <ResetPasswordContent />
    </Suspense>
  )
}
