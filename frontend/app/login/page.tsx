"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { GraduationCap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { forgotPassword, hasAccessToken, login, register, setAuthSession } from "@/lib/api"

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<"login" | "register">("login")
  const [form, setForm] = useState({ name: "", email: "", password: "" })
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [forgotEmail, setForgotEmail] = useState("")
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotMessage, setForgotMessage] = useState<string | null>(null)

  useEffect(() => {
    if (hasAccessToken()) {
      router.replace("/")
    }
  }, [router])

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setError(null)

    try {
      const response =
        mode === "register"
          ? await register({
              name: form.name,
              email: form.email,
              password: form.password,
            })
          : await login({
              email: form.email,
              password: form.password,
            })

      setAuthSession(response)
      router.replace("/")
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Authentication failed")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleForgotPassword = async () => {
    const email = forgotEmail.trim() || form.email.trim()
    if (!email) {
      setForgotMessage("Please enter your email address.")
      return
    }

    setForgotLoading(true)
    setForgotMessage(null)

    try {
      await forgotPassword({ email })
      setForgotMessage("If an account exists, a password reset link has been sent to your email.")
    } catch (requestError) {
      setForgotMessage(requestError instanceof Error ? requestError.message : "Failed to send reset email")
    } finally {
      setForgotLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-linear-to-b from-background via-background to-primary/5 p-4">
      <div className="mx-auto flex min-h-screen max-w-md items-center">
        <Card className="w-full">
          <CardHeader className="space-y-4">
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <GraduationCap className="size-6" />
            </div>
            <div className="space-y-1 text-center">
              <CardTitle>StudentOS</CardTitle>
              <CardDescription>
                {mode === "login" ? "Sign in to continue" : "Create your account"}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <Button variant={mode === "login" ? "default" : "outline"} onClick={() => setMode("login")}>
                Login
              </Button>
              <Button variant={mode === "register" ? "default" : "outline"} onClick={() => setMode("register")}>
                Register
              </Button>
            </div>

            {mode === "register" && (
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(event) => setForm((value) => ({ ...value, name: event.target.value }))}
                />
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(event) => setForm((value) => ({ ...value, email: event.target.value }))}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={form.password}
                onChange={(event) => setForm((value) => ({ ...value, password: event.target.value }))}
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button className="w-full" disabled={isSubmitting} onClick={() => void handleSubmit()}>
              {isSubmitting ? "Please wait..." : mode === "login" ? "Login" : "Register"}
            </Button>

            <Button
              type="button"
              variant="link"
              className="w-full"
              onClick={() => {
                setShowForgotPassword((value) => !value)
                setForgotMessage(null)
                if (!forgotEmail && form.email) {
                  setForgotEmail(form.email)
                }
              }}
            >
              Forgot Password?
            </Button>

            {showForgotPassword ? (
              <div className="space-y-2 rounded-md border p-3">
                <Label htmlFor="forgotEmail">Enter your email</Label>
                <Input
                  id="forgotEmail"
                  type="email"
                  value={forgotEmail}
                  onChange={(event) => setForgotEmail(event.target.value)}
                  placeholder="you@example.com"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={forgotLoading}
                  onClick={() => void handleForgotPassword()}
                >
                  {forgotLoading ? "Please wait..." : "Send Reset Link"}
                </Button>
                {forgotMessage ? <p className="text-xs text-muted-foreground">{forgotMessage}</p> : null}
              </div>
            ) : null}

            <p className="text-center text-xs text-muted-foreground">
              Use your backend auth credentials. API URL: {process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080/api/v1"}
            </p>
            <p className="text-center text-xs text-muted-foreground">
              <Link href="/settings" className="underline underline-offset-4">
                Open settings
              </Link>
              {" "}
              after login to manage account preferences.
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
