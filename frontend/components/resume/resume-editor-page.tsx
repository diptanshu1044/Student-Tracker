"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Command,
  FileDown,
  FilePlus2,
  FileSearch,
  FileText,
  Hash,
  Loader2,
  Maximize2,
  Minimize2,
  MoreVertical,
  PanelLeft,
  PanelRight,
  Replace,
  Search,
  Save,
  Type,
  Upload,
  WandSparkles,
  WrapText,
  ZoomIn,
  ZoomOut,
} from "lucide-react"
import { toast } from "sonner"
import { StreamLanguage } from "@codemirror/language"
import { stex } from "@codemirror/legacy-modes/mode/stex"
import { oneDark } from "@codemirror/theme-one-dark"
import { EditorView } from "@codemirror/view"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
  CommandSeparator,
} from "@/components/ui/command"
import { Input } from "@/components/ui/input"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { Separator } from "@/components/ui/separator"
import { useSidebar } from "@/components/ui/sidebar"
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
  entryFileName?: string
}

interface EditorCursorPosition {
  line: number
  column: number
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

function isValidFileName(fileName: string) {
  return /^[a-zA-Z0-9._-]+$/.test(fileName)
}

function buildUniqueCopyName(files: ResumeEditorFile[], sourceName: string) {
  const dotIndex = sourceName.lastIndexOf(".")
  const base = dotIndex > 0 ? sourceName.slice(0, dotIndex) : sourceName
  const ext = dotIndex > 0 ? sourceName.slice(dotIndex) : ""

  let nextName = `${base}-copy${ext}`
  let copyIndex = 2

  while (files.some((file) => file.name.toLowerCase() === nextName.toLowerCase())) {
    nextName = `${base}-copy-${copyIndex}${ext}`
    copyIndex += 1
  }

  return nextName
}

function downloadTextAsFile(content: string, fileName: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = fileName
  anchor.click()
  URL.revokeObjectURL(url)
}

function normalizeLoadedFiles(content: ResumeRecord["content"]): {
  files: ResumeEditorFile[]
  activeFileId: string
  entryFileId: string
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
      entryFileId: fileId,
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
        const preferredEntry = files.find((file) => file.name === rawPayload.entryFileName)
        const fallbackActive = files.find((file) => file.type === "tex") ?? files[0]
        const fallbackEntry = files.find((file) => file.type === "tex") ?? fallbackActive

        return {
          files,
          activeFileId: preferredActive?.id ?? fallbackActive.id,
          entryFileId: preferredEntry?.id ?? fallbackEntry.id,
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
      entryFileId: fileId,
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
    entryFileId: fileId,
  }
}

function serializeEditorContent(
  files: ResumeEditorFile[],
  activeFileId: string,
  entryFileId: string
): ResumeRecord["content"] {
  const activeFile = files.find((file) => file.id === activeFileId)
  const entryFile = files.find((file) => file.id === entryFileId)

  if (files.length === 1 && files[0]?.type === "tex") {
    return files[0].content
  }

  return {
    files: files.map((file) => ({
      name: file.name,
      content: file.content,
    })),
    activeFileName: activeFile?.name,
    entryFileName: entryFile?.name,
  }
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function buildSearchPattern(
  query: string,
  options: {
    useRegex: boolean
    matchCase: boolean
    global: boolean
  }
) {
  const trimmedQuery = query.trim()
  if (!trimmedQuery) {
    return { regex: null as RegExp | null, error: "Enter text to search" }
  }

  const flags = `${options.global ? "g" : ""}${options.matchCase ? "" : "i"}`

  try {
    const source = options.useRegex ? trimmedQuery : escapeRegExp(trimmedQuery)
    const regex = new RegExp(source, flags)

    if (regex.test("")) {
      return {
        regex: null as RegExp | null,
        error: "Pattern cannot match empty text",
      }
    }

    regex.lastIndex = 0
    return { regex, error: null as string | null }
  } catch {
    return {
      regex: null as RegExp | null,
      error: "Invalid regular expression",
    }
  }
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

function stripLatexComments(source: string) {
  return source
    .split(/\r?\n/)
    .map((line) => line.replace(/(^|[^\\])%.*/, "$1"))
    .join("\n")
}

function normalizeResumeMacros(source: string) {
  return source
    .replace(
      /\\begin\{rSubsection\}\{([^}]*)\}\{([^}]*)\}\{([^}]*)\}\{([^}]*)\}/g,
      "\n$3 || $2\n$1 || $4\n"
    )
    .replace(
      /\\resumeSubheading\{([^}]*)\}\{([^}]*)\}\{([^}]*)\}\{([^}]*)\}/g,
      "\n$3 || $2\n$1 || $4\n"
    )
    .replace(
      /\\resumeProjectHeading\{([^}]*)\}\{([^}]*)\}/g,
      "\n$1 || $2\n"
    )
    .replace(/\\resumeItem\{([^}]*)\}/g, "\n- $1")
    .replace(/\\resumeSubItem\{([^}]*)\}/g, "\n- $1")
    .replace(/\\end\{rSubsection\}/g, "\n")
    .replace(/\\resumeSubHeadingListStart/g, "\n")
    .replace(/\\resumeSubHeadingListEnd/g, "\n")
    .replace(/\\resumeItemListStart/g, "\n")
    .replace(/\\resumeItemListEnd/g, "\n")
}

function sanitizePreviewLine(line: string) {
  if (!line) {
    return ""
  }

  return line
    .replace(/\s*\|\|\s*/g, " | ")
    .replace(/\s{2,}/g, " ")
    .replace(/^[-*]\s+$/, "")
    .trim()
}

function splitPreviewColumns(line: string) {
  const chunks = line
    .split(" | ")
    .map((part) => part.trim())
    .filter(Boolean)

  if (chunks.length < 2) {
    return null
  }

  const left = chunks[0]
  const right = chunks.slice(1).join(" | ")
  return { left, right }
}

function toPlainLine(text: string) {
  return sanitizePreviewLine(
    unwrapSimpleCommands(text)
      .replace(/\\hfill/g, " || ")
      .replace(/\\\//g, "")
      .replace(/\\[a-zA-Z]+\*?(\[[^\]]*\])?/g, "")
      .replace(/[{}]/g, "")
      .replace(/\s+/g, " ")
      .trim()
  )
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
  const bodySource = normalizeResumeMacros(stripLatexComments(getDocumentBody(source)))
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
        .filter((line) => Boolean(line) && line !== "%")

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
      .filter((line) => Boolean(line) && line !== "%")

    sections.push({ title, lines })
    sectionMatch = sectionRegex.exec(bodySource)
  }

  if (sections.length === 0) {
    const fallbackLines = bodySource
      .split(/\r?\n/)
      .map((line) => toPlainLine(line))
      .filter((line) => Boolean(line) && !line.startsWith("%") && line !== "%")

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
  const PREVIEW_BASE_WIDTH = 794
  const PREVIEW_BASE_MIN_HEIGHT = 1123
  const PREVIEW_DEFAULT_ZOOM = 70
  const PREVIEW_MIN_ZOOM = 50
  const PREVIEW_MAX_ZOOM = 200
  const PREVIEW_ZOOM_STEP = 10

  const { setOpen: setSidebarOpen } = useSidebar()
  const [resume, setResume] = useState<ResumeRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingError, setLoadingError] = useState<string | null>(null)

  const [name, setName] = useState("")
  const [tagsInput, setTagsInput] = useState("")
  const [editorFiles, setEditorFiles] = useState<ResumeEditorFile[]>([])
  const [activeFileId, setActiveFileId] = useState("")
  const [entryFileId, setEntryFileId] = useState("")
  const [isDirty, setIsDirty] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [openingFile, setOpeningFile] = useState(false)
  const [wordWrap, setWordWrap] = useState(false)
  const [showFileTree, setShowFileTree] = useState(true)
  const [showPreviewPanel, setShowPreviewPanel] = useState(true)
  const [fontSize, setFontSize] = useState(14)
  const [findReplaceOpen, setFindReplaceOpen] = useState(false)
  const [findQuery, setFindQuery] = useState("")
  const [replaceValue, setReplaceValue] = useState("")
  const [matchCase, setMatchCase] = useState(false)
  const [useRegex, setUseRegex] = useState(false)
  const [goToLineDialogOpen, setGoToLineDialogOpen] = useState(false)
  const [goToLineValue, setGoToLineValue] = useState("1")
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [shortcutsDialogOpen, setShortcutsDialogOpen] = useState(false)
  const [cursorPosition, setCursorPosition] = useState<EditorCursorPosition>({ line: 1, column: 1 })
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [addFileDialogOpen, setAddFileDialogOpen] = useState(false)
  const [addFileName, setAddFileName] = useState("resume.cls")
  const [renameDialogOpen, setRenameDialogOpen] = useState(false)
  const [renameTargetId, setRenameTargetId] = useState<string | null>(null)
  const [renameFileName, setRenameFileName] = useState("")
  const [quickOpenDialogOpen, setQuickOpenDialogOpen] = useState(false)
  const [quickOpenQuery, setQuickOpenQuery] = useState("")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [isEditorFullscreen, setIsEditorFullscreen] = useState(false)
  const [previewZoom, setPreviewZoom] = useState(PREVIEW_DEFAULT_ZOOM)
  const editorViewRef = useRef<EditorView | null>(null)
  const cursorPositionRef = useRef<EditorCursorPosition>({ line: 1, column: 1 })
  const workspacePanelRef = useRef<HTMLDivElement | null>(null)
  const uploadInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    setSidebarOpen(false)
  }, [setSidebarOpen])

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
        setEntryFileId(normalizedFiles.entryFileId)

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
    const entryFile = editorFiles.find((file) => file.id === entryFileId)
    if (entryFile?.type === "tex") {
      return entryFile.content
    }

    return editorFiles.find((file) => file.type === "tex")?.content ?? ""
  }, [editorFiles, entryFileId])

  const classSources = useMemo(
    () => editorFiles.filter((file) => file.type === "cls").map((file) => file.content),
    [editorFiles]
  )

  const parsedPreview = useMemo(
    () => parseLatexPreview(primaryTexSource, classSources),
    [primaryTexSource, classSources]
  )
  const liveTags = useMemo(() => parseTags(tagsInput), [tagsInput])
  const previewScale = previewZoom / 100
  const editorTypographyTheme = useMemo(
    () =>
      EditorView.theme({
        ".cm-editor": {
          height: "100%",
        },
        "&": {
          fontSize: `${fontSize}px`,
        },
        ".cm-scroller": {
          fontFamily: "JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, monospace",
          lineHeight: "1.6",
          overflow: "auto",
          overscrollBehavior: "contain",
        },
        ".cm-content": {
          minHeight: "100%",
        },
      }),
    [fontSize]
  )

  const editorExtensions = useMemo(
    () => [StreamLanguage.define(stex), ...(wordWrap ? [EditorView.lineWrapping] : []), editorTypographyTheme],
    [wordWrap, editorTypographyTheme]
  )

  const findPatternFeedback = useMemo(() => {
    if (!findQuery.trim()) {
      return null
    }

    const { error } = buildSearchPattern(findQuery, {
      useRegex,
      matchCase,
      global: true,
    })

    return error
  }, [findQuery, useRegex, matchCase])

  const findMatchCount = useMemo(() => {
    if (!activeFile || !findQuery.trim()) {
      return 0
    }

    const { regex } = buildSearchPattern(findQuery, {
      useRegex,
      matchCase,
      global: true,
    })

    if (!regex) {
      return 0
    }

    const matches = activeFile.content.match(regex)
    return matches?.length ?? 0
  }, [activeFile, findQuery, useRegex, matchCase])

  const saveChanges = useCallback(async () => {
    if (!resume || !isDirty || !isLatexResume || isSaving) {
      return
    }

    if (!editorFiles.some((file) => file.type === "tex")) {
      setSaveError("At least one .tex file is required")
      toast.error("At least one .tex file is required")
      return
    }

    setIsSaving(true)
    setSaveError(null)

    try {
      const updated = await updateResume(resumeId, {
        name: name.trim() || resume.name,
        tags: parseTags(tagsInput),
        content: serializeEditorContent(editorFiles, activeFileId, entryFileId),
      })

      setResume(updated)
      setName(updated.name)
      setTagsInput(updated.tags.join(", "))
      const normalizedFiles = normalizeLoadedFiles(updated.content)
      setEditorFiles(normalizedFiles.files)
      setActiveFileId(normalizedFiles.activeFileId)
      setEntryFileId(normalizedFiles.entryFileId)
      setIsDirty(false)
      setLastSavedAt(new Date())
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Failed to save")
    } finally {
      setIsSaving(false)
    }
  }, [
    resume,
    isDirty,
    isLatexResume,
    isSaving,
    resumeId,
    name,
    tagsInput,
    editorFiles,
    activeFileId,
    entryFileId,
  ])

  const createFileByName = useCallback(
    (rawFileName: string) => {
      const fileName = rawFileName.trim()
      if (!fileName) {
        toast.error("File name cannot be empty")
        return false
      }

      if (!isValidFileName(fileName)) {
        toast.error("Use only letters, numbers, dot, dash, and underscore")
        return false
      }

      const duplicate = editorFiles.some(
        (file) => file.name.toLowerCase() === fileName.toLowerCase()
      )

      if (duplicate) {
        toast.error("A file with this name already exists")
        return false
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
      return true
    },
    [editorFiles]
  )

  const handleAddFile = useCallback(() => {
    setAddFileName("resume.cls")
    setAddFileDialogOpen(true)
  }, [])

  const handleConfirmAddFile = useCallback(() => {
    const created = createFileByName(addFileName)
    if (created) {
      setAddFileDialogOpen(false)
    }
  }, [addFileName, createFileByName])

  const handleUploadFile = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = Array.from(event.target.files ?? [])
      if (selectedFiles.length === 0) {
        return
      }

      try {
        const existingNames = new Set(editorFiles.map((file) => file.name.toLowerCase()))
        const newFiles: ResumeEditorFile[] = []

        for (const file of selectedFiles) {
          const fileName = file.name.trim()

          if (!fileName || !isValidFileName(fileName)) {
            continue
          }

          if (existingNames.has(fileName.toLowerCase())) {
            continue
          }

          if (file.size > 1024 * 1024) {
            continue
          }

          const content = await file.text()
          newFiles.push({
            id: buildFileId(fileName),
            name: fileName,
            content,
            type: detectFileType(fileName),
          })
          existingNames.add(fileName.toLowerCase())
        }

        if (newFiles.length === 0) {
          toast.error("No valid files were imported")
          return
        }

        setEditorFiles((previous) => [...previous, ...newFiles])
        setActiveFileId(newFiles[0].id)
        setIsDirty(true)
        toast.success(`Imported ${newFiles.length} file${newFiles.length > 1 ? "s" : ""}`)
      } catch {
        toast.error("Failed to read file")
      } finally {
        event.target.value = ""
      }
    },
    [editorFiles]
  )

  const handleRenameFile = useCallback(
    (fileId: string) => {
      const file = editorFiles.find((item) => item.id === fileId)
      if (!file) {
        return
      }

      setRenameTargetId(fileId)
      setRenameFileName(file.name)
      setRenameDialogOpen(true)
    },
    [editorFiles]
  )

  const handleConfirmRenameFile = useCallback(() => {
    if (!renameTargetId) {
      return
    }

    const nextName = renameFileName.trim()
    if (!nextName) {
      toast.error("File name cannot be empty")
      return
    }

    if (!isValidFileName(nextName)) {
      toast.error("Use only letters, numbers, dot, dash, and underscore")
      return
    }

    const duplicate = editorFiles.some(
      (item) => item.id !== renameTargetId && item.name.toLowerCase() === nextName.toLowerCase()
    )

    if (duplicate) {
      toast.error("A file with this name already exists")
      return
    }

    setEditorFiles((previous) =>
      previous.map((item) =>
        item.id === renameTargetId
          ? {
              ...item,
              name: nextName,
              type: detectFileType(nextName),
            }
          : item
      )
    )
    setIsDirty(true)
    setRenameDialogOpen(false)
    setRenameTargetId(null)
  }, [editorFiles, renameFileName, renameTargetId])

  const handleDuplicateFile = useCallback(
    (fileId: string) => {
      const file = editorFiles.find((item) => item.id === fileId)
      if (!file) {
        return
      }

      const nextName = buildUniqueCopyName(editorFiles, file.name)
      const copyFile: ResumeEditorFile = {
        id: buildFileId(nextName),
        name: nextName,
        content: file.content,
        type: detectFileType(nextName),
      }

      setEditorFiles((previous) => [...previous, copyFile])
      setActiveFileId(copyFile.id)
      setIsDirty(true)
    },
    [editorFiles]
  )

  const handleDeleteFile = useCallback(
    (fileId: string) => {
      const file = editorFiles.find((item) => item.id === fileId)
      if (!file) {
        return
      }

      if (editorFiles.length === 1) {
        toast.error("At least one file is required")
        return
      }

      const texFiles = editorFiles.filter((item) => item.type === "tex")
      if (file.type === "tex" && texFiles.length === 1) {
        toast.error("At least one .tex file is required")
        return
      }

      setDeleteTargetId(fileId)
      setDeleteDialogOpen(true)
    },
    [editorFiles]
  )

  const handleConfirmDeleteFile = useCallback(() => {
    if (!deleteTargetId) {
      return
    }

    const nextFiles = editorFiles.filter((item) => item.id !== deleteTargetId)
    if (nextFiles.length === 0) {
      setDeleteDialogOpen(false)
      return
    }

    setEditorFiles(nextFiles)

    if (activeFileId === deleteTargetId) {
      setActiveFileId(nextFiles[0]?.id ?? "")
    }

    if (entryFileId === deleteTargetId) {
      const fallbackEntry = nextFiles.find((item) => item.type === "tex") ?? nextFiles[0]
      setEntryFileId(fallbackEntry?.id ?? "")
    }

    setIsDirty(true)
    setDeleteDialogOpen(false)
    setDeleteTargetId(null)
  }, [editorFiles, activeFileId, entryFileId, deleteTargetId])

  const deleteTargetFileName = useMemo(
    () => editorFiles.find((file) => file.id === deleteTargetId)?.name ?? "this file",
    [editorFiles, deleteTargetId]
  )

  const handleSetEntryFile = useCallback(
    (fileId: string) => {
      const file = editorFiles.find((item) => item.id === fileId)
      if (!file) {
        return
      }

      if (file.type !== "tex") {
        toast.error("Only .tex files can be set as the main file")
        return
      }

      setEntryFileId(fileId)
      setIsDirty(true)
    },
    [editorFiles]
  )

  const handleFormatActiveFile = useCallback(() => {
    if (!activeFile) {
      return
    }

    const formatted = activeFile.content
      .split(/\r?\n/)
      .map((line) => line.replace(/\s+$/g, ""))
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")

    if (formatted === activeFile.content) {
      toast.info("Already formatted")
      return
    }

    setEditorFiles((previous) =>
      previous.map((file) => (file.id === activeFile.id ? { ...file, content: formatted } : file))
    )
    setIsDirty(true)
    toast.success("Formatted active file")
  }, [activeFile])

  const focusMatchInEditor = useCallback((start: number, length: number) => {
    const view = editorViewRef.current
    if (!view) {
      return
    }

    const end = start + Math.max(length, 1)
    view.dispatch({
      selection: {
        anchor: start,
        head: end,
      },
      effects: EditorView.scrollIntoView(start, {
        y: "center",
      }),
    })
    view.focus()
  }, [])

  const handleFindNext = useCallback(() => {
    if (!activeFile) {
      return
    }

    const { regex, error } = buildSearchPattern(findQuery, {
      useRegex,
      matchCase,
      global: true,
    })

    if (!regex) {
      toast.error(error ?? "Unable to search")
      return
    }

    const startIndex = editorViewRef.current?.state.selection.main.to ?? 0
    regex.lastIndex = startIndex

    let match = regex.exec(activeFile.content)
    if (!match) {
      regex.lastIndex = 0
      match = regex.exec(activeFile.content)
    }

    if (!match) {
      toast.info("No matches found")
      return
    }

    focusMatchInEditor(match.index, match[0].length)
  }, [activeFile, findQuery, useRegex, matchCase, focusMatchInEditor])

  const handleReplaceAll = useCallback(() => {
    if (!activeFile) {
      return
    }

    const { regex, error } = buildSearchPattern(findQuery, {
      useRegex,
      matchCase,
      global: true,
    })

    if (!regex) {
      toast.error(error ?? "Unable to replace")
      return
    }

    const matches = activeFile.content.match(regex)
    const matchCount = matches?.length ?? 0

    if (matchCount === 0) {
      toast.info("No matches to replace")
      return
    }

    const nextContent = activeFile.content.replace(regex, replaceValue)
    setEditorFiles((previous) =>
      previous.map((file) =>
        file.id === activeFile.id
          ? {
              ...file,
              content: nextContent,
            }
          : file
      )
    )
    setIsDirty(true)
    toast.success(`Replaced ${matchCount} occurrence${matchCount > 1 ? "s" : ""}`)
  }, [activeFile, findQuery, useRegex, matchCase, replaceValue])

  const handleGoToLine = useCallback(() => {
    const view = editorViewRef.current
    if (!view) {
      toast.error("Editor not ready")
      return
    }

    const parsedLine = Number.parseInt(goToLineValue, 10)
    if (Number.isNaN(parsedLine)) {
      toast.error("Enter a valid line number")
      return
    }

    const clampedLine = Math.min(Math.max(parsedLine, 1), view.state.doc.lines)
    const line = view.state.doc.line(clampedLine)

    view.dispatch({
      selection: {
        anchor: line.from,
      },
      effects: EditorView.scrollIntoView(line.from, {
        y: "center",
      }),
    })
    view.focus()
    setGoToLineValue(clampedLine.toString())
    setCursorPosition({ line: clampedLine, column: 1 })
    setGoToLineDialogOpen(false)
  }, [goToLineValue])

  const handleQuickOpenFile = useCallback(() => {
    if (editorFiles.length === 0) {
      return
    }

    setQuickOpenDialogOpen(true)
    setQuickOpenQuery("")
  }, [editorFiles])

  const handleConfirmQuickOpen = useCallback(() => {
    const query = quickOpenQuery.trim()
    if (!query) {
      toast.error("Enter a file name")
      return
    }

    const target = editorFiles.find((file) => file.name.toLowerCase() === query.toLowerCase())
    if (!target) {
      toast.error("File not found")
      return
    }

    setActiveFileId(target.id)
    setQuickOpenDialogOpen(false)
  }, [editorFiles, quickOpenQuery])

  const handleZoomInPreview = useCallback(() => {
    setPreviewZoom((previous) => Math.min(PREVIEW_MAX_ZOOM, previous + PREVIEW_ZOOM_STEP))
  }, [PREVIEW_MAX_ZOOM, PREVIEW_ZOOM_STEP])

  const handleZoomOutPreview = useCallback(() => {
    setPreviewZoom((previous) => Math.max(PREVIEW_MIN_ZOOM, previous - PREVIEW_ZOOM_STEP))
  }, [PREVIEW_MIN_ZOOM, PREVIEW_ZOOM_STEP])

  const handleResetPreviewZoom = useCallback(() => {
    setPreviewZoom(PREVIEW_DEFAULT_ZOOM)
  }, [PREVIEW_DEFAULT_ZOOM])

  const exitEditorFullscreen = useCallback(async () => {
    if (typeof document === "undefined") {
      return
    }

    const fullscreenDocument = document as Document & {
      webkitExitFullscreen?: () => Promise<void> | void
      webkitFullscreenElement?: Element | null
    }

    if (!fullscreenDocument.fullscreenElement && !fullscreenDocument.webkitFullscreenElement) {
      setIsEditorFullscreen(false)
      return
    }

    try {
      if (fullscreenDocument.exitFullscreen) {
        await fullscreenDocument.exitFullscreen()
      } else if (fullscreenDocument.webkitExitFullscreen) {
        await fullscreenDocument.webkitExitFullscreen()
      }
    } catch {
      toast.error("Unable to exit fullscreen")
    }
  }, [])

  const toggleEditorFullscreen = useCallback(async () => {
    if (typeof document === "undefined") {
      return
    }

    const element = workspacePanelRef.current as (HTMLElement & {
      webkitRequestFullscreen?: () => Promise<void> | void
    }) | null
    if (!element) {
      toast.error("Editor is not ready for fullscreen")
      return
    }

    const fullscreenDocument = document as Document & {
      webkitFullscreenElement?: Element | null
    }

    if (
      fullscreenDocument.fullscreenElement === element ||
      fullscreenDocument.webkitFullscreenElement === element
    ) {
      await exitEditorFullscreen()
      return
    }

    try {
      if (element.requestFullscreen) {
        await element.requestFullscreen()
      } else if (element.webkitRequestFullscreen) {
        await element.webkitRequestFullscreen()
      } else {
        toast.error("Fullscreen is not supported in this browser")
      }
    } catch {
      toast.error("Unable to enter fullscreen")
    }
  }, [exitEditorFullscreen])

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (typeof document === "undefined") {
        return
      }

      const fullscreenDocument = document as Document & {
        webkitFullscreenElement?: Element | null
      }

      const isActive =
        fullscreenDocument.fullscreenElement === workspacePanelRef.current ||
        fullscreenDocument.webkitFullscreenElement === workspacePanelRef.current

      setIsEditorFullscreen(isActive)
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange)
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange)

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange)
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange)
    }
  }, [])

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

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirty) {
        return
      }

      event.preventDefault()
      event.returnValue = ""
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [isDirty])

  useEffect(() => {
    const handleShortcuts = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isEditorFullscreen) {
        event.preventDefault()
        void exitEditorFullscreen()
        return
      }

      if (!(event.metaKey || event.ctrlKey)) {
        if (event.altKey && event.key.toLowerCase() === "g") {
          event.preventDefault()
          setGoToLineDialogOpen(true)
        }
        return
      }

      const key = event.key.toLowerCase()

      if (event.code === "Slash") {
        event.preventDefault()
        setShortcutsDialogOpen(true)
        return
      }

      if (key === "s") {
        event.preventDefault()
        void saveChanges()
        return
      }

      if (event.shiftKey && key === "n") {
        event.preventDefault()
        handleAddFile()
        return
      }

      if (event.shiftKey && key === "u") {
        event.preventDefault()
        uploadInputRef.current?.click()
        return
      }

      if (key === "p") {
        event.preventDefault()
        if (event.shiftKey) {
          setCommandPaletteOpen(true)
        } else {
          handleQuickOpenFile()
        }
        return
      }

      if (key === "f") {
        event.preventDefault()
        setFindReplaceOpen((value) => !value)
        return
      }

      if (key === "g") {
        event.preventDefault()
        setGoToLineDialogOpen(true)
      }
    }

    window.addEventListener("keydown", handleShortcuts)
    return () => window.removeEventListener("keydown", handleShortcuts)
  }, [saveChanges, handleAddFile, handleQuickOpenFile, isEditorFullscreen, exitEditorFullscreen])

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
    <div className="space-y-4 min-w-0 max-w-full">
      <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/resume">
              <ArrowLeft className="size-4" />
              Back to Resume Manager
            </Link>
          </Button>

          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">{name || resume.name}</h1>
            {/* <p className="text-sm text-muted-foreground">
              Modern LaTeX workspace with live preview and autosave.
            </p> */}
            <p className="text-xs text-muted-foreground wrap-break-word">
              Shortcuts: {"\u2318"}/Ctrl+/ Show all shortcuts
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
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

      <Card
        ref={workspacePanelRef}
        className={cn(
          "max-w-full overflow-hidden border-slate-300/50 shadow-sm",
          isEditorFullscreen && "flex h-full flex-col rounded-none border-0"
        )}
      >
        <CardHeader className="space-y-4 border-b bg-muted/10">
          <CardTitle className="text-base">LaTeX Editor Workspace</CardTitle>
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

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={handleQuickOpenFile}>
              <FileSearch className="size-4" />
              Quick Open
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setCommandPaletteOpen(true)}>
              <Command className="size-4" />
              Command Palette
            </Button>
            <Button
              type="button"
              variant={findReplaceOpen ? "default" : "outline"}
              size="sm"
              onClick={() => setFindReplaceOpen((value) => !value)}
            >
              <Search className="size-4" />
              Find & Replace
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setGoToLineDialogOpen(true)}>
              <Hash className="size-4" />
              Go To Line
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={handleFormatActiveFile}>
              <WandSparkles className="size-4" />
              Format File
            </Button>
            <Button
              type="button"
              variant={wordWrap ? "default" : "outline"}
              size="sm"
              onClick={() => setWordWrap((value) => !value)}
            >
              <WrapText className="size-4" />
              Word Wrap
            </Button>
            <Button
              type="button"
              variant={isEditorFullscreen ? "default" : "outline"}
              size="sm"
              onClick={() => void toggleEditorFullscreen()}
            >
              {isEditorFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
              {isEditorFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            </Button>
            <Button
              type="button"
              variant={showFileTree ? "outline" : "secondary"}
              size="sm"
              onClick={() => setShowFileTree((value) => !value)}
            >
              <PanelLeft className="size-4" />
              {showFileTree ? "Hide Files" : "Show Files"}
            </Button>
            <Button
              type="button"
              variant={showPreviewPanel ? "outline" : "secondary"}
              size="sm"
              onClick={() => setShowPreviewPanel((value) => !value)}
            >
              <PanelRight className="size-4" />
              {showPreviewPanel ? "Hide Preview" : "Show Preview"}
            </Button>
            <div className="ml-auto flex items-center gap-2 rounded-md border bg-background px-2 py-1 text-xs">
              <Type className="size-3.5 text-muted-foreground" />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                onClick={() => setFontSize((size) => Math.max(12, size - 1))}
              >
                A-
              </Button>
              <span className="min-w-12 text-center font-medium">{fontSize}px</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                onClick={() => setFontSize((size) => Math.min(24, size + 1))}
              >
                A+
              </Button>
            </div>
          </div>

          {findReplaceOpen ? (
            <div className="space-y-2 rounded-lg border bg-background/80 p-3">
              <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto_auto]">
                <Input
                  value={findQuery}
                  onChange={(event) => setFindQuery(event.target.value)}
                  placeholder={useRegex ? "Find (regular expression)" : "Find text"}
                />
                <Input
                  value={replaceValue}
                  onChange={(event) => setReplaceValue(event.target.value)}
                  placeholder="Replace with"
                />
                <Button
                  type="button"
                  variant={matchCase ? "default" : "outline"}
                  onClick={() => setMatchCase((value) => !value)}
                >
                  Match Case
                </Button>
                <Button
                  type="button"
                  variant={useRegex ? "default" : "outline"}
                  onClick={() => setUseRegex((value) => !value)}
                >
                  Regex
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={handleFindNext}>
                  <Search className="size-4" />
                  Find Next
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={handleReplaceAll}>
                  <Replace className="size-4" />
                  Replace All
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setFindReplaceOpen(false)}
                >
                  Close
                </Button>
                <p className="text-xs text-muted-foreground">
                  {findPatternFeedback
                    ? findPatternFeedback
                    : `${findMatchCount.toString()} match${findMatchCount === 1 ? "" : "es"}`}
                </p>
              </div>
            </div>
          ) : null}
        </CardHeader>

        <CardContent className={cn("p-0 overflow-hidden", isEditorFullscreen && "flex-1 min-h-0")}>
          <input
            ref={uploadInputRef}
            type="file"
            multiple
            accept=".tex,.cls,.sty,.txt"
            className="hidden"
            onChange={(event) => void handleUploadFile(event)}
          />

          <div className={cn("h-[calc(100vh-20rem)] min-h-152 min-w-0 max-w-full", isEditorFullscreen && "h-full min-h-0")}>
            <ResizablePanelGroup
              direction="horizontal"
              className="min-w-0"
              autoSaveId={`resume-workspace-main-layout-${resumeId}`}
            >
              <ResizablePanel defaultSize={showPreviewPanel ? 62 : 100} minSize={40} className="min-w-0">
                <ResizablePanelGroup
                  direction="horizontal"
                  className="min-w-0"
                  autoSaveId={`resume-workspace-editor-layout-${resumeId}`}
                >
                  {showFileTree ? (
                    <ResizablePanel defaultSize={22} minSize={14} maxSize={35}>
                      <aside className="flex h-full flex-col border-r bg-muted/10">
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
                          </div>
                        </div>

                        <div className="min-h-0 flex-1 overflow-y-auto p-2">
                          <div className="space-y-1">
                            {editorFiles.map((file) => (
                              <div
                                key={file.id}
                                className={cn(
                                  "flex items-center gap-1 rounded-md px-2 py-1.5 text-sm transition-colors",
                                  file.id === activeFileId
                                    ? "bg-primary/10 text-primary"
                                    : "hover:bg-accent"
                                )}
                              >
                                <button
                                  type="button"
                                  onClick={() => setActiveFileId(file.id)}
                                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                                >
                                  <FileText className="size-4" />
                                  <span className="truncate">{file.name}</span>
                                </button>

                                {entryFileId === file.id ? (
                                  <Badge variant="secondary" className="px-1 py-0 text-[10px]">
                                    main
                                  </Badge>
                                ) : null}

                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="size-6"
                                      onClick={(event) => event.stopPropagation()}
                                    >
                                      <MoreVertical className="size-3.5" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleSetEntryFile(file.id)}>
                                      Set as Main .tex
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleRenameFile(file.id)}>
                                      Rename
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleDuplicateFile(file.id)}>
                                      Duplicate
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => downloadTextAsFile(file.content, file.name)}>
                                      <FileDown className="size-4" />
                                      Download
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteFile(file.id)}>
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            ))}
                          </div>
                        </div>
                      </aside>
                    </ResizablePanel>
                  ) : null}

                  {showFileTree ? <ResizableHandle withHandle className="bg-border/70" /> : null}

                  <ResizablePanel defaultSize={showFileTree ? 78 : 100} minSize={35} className="min-w-0">
                    <div className="flex h-full flex-col bg-background">
                      <div className="min-h-0 flex-1 overflow-hidden overscroll-contain">
                        <CodeMirror
                          value={activeFile?.content ?? ""}
                          height="100%"
                          style={{ height: "100%" }}
                          theme={oneDark}
                          extensions={editorExtensions}
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
                          onUpdate={(update) => {
                            editorViewRef.current = update.view
                            if (!update.docChanged && !update.selectionSet) {
                              return
                            }

                            const position = update.state.selection.main.head
                            const line = update.state.doc.lineAt(position)
                            const nextPosition: EditorCursorPosition = {
                              line: line.number,
                              column: position - line.from + 1,
                            }

                            if (
                              cursorPositionRef.current.line === nextPosition.line &&
                              cursorPositionRef.current.column === nextPosition.column
                            ) {
                              return
                            }

                            cursorPositionRef.current = nextPosition
                            setCursorPosition(nextPosition)
                          }}
                        />
                      </div>

                      <div className="flex items-center justify-between border-t bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                        <p>
                          {activeFile?.name ?? "No file"} | {activeFile?.type.toUpperCase() ?? "TXT"} | Main: {editorFiles.find((file) => file.id === entryFileId)?.name ?? "None"}
                        </p>
                        <p>
                          Ln {cursorPosition.line}, Col {cursorPosition.column} | {((activeFile?.content ?? "").split(/\r?\n/).length).toString()} lines | {(activeFile?.content.length ?? 0).toString()} chars
                        </p>
                      </div>
                    </div>
                  </ResizablePanel>
                </ResizablePanelGroup>
              </ResizablePanel>

              {showPreviewPanel ? (
                <>
                  <ResizableHandle withHandle className="bg-border/70" />
                  <ResizablePanel defaultSize={38} minSize={20} className="min-w-0">
                    <ResizablePanelGroup
                      direction="vertical"
                      autoSaveId={`resume-workspace-preview-layout-${resumeId}`}
                    >
                      <ResizablePanel defaultSize={78} minSize={45}>
                        <div className="flex h-full min-w-0 flex-col">
                            <div className="border-b bg-muted/10 px-4 py-3">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                  <h2 className="text-base font-semibold">Live Resume Output</h2>
                                  <p className="text-xs text-muted-foreground">{formatSavedAt(lastSavedAt)}</p>
                                </div>
                                <div className="flex items-center gap-1 rounded-md border bg-background px-1 py-0.5">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="size-7"
                                    onClick={handleZoomOutPreview}
                                    disabled={previewZoom <= PREVIEW_MIN_ZOOM}
                                    title="Zoom out preview"
                                  >
                                    <ZoomOut className="size-4" />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 text-xs"
                                    onClick={handleResetPreviewZoom}
                                    title="Reset preview zoom"
                                  >
                                    {previewZoom}%
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="size-7"
                                    onClick={handleZoomInPreview}
                                    disabled={previewZoom >= PREVIEW_MAX_ZOOM}
                                    title="Zoom in preview"
                                  >
                                    <ZoomIn className="size-4" />
                                  </Button>
                                </div>
                              </div>
                          </div>

                            <div className="min-h-0 min-w-0 flex-1 overflow-auto bg-linear-to-b from-muted/10 to-transparent p-6">
                            <div className="mx-auto w-max">
                                <div
                                  className="relative"
                                  style={{
                                    width: `${(PREVIEW_BASE_WIDTH * previewScale).toString()}px`,
                                    minHeight: `${(PREVIEW_BASE_MIN_HEIGHT * previewScale).toString()}px`,
                                  }}
                                >
                                  <article
                                    className="shrink-0 rounded-sm border bg-background px-11 py-9 font-serif text-[15px] leading-[1.38] shadow-sm"
                                    style={{
                                      width: `${PREVIEW_BASE_WIDTH.toString()}px`,
                                      minHeight: `${PREVIEW_BASE_MIN_HEIGHT.toString()}px`,
                                      transform: `scale(${previewScale.toString()})`,
                                      transformOrigin: "top left",
                                    }}
                                  >
                              <header className="space-y-1">
                                <h2 className="text-[46px] leading-tight font-semibold tracking-tight">{parsedPreview.name}</h2>
                                {liveTags.length > 0 ? (
                                  <div className="flex flex-wrap gap-1 pt-2">
                                    {liveTags.map((tag) => (
                                      <Badge key={tag} variant="secondary" className="rounded-full px-3 py-0.5 text-[12px] capitalize">
                                        {tag}
                                      </Badge>
                                    ))}
                                  </div>
                                ) : null}
                              </header>

                              <Separator className="my-6" />

                              <div className="space-y-6">
                                {parsedPreview.sections.map((section) => (
                                  <section key={`${section.title}-${section.lines.length}`} className="space-y-2.5">
                                    <h3 className="border-b pb-1.5 text-[15px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                                      {section.title}
                                    </h3>
                                    {section.lines.length > 0 ? (
                                      <ul className="space-y-1.5">
                                        {section.lines.map((line, index) => (
                                          <li key={`${section.title}-${index}`}>
                                            {(() => {
                                              const columns = splitPreviewColumns(line)
                                              const isBullet = line.startsWith("- ")
                                              const content = isBullet ? line.slice(2).trim() : line

                                              if (columns) {
                                                return (
                                                  <div className="flex items-start justify-between gap-4 text-[15px]">
                                                    <span className="font-medium">{columns.left}</span>
                                                    <span className="shrink-0 text-right text-[14px] text-muted-foreground">{columns.right}</span>
                                                  </div>
                                                )
                                              }

                                              if (isBullet) {
                                                return (
                                                  <div className="flex items-start gap-2 text-[15px]">
                                                    <span aria-hidden>•</span>
                                                    <span>{content}</span>
                                                  </div>
                                                )
                                              }

                                              return <span className="text-[15px]">{content}</span>
                                            })()}
                                          </li>
                                        ))}
                                      </ul>
                                    ) : (
                                      <p className="text-sm text-muted-foreground">No content yet.</p>
                                    )}
                                  </section>
                                ))}
                              </div>
                                  </article>
                                </div>
                            </div>
                          </div>
                        </div>
                      </ResizablePanel>

                      <ResizableHandle withHandle className="bg-border/70" />

                      <ResizablePanel defaultSize={22} minSize={14}>
                        <div className="flex h-full flex-col">
                          <div className="border-b bg-muted/10 px-4 py-2">
                            <h3 className="text-sm font-semibold">Workspace Insights</h3>
                          </div>
                          <div className="grid h-full grid-cols-2 gap-2 p-3 text-xs">
                            <div className="rounded-md border bg-background p-2">
                              <p className="text-muted-foreground">Active file</p>
                              <p className="truncate font-medium">{activeFile?.name ?? "N/A"}</p>
                            </div>
                            <div className="rounded-md border bg-background p-2">
                              <p className="text-muted-foreground">Find matches</p>
                              <p className="font-medium">{findMatchCount.toString()}</p>
                            </div>
                            <div className="rounded-md border bg-background p-2">
                              <p className="text-muted-foreground">Font size</p>
                              <p className="font-medium">{fontSize}px</p>
                            </div>
                            <div className="rounded-md border bg-background p-2">
                              <p className="text-muted-foreground">Panel mode</p>
                              <p className="font-medium">{showPreviewPanel ? "Editor + Preview" : "Editor Only"}</p>
                            </div>
                          </div>
                        </div>
                      </ResizablePanel>
                    </ResizablePanelGroup>
                  </ResizablePanel>
                </>
              ) : null}
            </ResizablePanelGroup>
          </div>
        </CardContent>
      </Card>

      {saveError ? <p className="text-sm text-destructive">{saveError}</p> : null}

      <Dialog open={goToLineDialogOpen} onOpenChange={setGoToLineDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Go To Line</DialogTitle>
            <DialogDescription>
              Jump to any line quickly. Values outside range are clamped automatically.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={goToLineValue}
            onChange={(event) => setGoToLineValue(event.target.value)}
            placeholder="42"
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault()
                handleGoToLine()
              }
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setGoToLineDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleGoToLine}>Go</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={shortcutsDialogOpen} onOpenChange={setShortcutsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Keyboard Shortcuts</DialogTitle>
            <DialogDescription>
              Use these shortcuts to move faster in the editor.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <p><span className="font-medium">{"\u2318"}/Ctrl+S</span> Save</p>
            <p><span className="font-medium">{"\u2318"}/Ctrl+P</span> Quick Open</p>
            <p><span className="font-medium">{"\u2318"}/Ctrl+Shift+P</span> Command Palette</p>
            <p><span className="font-medium">{"\u2318"}/Ctrl+F</span> Find & Replace</p>
            <p><span className="font-medium">{"\u2318"}/Ctrl+G</span> Go To Line</p>
            <p><span className="font-medium">Esc</span> Exit fullscreen</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShortcutsDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CommandDialog open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen}>
        <CommandInput placeholder="Run editor command..." />
        <CommandList>
          <CommandEmpty>No matching command.</CommandEmpty>

          <CommandGroup heading="File">
            <CommandItem
              onSelect={() => {
                setCommandPaletteOpen(false)
                void saveChanges()
              }}
            >
              <Save className="size-4" />
              Save Now
              <CommandShortcut>{"\u2318"}S</CommandShortcut>
            </CommandItem>
            <CommandItem
              onSelect={() => {
                setCommandPaletteOpen(false)
                handleAddFile()
              }}
            >
              <FilePlus2 className="size-4" />
              New File
              <CommandShortcut>{"\u2318"}Shift+N</CommandShortcut>
            </CommandItem>
            <CommandItem
              onSelect={() => {
                setCommandPaletteOpen(false)
                handleQuickOpenFile()
              }}
            >
              <FileSearch className="size-4" />
              Quick Open
              <CommandShortcut>{"\u2318"}P</CommandShortcut>
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Editor">
            <CommandItem
              onSelect={() => {
                setCommandPaletteOpen(false)
                setFindReplaceOpen(true)
              }}
            >
              <Search className="size-4" />
              Open Find & Replace
              <CommandShortcut>{"\u2318"}F</CommandShortcut>
            </CommandItem>
            <CommandItem
              onSelect={() => {
                setCommandPaletteOpen(false)
                setGoToLineDialogOpen(true)
              }}
            >
              <Hash className="size-4" />
              Go To Line
              <CommandShortcut>{"\u2325"}G</CommandShortcut>
            </CommandItem>
            <CommandItem
              onSelect={() => {
                setCommandPaletteOpen(false)
                handleFormatActiveFile()
              }}
            >
              <WandSparkles className="size-4" />
              Format Active File
            </CommandItem>
            <CommandItem
              onSelect={() => {
                setCommandPaletteOpen(false)
                void toggleEditorFullscreen()
              }}
            >
              {isEditorFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
              {isEditorFullscreen ? "Exit Workspace Fullscreen" : "Enter Workspace Fullscreen"}
              <CommandShortcut>Esc</CommandShortcut>
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Layout">
            <CommandItem
              onSelect={() => {
                setCommandPaletteOpen(false)
                setShowFileTree((value) => !value)
              }}
            >
              <PanelLeft className="size-4" />
              Toggle File Tree
            </CommandItem>
            <CommandItem
              onSelect={() => {
                setCommandPaletteOpen(false)
                setShowPreviewPanel((value) => !value)
              }}
            >
              <PanelRight className="size-4" />
              Toggle Preview Pane
            </CommandItem>
            <CommandItem
              onSelect={() => {
                setCommandPaletteOpen(false)
                setWordWrap((value) => !value)
              }}
            >
              <WrapText className="size-4" />
              Toggle Word Wrap
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>

      <Dialog open={addFileDialogOpen} onOpenChange={setAddFileDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New File</DialogTitle>
            <DialogDescription>
              Create a new file in this resume workspace.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={addFileName}
            onChange={(event) => setAddFileName(event.target.value)}
            placeholder="resume.cls"
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault()
                handleConfirmAddFile()
              }
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddFileDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmAddFile}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename File</DialogTitle>
            <DialogDescription>
              Update the file name. Use only letters, numbers, dots, dashes, and underscores.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={renameFileName}
            onChange={(event) => setRenameFileName(event.target.value)}
            placeholder="resume.tex"
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault()
                handleConfirmRenameFile()
              }
            }}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRenameDialogOpen(false)
                setRenameTargetId(null)
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleConfirmRenameFile}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={quickOpenDialogOpen} onOpenChange={setQuickOpenDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Quick Open</DialogTitle>
            <DialogDescription>
              Type an exact file name to jump directly.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={quickOpenQuery}
            onChange={(event) => setQuickOpenQuery(event.target.value)}
            placeholder="resume.tex"
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault()
                handleConfirmQuickOpen()
              }
            }}
          />
          <div className="max-h-40 overflow-y-auto rounded-md border p-2 text-xs text-muted-foreground">
            {editorFiles.map((file) => (
              <p key={file.id}>{file.name}</p>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQuickOpenDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmQuickOpen}>Open</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete File?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTargetFileName} will be permanently removed from this resume workspace.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setDeleteDialogOpen(false)
                setDeleteTargetId(null)
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDeleteFile}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}