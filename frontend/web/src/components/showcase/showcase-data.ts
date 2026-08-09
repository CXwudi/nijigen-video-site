/**
 * Mock data for the UI showcase. Titles and names are proper nouns shared
 * across locales; categories/statuses are keys translated by Paraglide.
 */

export type QueueStatus = 'pending' | 'processing' | 'approved' | 'rejected'

export type QueueCategory = 'anime' | 'character' | 'original' | 'other'

export type QueueItem = {
  id: number
  title: string
  category: QueueCategory
  uploader: string
  status: QueueStatus
}

export const queueItems: QueueItem[] = [
  {
    id: 1,
    title: 'Miku — Snow Waltz (Dance Edit)',
    category: 'character',
    uploader: 'Hatsune Miku',
    status: 'pending',
  },
  {
    id: 2,
    title: 'Rin & Len — Electric Stage',
    category: 'anime',
    uploader: 'Kagamine Rin',
    status: 'processing',
  },
  {
    id: 3,
    title: 'Kaito — Night Sky Cover',
    category: 'original',
    uploader: 'KAITO',
    status: 'approved',
  },
  {
    id: 4,
    title: 'Luka — Whisper of Ice',
    category: 'anime',
    uploader: 'Megurine Luka',
    status: 'rejected',
  },
  {
    id: 5,
    title: 'Snow Miku 2019 — Winter Live',
    category: 'character',
    uploader: 'Hatsune Miku',
    status: 'pending',
  },
]

export type Collaborator = {
  name: string
  initials: string
  /**
   * Avatar fallback tint (chart-* token) paired with its matching semantic
   * foreground token: chart-1/2/3/4 are the primary/success/warning/info
   * colors, so their -foreground tokens keep WCAG AA contrast in both themes.
   */
  className: string
}

export const collaborators: Collaborator[] = [
  { name: 'Hatsune Miku', initials: 'HM', className: 'bg-chart-1 text-primary-foreground' },
  { name: 'Kagamine Rin', initials: 'KR', className: 'bg-chart-2 text-success-foreground' },
  { name: 'KAITO', initials: 'KT', className: 'bg-chart-3 text-warning-foreground' },
  { name: 'Megurine Luka', initials: 'ML', className: 'bg-chart-4 text-info-foreground' },
]

export type PipelineStep = {
  /** Message key suffix, e.g. "transcoding" -> progress_transcoding. */
  key: 'transcoding' | 'uploading' | 'analyzing'
  /** Initial progress percentage. */
  progress: number
}

export const pipelineSteps: PipelineStep[] = [
  { key: 'transcoding', progress: 82 },
  { key: 'uploading', progress: 45 },
  { key: 'analyzing', progress: 18 },
]
