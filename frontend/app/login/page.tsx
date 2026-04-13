"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { GraduationCap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { hasAccessToken, login, register, setAuthSession } from "@/lib/api"

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<"login" | "register">("login")
  const [form, setForm] = useState({ name: "", email: "", password: "" })
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

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
