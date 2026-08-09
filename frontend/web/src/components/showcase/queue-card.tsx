import { useMemo, useState } from 'react'
import { Copy, MoreHorizontal, Trash2 } from 'lucide-react'

import * as m from '../../paraglide/messages'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Switch } from '../ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { queueItems, type QueueCategory, type QueueStatus } from './showcase-data'

/** Solid status badges reusing the Snow Miku info/success/warning tokens. */
function statusBadges(): Record<QueueStatus, { className: string; label: string }> {
  return {
    pending: { className: 'bg-info text-info-foreground', label: m.queue_status_pending() },
    processing: {
      className: 'bg-warning text-warning-foreground',
      label: m.queue_status_processing(),
    },
    approved: {
      className: 'bg-success text-success-foreground',
      label: m.queue_status_approved(),
    },
    rejected: {
      className: 'bg-destructive text-destructive-foreground',
      label: m.queue_status_rejected(),
    },
  }
}

/** Resolve queue category labels per render so SSR message calls follow the request locale. */
function categoryLabels(): Record<QueueCategory, string> {
  return {
    anime: m.home_stat_anime_clips(),
    character: m.home_stat_character_edits(),
    original: m.forms_category_original(),
    other: m.forms_category_other(),
  }
}

/** Per-row action menu: view/copy/delete (mock actions). */
function RowActions() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon-sm" aria-label={m.menu_actions()} />}
      >
        <MoreHorizontal aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem>{m.menu_view_details()}</DropdownMenuItem>
        <DropdownMenuItem>
          <Copy aria-hidden="true" />
          {m.menu_copy_link()}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive">
          <Trash2 aria-hidden="true" />
          {m.menu_delete()}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** Review queue showcase card: filterable table with live empty states. */
export function QueueCard() {
  const [filter, setFilter] = useState('')
  const [showDemo, setShowDemo] = useState(true)

  const filtered = useMemo(
    () =>
      queueItems.filter((item) =>
        item.title.toLocaleLowerCase().includes(filter.trim().toLocaleLowerCase()),
      ),
    [filter],
  )

  const badges = statusBadges()
  const categories = categoryLabels()

  const showEmptyState = !showDemo || filtered.length === 0

  return (
    <Card id="queue" className="scroll-mt-20 shadow-sm lg:col-span-2">
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 space-y-0">
        <div className="flex flex-col gap-1">
          <CardTitle>{m.home_review_queue_heading()}</CardTitle>
          <CardDescription>{m.components_description()}</CardDescription>
        </div>
        <Badge variant={showDemo && filtered.length > 0 ? 'secondary' : 'outline'}>
          {showDemo && filtered.length > 0
            ? m.queue_items_count({ count: filtered.length })
            : m.home_review_queue_badge_empty()}
        </Badge>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Input
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder={m.queue_filter_placeholder()}
            className="max-w-xs"
            aria-label={m.queue_filter_placeholder()}
          />
          <div className="flex items-center justify-between gap-4 rounded-lg border bg-muted/40 p-3 sm:justify-start">
            <div className="flex flex-col gap-1">
              <Label htmlFor="queue-demo">{m.queue_show_demo_data()}</Label>
              <span className="text-xs text-muted-foreground">
                {m.queue_show_demo_data_description()}
              </span>
            </div>
            <Switch
              id="queue-demo"
              checked={showDemo}
              onCheckedChange={setShowDemo}
              aria-label={m.queue_show_demo_data()}
            />
          </div>
        </div>
        {showEmptyState ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-12 text-center">
            <p className="text-sm font-medium">
              {showDemo ? m.queue_filter_empty() : m.home_review_queue_empty()}
            </p>
            <p className="text-xs text-muted-foreground">
              {showDemo ? m.queue_filter_placeholder() : m.queue_show_demo_data_description()}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>{m.queue_table_title()}</TableHead>
                  <TableHead>{m.queue_table_category()}</TableHead>
                  <TableHead>{m.queue_table_uploader()}</TableHead>
                  <TableHead>{m.queue_table_status()}</TableHead>
                  <TableHead className="w-12 text-right">{m.queue_table_actions()}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.title}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {categories[item.category]}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{item.uploader}</TableCell>
                    <TableCell>
                      <Badge className={badges[item.status].className}>
                        {badges[item.status].label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <RowActions />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
