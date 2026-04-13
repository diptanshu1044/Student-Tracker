"use client"

import { useState } from "react"
import { useTheme } from "next-themes"
import { Moon, Sun, Monitor, Bell, User, Lock, Palette } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import {
  clearAuthTokens,
  getAuthUser,
  hasAccessToken,
  login,
  register,
  setAuthSession,
} from "@/lib/api"

export function SettingsContent() {
  const currentUser = getAuthUser()
  const { theme, setTheme } = useTheme()
  const [authMode, setAuthMode] = useState<"login" | "register">("login")
  const [authForm, setAuthForm] = useState({ name: "", email: "", password: "" })
  const [authStatus, setAuthStatus] = useState(
    currentUser?.email ? `Connected as ${currentUser.email}` : hasAccessToken() ? "Connected" : "Not connected"
  )
  const [authError, setAuthError] = useState<string | null>(null)
  const [authLoading, setAuthLoading] = useState(false)
  const [notifications, setNotifications] = useState({
    email: true,
    streak: true,
    applications: true,
    weekly: false,
  })

  const handleAuthSubmit = async () => {
    setAuthLoading(true)
    setAuthError(null)

    try {
      const response =
        authMode === "register"
          ? await register({
              name: authForm.name,
              email: authForm.email,
              password: authForm.password,
            })
          : await login({
              email: authForm.email,
              password: authForm.password,
            })

      setAuthSession(response)
      setAuthStatus(`Connected as ${response.user.email}`)
    } catch (requestError) {
      setAuthError(requestError instanceof Error ? requestError.message : "Authentication failed")
    } finally {
      setAuthLoading(false)
    }
  }

  const handleDisconnect = () => {
    clearAuthTokens()
    setAuthStatus("Not connected")
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          Settings
        </h1>
        <p className="text-muted-foreground">
          Manage your account settings and preferences.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Settings */}
        <div className="space-y-6 lg:col-span-2">
          {/* Profile */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <User className="size-5 text-muted-foreground" />
                <CardTitle>Profile</CardTitle>
              </div>
              <CardDescription>
                Update your personal information.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" defaultValue={currentUser?.name?.split(" ")[0] ?? ""} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    defaultValue={currentUser?.name?.split(" ").slice(1).join(" ") ?? ""}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" defaultValue={currentUser?.email ?? ""} />
              </div>
              <Button>Save Changes</Button>
            </CardContent>
          </Card>

          {/* Appearance */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Palette className="size-5 text-muted-foreground" />
                <CardTitle>Appearance</CardTitle>
              </div>
              <CardDescription>
                Customize how StudentOS looks on your device.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <button
                  onClick={() => setTheme("light")}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-lg border p-4 transition-colors hover:bg-accent",
                    theme === "light" && "border-primary bg-primary/5"
                  )}
                >
                  <Sun className="size-6" />
                  <span className="text-sm font-medium">Light</span>
                </button>
                <button
                  onClick={() => setTheme("dark")}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-lg border p-4 transition-colors hover:bg-accent",
                    theme === "dark" && "border-primary bg-primary/5"
                  )}
                >
                  <Moon className="size-6" />
                  <span className="text-sm font-medium">Dark</span>
                </button>
                <button
                  onClick={() => setTheme("system")}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-lg border p-4 transition-colors hover:bg-accent",
                    theme === "system" && "border-primary bg-primary/5"
                  )}
                >
                  <Monitor className="size-6" />
                  <span className="text-sm font-medium">System</span>
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Security */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Lock className="size-5 text-muted-foreground" />
                <CardTitle>Security</CardTitle>
              </div>
              <CardDescription>
                Manage your password and security settings.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input id="currentPassword" type="password" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input id="newPassword" type="password" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input id="confirmPassword" type="password" />
                </div>
              </div>
              <Button>Update Password</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Lock className="size-5 text-muted-foreground" />
                <CardTitle>API Authentication</CardTitle>
              </div>
              <CardDescription>
                Login or register to store backend access tokens locally.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={authMode === "login" ? "default" : "outline"}
                  onClick={() => setAuthMode("login")}
                >
                  Login
                </Button>
                <Button
                  variant={authMode === "register" ? "default" : "outline"}
                  onClick={() => setAuthMode("register")}
                >
                  Register
                </Button>
              </div>
              {authMode === "register" && (
                <div className="grid gap-2">
                  <Label htmlFor="authName">Name</Label>
                  <Input
                    id="authName"
                    value={authForm.name}
                    onChange={(event) =>
                      setAuthForm((value) => ({ ...value, name: event.target.value }))
                    }
                  />
                </div>
              )}
              <div className="grid gap-2">
                <Label htmlFor="authEmail">Email</Label>
                <Input
                  id="authEmail"
                  type="email"
                  value={authForm.email}
                  onChange={(event) =>
                    setAuthForm((value) => ({ ...value, email: event.target.value }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="authPassword">Password</Label>
                <Input
                  id="authPassword"
                  type="password"
                  value={authForm.password}
                  onChange={(event) =>
                    setAuthForm((value) => ({ ...value, password: event.target.value }))
                  }
                />
              </div>
              <p className="text-xs text-muted-foreground">Status: {authStatus}</p>
              {authError && <p className="text-xs text-destructive">{authError}</p>}
              <div className="flex gap-2">
                <Button onClick={() => void handleAuthSubmit()} disabled={authLoading}>
                  {authLoading ? "Please wait..." : authMode === "register" ? "Register" : "Login"}
                </Button>
                <Button variant="outline" onClick={handleDisconnect}>
                  Disconnect
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Settings */}
        <div className="space-y-6">
          {/* Notifications */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bell className="size-5 text-muted-foreground" />
                <CardTitle>Notifications</CardTitle>
              </div>
              <CardDescription>
                Choose what you want to be notified about.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Email Notifications</p>
                  <p className="text-xs text-muted-foreground">
                    Receive email updates
                  </p>
                </div>
                <Switch
                  checked={notifications.email}
                  onCheckedChange={(checked) =>
                    setNotifications({ ...notifications, email: checked })
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Streak Reminders</p>
                  <p className="text-xs text-muted-foreground">
                    Daily practice reminders
                  </p>
                </div>
                <Switch
                  checked={notifications.streak}
                  onCheckedChange={(checked) =>
                    setNotifications({ ...notifications, streak: checked })
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Application Updates</p>
                  <p className="text-xs text-muted-foreground">
                    Job application status changes
                  </p>
                </div>
                <Switch
                  checked={notifications.applications}
                  onCheckedChange={(checked) =>
                    setNotifications({ ...notifications, applications: checked })
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Weekly Summary</p>
                  <p className="text-xs text-muted-foreground">
                    Weekly progress report
                  </p>
                </div>
                <Switch
                  checked={notifications.weekly}
                  onCheckedChange={(checked) =>
                    setNotifications({ ...notifications, weekly: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
              <CardDescription>
                Irreversible actions for your account.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button variant="outline" className="w-full text-destructive hover:bg-destructive hover:text-destructive-foreground">
                Export All Data
              </Button>
              <Button variant="destructive" className="w-full">
                Delete Account
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
