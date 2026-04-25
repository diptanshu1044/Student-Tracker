"use client"

import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { Moon, Sun, Monitor, Bell, User, Lock, Palette, MailCheck, Link2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import {
  changePassword,
  disconnectGooglePlanner,
  getGooglePlannerConnectUrl,
  getMe,
  getAuthUser,
  hasAccessToken,
  resendVerificationEmail,
  setAuthUser,
  updateMe,
  updateNotificationPreferences,
} from "@/lib/api"

type NotificationState = {
  email: boolean
  streak: boolean
  applications: boolean
  weekly: boolean
  plannerReminders: boolean
}

const DEFAULT_NOTIFICATIONS: NotificationState = {
  email: true,
  streak: true,
  applications: true,
  weekly: false,
  plannerReminders: true,
}

export function SettingsContent() {
  const initialUser = getAuthUser()
  const { theme, setTheme } = useTheme()
  const [user, setUser] = useState(initialUser)
  const [profileName, setProfileName] = useState(initialUser?.name ?? "")
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileMessage, setProfileMessage] = useState<string | null>(null)

  const [verificationLoading, setVerificationLoading] = useState(false)
  const [verificationMessage, setVerificationMessage] = useState<string | null>(null)

  const [passwordForm, setPasswordForm] = useState({
    oldPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  })
  const [passwordUpdateLoading, setPasswordUpdateLoading] = useState(false)
  const [passwordUpdateMessage, setPasswordUpdateMessage] = useState<string | null>(null)

  const [googleConnected, setGoogleConnected] = useState(Boolean(initialUser?.googleCalendarConnected))
  const [googleLoading, setGoogleLoading] = useState(false)
  const [googleMessage, setGoogleMessage] = useState<string | null>(null)
  const googleStatus = googleConnected ? "Connected" : "Not connected"
  const [notifications, setNotifications] = useState<NotificationState>(
    initialUser?.notificationPreferences ?? DEFAULT_NOTIFICATIONS
  )
  const [notificationLoadingKey, setNotificationLoadingKey] = useState<keyof NotificationState | null>(
    null
  )
  const [notificationMessage, setNotificationMessage] = useState<string | null>(null)

  const [initialLoadDone, setInitialLoadDone] = useState(false)

  const syncUserState = (nextUser: NonNullable<typeof user>) => {
    setUser(nextUser)
    setAuthUser(nextUser)
    setProfileName(nextUser.name)
    setGoogleConnected(Boolean(nextUser.googleCalendarConnected))
    setNotifications(nextUser.notificationPreferences ?? DEFAULT_NOTIFICATIONS)
  }

  const refreshUser = async () => {
    if (!hasAccessToken()) {
      setUser(null)
      setGoogleConnected(false)
      setInitialLoadDone(true)
      return
    }

    const me = await getMe()
    syncUserState(me)
    setInitialLoadDone(true)
  }

  const handleSaveProfile = async () => {
    if (!hasAccessToken()) {
      setProfileMessage("Please login first.")
      return
    }

    setProfileLoading(true)
    setProfileMessage(null)

    try {
      const updated = await updateMe({ name: profileName.trim() })
      syncUserState(updated)
      setProfileMessage("Name updated successfully.")
    } catch (requestError) {
      setProfileMessage(requestError instanceof Error ? requestError.message : "Failed to update profile")
    } finally {
      setProfileLoading(false)
    }
  }

  const handleResendVerification = async () => {
    if (!hasAccessToken()) {
      setVerificationMessage("Please login first.")
      return
    }

    setVerificationLoading(true)
    setVerificationMessage(null)

    try {
      const result = await resendVerificationEmail()
      if (result.sent) {
        setVerificationMessage("Verification email sent. Check your inbox.")
      } else if (result.reason === "already_verified") {
        setVerificationMessage("Email is already verified.")
      } else {
        setVerificationMessage("Email verification is running in mock mode, so no email was sent.")
      }
    } catch (requestError) {
      setVerificationMessage(
        requestError instanceof Error ? requestError.message : "Failed to send verification email"
      )
    } finally {
      setVerificationLoading(false)
    }
  }

  const handleRefreshVerification = async () => {
    if (!hasAccessToken()) {
      setVerificationMessage("Please login first.")
      return
    }

    setVerificationLoading(true)
    setVerificationMessage(null)

    try {
      const me = await getMe()
      syncUserState(me)
      setVerificationMessage(me.emailVerified ? "Email verified successfully." : "Email still not verified.")
    } catch (requestError) {
      setVerificationMessage(
        requestError instanceof Error ? requestError.message : "Failed to refresh verification status"
      )
    } finally {
      setVerificationLoading(false)
    }
  }

  const handleGoogleConnect = async () => {
    if (!hasAccessToken()) {
      setGoogleMessage("Please login first.")
      return
    }

    setGoogleLoading(true)
    setGoogleMessage(null)

    try {
      const { url } = await getGooglePlannerConnectUrl()
      window.location.assign(url)
    } catch (requestError) {
      setGoogleMessage(
        requestError instanceof Error ? requestError.message : "Failed to start Google connection"
      )
      setGoogleLoading(false)
    }
  }

  const handleGoogleDisconnect = async () => {
    if (!hasAccessToken()) {
      setGoogleMessage("Please login first.")
      return
    }

    setGoogleLoading(true)
    setGoogleMessage(null)

    try {
      await disconnectGooglePlanner()
      setGoogleConnected(false)
      setGoogleMessage("Google Calendar disconnected")

      const me = await getMe()
      syncUserState(me)
    } catch (requestError) {
      setGoogleMessage(
        requestError instanceof Error ? requestError.message : "Failed to disconnect Google Calendar"
      )
    } finally {
      setGoogleLoading(false)
    }
  }

  const handleUpdatePassword = async () => {
    if (!hasAccessToken()) {
      setPasswordUpdateMessage("Please login first.")
      return
    }

    if (!passwordForm.oldPassword || !passwordForm.newPassword || !passwordForm.confirmNewPassword) {
      setPasswordUpdateMessage("Please fill old, new and confirm password fields.")
      return
    }

    if (passwordForm.newPassword !== passwordForm.confirmNewPassword) {
      setPasswordUpdateMessage("New password and confirm new password must match.")
      return
    }

    setPasswordUpdateLoading(true)
    setPasswordUpdateMessage(null)

    try {
      await changePassword(passwordForm)
      setPasswordForm({ oldPassword: "", newPassword: "", confirmNewPassword: "" })
      setPasswordUpdateMessage("Password updated successfully.")
    } catch (requestError) {
      setPasswordUpdateMessage(
        requestError instanceof Error ? requestError.message : "Failed to update password"
      )
    } finally {
      setPasswordUpdateLoading(false)
    }
  }

  const handleNotificationToggle = async (key: keyof NotificationState, checked: boolean) => {
    if (!hasAccessToken()) {
      setNotificationMessage("Please login first.")
      return
    }

    const previous = notifications
    const next = { ...notifications, [key]: checked }
    setNotifications(next)
    setNotificationLoadingKey(key)
    setNotificationMessage(null)

    try {
      const updated = await updateNotificationPreferences({ [key]: checked })
      syncUserState(updated)
      setNotificationMessage("Notification preferences updated.")
    } catch (requestError) {
      setNotifications(previous)
      setNotificationMessage(
        requestError instanceof Error ? requestError.message : "Failed to update notification preference"
      )
    } finally {
      setNotificationLoadingKey(null)
    }
  }

  useEffect(() => {
    let active = true

    const loadUser = async () => {
      try {
        await refreshUser()
        if (!active) {
          return
        }
      } catch {
        if (active) {
          setUser(null)
          setGoogleConnected(false)
          setInitialLoadDone(true)
        }
      }
    }

    void loadUser()

    return () => {
      active = false
    }
  }, [])

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
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={profileName}
                  onChange={(event) => setProfileName(event.target.value)}
                  disabled={!hasAccessToken() || !initialLoadDone}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={user?.email ?? ""} disabled readOnly />
                <p className="text-xs text-muted-foreground">Email cannot be changed from settings.</p>
              </div>
              <Button onClick={() => void handleSaveProfile()} disabled={profileLoading || !hasAccessToken()}>
                {profileLoading ? "Saving..." : "Save Changes"}
              </Button>
              {profileMessage ? <p className="text-xs text-muted-foreground">{profileMessage}</p> : null}
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
                Manage your account security.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="oldPassword">Old Password</Label>
                <Input
                  id="oldPassword"
                  type="password"
                  value={passwordForm.oldPassword}
                  onChange={(event) =>
                    setPasswordForm((value) => ({ ...value, oldPassword: event.target.value }))
                  }
                  disabled={passwordUpdateLoading || !hasAccessToken()}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(event) =>
                    setPasswordForm((value) => ({ ...value, newPassword: event.target.value }))
                  }
                  disabled={passwordUpdateLoading || !hasAccessToken()}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="confirmNewPassword">Confirm New Password</Label>
                <Input
                  id="confirmNewPassword"
                  type="password"
                  value={passwordForm.confirmNewPassword}
                  onChange={(event) =>
                    setPasswordForm((value) => ({ ...value, confirmNewPassword: event.target.value }))
                  }
                  disabled={passwordUpdateLoading || !hasAccessToken()}
                />
              </div>
              <Button
                variant="outline"
                onClick={() => void handleUpdatePassword()}
                disabled={passwordUpdateLoading || !hasAccessToken()}
              >
                {passwordUpdateLoading ? "Please wait..." : "Update Password"}
              </Button>
              {passwordUpdateMessage ? (
                <p className="text-xs text-muted-foreground">{passwordUpdateMessage}</p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <MailCheck className="size-5 text-muted-foreground" />
                <CardTitle>Email Verification</CardTitle>
              </div>
              <CardDescription>
                Planner features require a verified email address.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Status: {user?.emailVerified ? "Verified" : "Not verified"}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() => void handleResendVerification()}
                  disabled={verificationLoading || !hasAccessToken() || user?.emailVerified}
                >
                  {verificationLoading ? "Please wait..." : "Resend Verification Email"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => void handleRefreshVerification()}
                  disabled={verificationLoading || !hasAccessToken()}
                >
                  Refresh Status
                </Button>
              </div>
              {verificationMessage ? (
                <p className="text-xs text-muted-foreground">{verificationMessage}</p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Link2 className="size-5 text-muted-foreground" />
                <CardTitle>Google Calendar</CardTitle>
              </div>
              <CardDescription>
                Connect Google Calendar for planner sync.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">Status: {googleStatus}</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() => void handleGoogleConnect()}
                  disabled={googleLoading || !hasAccessToken() || googleConnected}
                >
                  {googleLoading ? "Please wait..." : "Connect Google"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => void handleGoogleDisconnect()}
                  disabled={googleLoading || !hasAccessToken() || !googleConnected}
                >
                  Disconnect Google
                </Button>
                <Button
                  variant="outline"
                  onClick={() => void refreshUser()}
                  disabled={googleLoading || !hasAccessToken()}
                >
                  Refresh Status
                </Button>
              </div>
              {googleMessage ? <p className="text-xs text-muted-foreground">{googleMessage}</p> : null}
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
                  disabled={notificationLoadingKey !== null || !hasAccessToken()}
                  onCheckedChange={(checked) => void handleNotificationToggle("email", checked)}
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
                  disabled={notificationLoadingKey !== null || !hasAccessToken()}
                  onCheckedChange={(checked) => void handleNotificationToggle("streak", checked)}
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
                  disabled={notificationLoadingKey !== null || !hasAccessToken()}
                  onCheckedChange={(checked) => void handleNotificationToggle("applications", checked)}
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
                  disabled={notificationLoadingKey !== null || !hasAccessToken()}
                  onCheckedChange={(checked) => void handleNotificationToggle("weekly", checked)}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Planner Reminder Emails</p>
                  <p className="text-xs text-muted-foreground">
                    Task reminder emails from planner reminders
                  </p>
                </div>
                <Switch
                  checked={notifications.plannerReminders}
                  disabled={notificationLoadingKey !== null || !hasAccessToken()}
                  onCheckedChange={(checked) => void handleNotificationToggle("plannerReminders", checked)}
                />
              </div>
              {notificationMessage ? (
                <p className="text-xs text-muted-foreground">{notificationMessage}</p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Account Actions</CardTitle>
              <CardDescription>
                Export and delete account options will be added later.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                This section is intentionally disabled for now.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
