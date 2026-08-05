import { execFileSync } from "node:child_process"
import { dirname, relative } from "node:path"
import { QuartzComponent, QuartzComponentProps } from "./types"
import { formatDate } from "./Date"
import { i18n } from "../i18n"

type NoteDates = {
  created?: Date
  modified?: Date
}

const dateCache = new Map<string, NoteDates>()

function parseDate(value: unknown): Date | undefined {
  if (value === undefined || value === null || value === "") return undefined

  const date = new Date(value as string | number | Date)
  return Number.isNaN(date.getTime()) ? undefined : date
}

function parseFrontmatterDate(value: unknown): Date | undefined {
  if (typeof value === "string") {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(value)
    if (match) {
      const [, year, month, day] = match
      return new Date(Number(year), Number(month) - 1, Number(day))
    }
  }

  if (
    value instanceof Date &&
    value.getUTCHours() === 0 &&
    value.getUTCMinutes() === 0 &&
    value.getUTCSeconds() === 0 &&
    value.getUTCMilliseconds() === 0
  ) {
    return new Date(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate())
  }

  return parseDate(value)
}

function getGitDates(filePath: string): NoteDates {
  const cached = dateCache.get(filePath)
  if (cached) return cached

  try {
    const workingDirectory = dirname(filePath)
    const repository = execFileSync(
      "git",
      ["-C", workingDirectory, "rev-parse", "--show-toplevel"],
      {
        encoding: "utf8",
      },
    ).trim()
    const repositoryPath = relative(repository, filePath).replaceAll("\\", "/")
    const output = execFileSync(
      "git",
      ["-C", repository, "log", "--follow", "--format=%aI", "--", repositoryPath],
      { encoding: "utf8" },
    ).trim()
    const history = output.split(/\r?\n/u).filter(Boolean)
    const dates = {
      created: parseDate(history.at(-1)),
      modified: parseDate(history[0]),
    }

    dateCache.set(filePath, dates)
    return dates
  } catch {
    const dates = {}
    dateCache.set(filePath, dates)
    return dates
  }
}

const NoteMeta: QuartzComponent = ({ cfg, fileData }: QuartzComponentProps) => {
  if (fileData.slug === "index" || !fileData.filePath) return null

  const frontmatter = (fileData.frontmatter ?? {}) as Record<string, unknown>
  const gitDates = getGitDates(fileData.filePath)
  const created =
    parseFrontmatterDate(frontmatter.created) ?? gitDates.created ?? fileData.dates?.created
  const modified =
    parseFrontmatterDate(frontmatter.modified ?? frontmatter.updated) ??
    gitDates.modified ??
    fileData.dates?.modified

  if (!created || !modified) return null

  const locale = cfg.locale ?? "en-US"
  const wordCount = fileData.text?.trim().match(/\S+/gu)?.length ?? 0
  const readingTime = i18n(locale).components.contentMeta.readingTime({
    minutes: Math.max(1, Math.ceil(wordCount / 200)),
  })

  return (
    <p class="content-meta note-meta">
      <span>
        <span class="note-meta-label">Created</span>{" "}
        <time datetime={created.toISOString()}>{formatDate(created, locale)}</time>
      </span>
      <span>
        <span class="note-meta-label">Last modified</span>{" "}
        <time datetime={modified.toISOString()}>{formatDate(modified, locale)}</time>
      </span>
      <span>{readingTime}</span>
    </p>
  )
}

export default NoteMeta
