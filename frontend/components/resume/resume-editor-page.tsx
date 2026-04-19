"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { ArrowLeft, CheckCircle2, Clock3, FilePlus2, FileText, Loader2, Save, Upload } from "lucide-react"
import { toast } from "sonner"
import { StreamLanguage } from "@codemirror/language"
import { stex } from "@codemirror/legacy-modes/mode/stex"
import { oneDark } from "@codemirror/theme-one-dark"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { getResumeById, getResumeFileUrl, type ResumeRecord, updateResume } from "@/lib/api"

const CodeMirror = dynamic(() => import("@uiw/react-codemirror"), {
  ssr: false,
  loading: () => (
    <div className="flex h-128 items-center justify-center rounded-xl border bg-muted/20 text-sm text-muted-foreground">
      Loading editor...
    </div>
  ),
})

interface ResumeEditorPageProps {
  resumeId: string
}

interface PreviewSection {
  title: string
  lines: string[]
}

interface ParsedPreview {
  name: string
  sections: PreviewSection[]
}

interface ResumeEditorFile {
  id: string
  name: string
  content: string
  type: "tex" | "cls" | "other"
}

interface ResumeContentPayload {
  files: Array<{
    name: string
    content: string
  }>
  activeFileName?: string
}

function detectFileType(fileName: string): ResumeEditorFile["type"] {
  const lower = fileName.toLowerCase()
  if (lower.endsWith(".tex")) {
    return "tex"
  }

  if (lower.endsWith(".cls")) {
    return "cls"
  }

  return "other"
}

function buildFileId(fileName: string) {
  return `${fileName}-${Math.random().toString(36).slice(2, 8)}`
}

function normalizeLoadedFiles(content: ResumeRecord["content"]): {
  files: ResumeEditorFile[]
  activeFileId: string
} {
  if (typeof content === "string") {
    const fileName = "resume.tex"
    const fileId = buildFileId(fileName)
    return {
      files: [
        {
          id: fileId,
          name: fileName,
          content,
          type: "tex",
        },
      ],
      activeFileId: fileId,
    }
  }

  if (content && typeof content === "object") {
    const rawPayload = content as Partial<ResumeContentPayload>
    const payloadFiles = Array.isArray(rawPayload.files) ? rawPayload.files : []

    if (payloadFiles.length > 0) {
      const files = payloadFiles
        .filter((file) => typeof file?.name === "string" && typeof file?.content === "string")
        .map((file) => ({
          id: buildFileId(file.name),
          name: file.name,
          content: file.content,
          type: detectFileType(file.name),
        }))

      if (files.length > 0) {
        const preferredActive = files.find((file) => file.name === rawPayload.activeFileName)
        const fallbackActive = files.find((file) => file.type === "tex") ?? files[0]

        return {
          files,
          activeFileId: preferredActive?.id ?? fallbackActive.id,
        }
      }
    }

    const stringified = JSON.stringify(content, null, 2)
    const fileName = "resume.tex"
    const fileId = buildFileId(fileName)

    return {
      files: [
        {
          id: fileId,
          name: fileName,
          content: stringified,
          type: "tex",
        },
      ],
      activeFileId: fileId,
    }
  }

  const fileName = "resume.tex"
  const fileId = buildFileId(fileName)

  return {
    files: [
      {
        id: fileId,
        name: fileName,
        content: "",
        type: "tex",
      },
    ],
    activeFileId: fileId,
  }
}

function serializeEditorContent(files: ResumeEditorFile[], activeFileId: string): ResumeRecord["content"] {
  const activeFile = files.find((file) => file.id === activeFileId)

  if (files.length === 1 && files[0]?.type === "tex") {
    return files[0].content
  }

  return {
    files: files.map((file) => ({
      name: file.name,
      content: file.content,
    })),
    activeFileName: activeFile?.name,
  }
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function parseSectionEnvironmentNames(classSources: string[]) {
  const names = new Set<string>(["rSection"])

  for (const source of classSources) {
    const envRegex = /\\newenvironment\{([^}]*)\}/g
    let match = envRegex.exec(source)

    while (match) {
      const envName = match[1]?.trim()
      if (envName && /(section|experience|project|education|summary)/i.test(envName)) {
        names.add(envName)
      }
      match = envRegex.exec(source)
    }
  }

  return Array.from(names)
}

function unwrapSimpleCommands(text: string) {
  return text
    .replace(/\\textbf\{([^}]*)\}/g, "$1")
    .replace(/\\textit\{([^}]*)\}/g, "$1")
    .replace(/\\emph\{([^}]*)\}/g, "$1")
    .replace(/\\href\{([^}]*)\}\{([^}]*)\}/g, "$2 ($1)")
}

function toPlainLine(text: string) {
  return unwrapSimpleCommands(text)
    .replace(/\\hfill/g, " - ")
    .replace(/\\\//g, "")
    .replace(/\\[a-zA-Z]+\*?(\[[^\]]*\])?(\{[^}]*\})?/g, "")
    .replace(/[{}]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

function getDocumentBody(source: string) {
  const match = source.match(/\\begin\{document\}([\s\S]*?)\\end\{document\}/)
  return match?.[1] ?? source
}

function parseTags(value: string) {
  return Array.from(
    new Set(
      value
        .split(",")
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean)
    )
  )
}

function parseLatexPreview(source: string, classSources: string[]): ParsedPreview {
  const nameMatch = source.match(/\\name\{([^}]*)\}/)
  const extractedName = nameMatch?.[1]?.trim() || "Your Name"
  const bodySource = getDocumentBody(source)
  const sections: PreviewSection[] = []

  const envNames = parseSectionEnvironmentNames(classSources)

  for (const envName of envNames) {
    const envSectionRegex = new RegExp(
      `\\\\begin\\{${escapeRegExp(envName)}\\}\\{([^}]*)\\}([\\s\\S]*?)\\\\end\\{${escapeRegExp(envName)}\\}`,
      "g"
    )
    let envSectionMatch = envSectionRegex.exec(bodySource)

    while (envSectionMatch) {
      const title = envSectionMatch[1].trim()
      const body = envSectionMatch[2]
        .replace(/\\item\s*/g, "\n- ")
        .replace(/\\\\/g, "\n")

      const lines = body
        .split(/\r?\n/)
        .map((line) => toPlainLine(line))
        .filter(Boolean)

      sections.push({ title, lines })
      envSectionMatch = envSectionRegex.exec(bodySource)
    }
  }

  const sectionRegex = /\\section\{([^}]*)\}([\s\S]*?)(?=\\section\{|\\begin\{rSection\}\{|$)/g
  let sectionMatch = sectionRegex.exec(bodySource)

  while (sectionMatch) {
    const title = sectionMatch[1].trim()
    const body = sectionMatch[2]
      .replace(/\\item\s*/g, "\n- ")
      .replace(/\\\\/g, "\n")

    const lines = body
      .split(/\r?\n/)
      .map((line) => toPlainLine(line))
      .filter(Boolean)

    sections.push({ title, lines })
    sectionMatch = sectionRegex.exec(bodySource)
  }

  if (sections.length === 0) {
    const fallbackLines = bodySource
      .split(/\r?\n/)
      .map((line) => toPlainLine(line))
      .filter((line) => Boolean(line) && !line.startsWith("%"))

    sections.push({
      title: "Preview",
      lines: fallbackLines,
    })
  }

  return {
    name: extractedName,
    sections,
  }
}

function formatSavedAt(value: Date | null) {
  if (!value) {
    return "Not saved yet"
  }

  return `Saved ${value.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })}`
}

export function ResumeEditorPage({ resumeId }: ResumeEditorPageProps) {
  const [resume, setResume] = useState<ResumeRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingError, setLoadingError] = useState<string | null>(null)

  const [name, setName] = useState("")
  const [tagsInput, setTagsInput] = useState("")
  const [editorFiles, setEditorFiles] = useState<ResumeEditorFile[]>([])
  const [activeFileId, setActiveFileId] = useState("")
  const [isDirty, setIsDirty] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [openingFile, setOpeningFile] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const uploadInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    let mounted = true

    const load = async () => {
      setLoading(true)
      setLoadingError(null)

      try {
        const data = await getResumeById(resumeId)

        if (!mounted) {
          return
        }

        setResume(data)
        setName(data.name)
        setTagsInput(data.tags.join(", "))

        const normalizedFiles = normalizeLoadedFiles(data.content)
        setEditorFiles(normalizedFiles.files)
        setActiveFileId(normalizedFiles.activeFileId)

        setLastSavedAt(new Date(data.updatedAt))
      } catch (error) {
        if (mounted) {
          setLoadingError(error instanceof Error ? error.message : "Failed to load resume")
        }
      } finally {
        if (mounted) {
          setLoading(false)
          setIsDirty(false)
        }
      }
    }

    void load()

    return () => {
      mounted = false
    }
  }, [resumeId])

  const isLatexResume = useMemo(
    () => typeof resume?.content === "string" || (!resume?.fileType && !resume?.fileUrl),
    [resume]
  )

  const activeFile = useMemo(
    () => editorFiles.find((file) => file.id === activeFileId) ?? editorFiles[0] ?? null,
    [editorFiles, activeFileId]
  )

  const primaryTexSource = useMemo(() => {
    if (activeFile?.type === "tex") {
      return activeFile.content
    }

    return editorFiles.find((file) => file.type === "tex")?.content ?? ""
  }, [editorFiles, activeFile])

  const classSources = useMemo(
    () => editorFiles.filter((file) => file.type === "cls").map((file) => file.content),
    [editorFiles]
  )

  const parsedPreview = useMemo(
    () => parseLatexPreview(primaryTexSource, classSources),
    [primaryTexSource, classSources]
  )
  const liveTags = useMemo(() => parseTags(tagsInput), [tagsInput])

  const saveChanges = useCallback(async () => {
    if (!resume || !isDirty || !isLatexResume || isSaving) {
      return
    }

    setIsSaving(true)
    setSaveError(null)

    try {
      const updated = await updateResume(resumeId, {
        name: name.trim() || resume.name,
        tags: parseTags(tagsInput),
        content: serializeEditorContent(editorFiles, activeFileId),
      })

      setResume(updated)
      setName(updated.name)
      setTagsInput(updated.tags.join(", "))
      const normalizedFiles = normalizeLoadedFiles(updated.content)
      setEditorFiles(normalizedFiles.files)
      setActiveFileId(normalizedFiles.activeFileId)
      setIsDirty(false)
      setLastSavedAt(new Date())
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Failed to save")
    } finally {
      setIsSaving(false)
    }
  }, [resume, isDirty, isLatexResume, isSaving, resumeId, name, tagsInput, editorFiles, activeFileId])

  const handleAddFile = useCallback(() => {
    const nextName = window.prompt("Enter a file name (e.g. resume.cls or cover.tex)", "resume.cls")

    if (!nextName) {
      return
    }

    const fileName = nextName.trim()
    if (!fileName) {
      toast.error("File name cannot be empty")
      return
    }

    const duplicate = editorFiles.some(
      (file) => file.name.toLowerCase() === fileName.toLowerCase()
    )

    if (duplicate) {
      toast.error("A file with this name already exists")
      return
    }

    const fileType = detectFileType(fileName)
    const starterContent =
      fileType === "cls"
        ? "% Resume class file\n\\ProvidesClass{resume}\n\\LoadClass{article}\n"
        : fileType === "tex"
          ? "\\begin{document}\n\\section{New Section}\nAdd content here.\n\\end{document}\n"
          : ""

    const fileId = buildFileId(fileName)

    setEditorFiles((previous) => [
      ...previous,
      {
        id: fileId,
        name: fileName,
        content: starterContent,
        type: fileType,
      },
    ])
    setActiveFileId(fileId)
    setIsDirty(true)
  }, [editorFiles])

  const handleUploadFile = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) {
        return
      }

      const fileName = file.name.trim()
      const duplicate = editorFiles.some(
        (existingFile) => existingFile.name.toLowerCase() === fileName.toLowerCase()
      )

      if (duplicate) {
        toast.error("A file with this name already exists")
        event.target.value = ""
        return
      }

      try {
        const content = await file.text()
        const fileType = detectFileType(fileName)
        const fileId = buildFileId(fileName)

        setEditorFiles((previous) => [
          ...previous,
          {
            id: fileId,
            name: fileName,
            content,
            type: fileType,
          },
        ])
        setActiveFileId(fileId)
        setIsDirty(true)
      } catch {
        toast.error("Failed to read file")
      } finally {
        event.target.value = ""
      }
    },
    [editorFiles]
  )

  useEffect(() => {
    if (!isDirty || !isLatexResume) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      void saveChanges()
    }, 1200)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [isDirty, isLatexResume, saveChanges])

  const handleOpenUploadedResume = useCallback(async () => {
    if (!resume) {
      return
    }

    setOpeningFile(true)
    try {
      const response = await getResumeFileUrl(resume._id)
      window.open(response.url, "_blank", "noopener,noreferrer")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to open resume file")
    } finally {
      setOpeningFile(false)
    }
  }, [resume])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-80 animate-pulse rounded bg-muted/60" />
        <div className="h-144 animate-pulse rounded-2xl bg-muted/40" />
      </div>
    )
  }

  if (loadingError || !resume) {
    return (
      <Card>
        <CardContent className="flex flex-col items-start gap-3 py-8">
          <p className="text-sm font-medium text-destructive">
            {loadingError ?? "Resume not found"}
          </p>
          <Button asChild variant="outline">
            <Link href="/resume">
              <ArrowLeft className="size-4" />
              Back to Resume Manager
            </Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!isLatexResume) {
    return (
      <div className="space-y-4">
        <Button asChild variant="outline" size="sm">
          <Link href="/resume">
            <ArrowLeft className="size-4" />
            Back
          </Link>
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>{resume.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              This resume was uploaded as {resume.fileType?.toUpperCase() ?? "a file"}. LaTeX editing is available for resumes created with source content.
            </p>
            {resume.fileUrl ? (
              <Button onClick={() => void handleOpenUploadedResume()} disabled={openingFile}>
                {openingFile ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />}
                {openingFile ? "Opening..." : "Open Uploaded Resume"}
              </Button>
            ) : null}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/resume">
              <ArrowLeft className="size-4" />
              Back to Resume Manager
            </Link>
          </Button>

          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">{name || resume.name}</h1>
            <p className="text-sm text-muted-foreground">
              Modern LaTeX workspace with live preview and autosave.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant={isDirty ? "secondary" : "outline"} className="gap-1">
            {isSaving ? (
              <Loader2 className="size-3 animate-spin" />
            ) : isDirty ? (
              <Clock3 className="size-3" />
            ) : (
              <CheckCircle2 className="size-3" />
            )}
            {isSaving ? "Saving..." : isDirty ? "Unsaved" : "Synced"}
          </Badge>

          <Button
            onClick={() => void saveChanges()}
            disabled={!isDirty || isSaving}
            className={cn(!isDirty && "opacity-60")}
          >
            <Save className="size-4" />
            Save Now
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="overflow-hidden border-slate-300/50">
          <CardHeader className="space-y-4 border-b bg-muted/10">
            <CardTitle className="text-base">LaTeX Editor</CardTitle>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                value={name}
                onChange={(event) => {
                  setName(event.target.value)
                  setIsDirty(true)
                }}
                placeholder="Resume name"
              />
              <Input
                value={tagsInput}
                onChange={(event) => {
                  setTagsInput(event.target.value)
                  setIsDirty(true)
                }}
                placeholder="backend, full-stack, internship"
              />
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="grid h-128 md:grid-cols-[14rem_1fr]">
              <aside className="border-r bg-muted/10">
                <div className="flex items-center justify-between border-b px-3 py-2">
                  <p className="text-xs font-medium uppercase text-muted-foreground">File Tree</p>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      onClick={handleAddFile}
                      title="Add file"
                    >
                      <FilePlus2 className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      onClick={() => uploadInputRef.current?.click()}
                      title="Upload file"
                    >
                      <Upload className="size-4" />
                    </Button>
                    <input
                      ref={uploadInputRef}
                      type="file"
                      accept=".tex,.cls,.sty,.txt"
                      className="hidden"
                      onChange={(event) => void handleUploadFile(event)}
                    />
                  </div>
                </div>

                <div className="max-h-122 overflow-y-auto p-2">
                  <div className="space-y-1">
                    {editorFiles.map((file) => (
                      <button
                        key={file.id}
                        type="button"
                        onClick={() => setActiveFileId(file.id)}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                          file.id === activeFileId
                            ? "bg-primary/10 font-medium text-primary"
                            : "hover:bg-accent"
                        )}
                      >
                        <FileText className="size-4" />
                        <span className="truncate">{file.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </aside>

              <div>
                <CodeMirror
                  value={activeFile?.content ?? ""}
                  height="32rem"
                  theme={oneDark}
                  extensions={[StreamLanguage.define(stex)]}
                  basicSetup={{
                    lineNumbers: true,
                    foldGutter: true,
                    autocompletion: true,
                    bracketMatching: true,
                    closeBrackets: true,
                    highlightActiveLine: true,
                  }}
                  onChange={(value) => {
                    if (!activeFile) {
                      return
                    }

                    setEditorFiles((previous) =>
                      previous.map((file) =>
                        file.id === activeFile.id ? { ...file, content: value } : file
                      )
                    )
                    setIsDirty(true)
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-300/50">
          <CardHeader className="border-b bg-muted/10">
            <CardTitle className="text-base">Live Resume Output</CardTitle>
            <p className="text-xs text-muted-foreground">{formatSavedAt(lastSavedAt)}</p>
          </CardHeader>
          <CardContent className="h-128 overflow-y-auto bg-linear-to-b from-muted/10 to-transparent p-6">
            <article className="mx-auto w-full max-w-xl rounded-xl border bg-background p-6 shadow-sm">
              <header className="space-y-1">
                <h2 className="text-xl font-semibold tracking-tight">{parsedPreview.name}</h2>
                {liveTags.length > 0 ? (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {liveTags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs capitalize">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </header>

              <Separator className="my-4" />

              <div className="space-y-4">
                {parsedPreview.sections.map((section) => (
                  <section key={`${section.title}-${section.lines.length}`} className="space-y-2">
                    <h3 className="border-b pb-1 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      {section.title}
                    </h3>
                    {section.lines.length > 0 ? (
                      <ul className="space-y-1 text-sm leading-6">
                        {section.lines.map((line, index) => (
                          <li key={`${section.title}-${index}`}>{line}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground">No content yet.</p>
                    )}
                  </section>
                ))}
              </div>
            </article>
          </CardContent>
        </Card>
      </div>

      {saveError ? <p className="text-sm text-destructive">{saveError}</p> : null}
    </div>
  )
}