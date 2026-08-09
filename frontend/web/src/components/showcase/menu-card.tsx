import { useState } from 'react'
import { Bell, Copy, Search, Settings } from 'lucide-react'

import * as m from '../../paraglide/messages'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip'

/** Tooltip-wrapped ghost icon buttons. */
function IconToolbar() {
  // Resolved per render so SSR message calls follow the request locale.
  const iconButtons = [
    { icon: Search, label: m.tooltip_search() },
    { icon: Bell, label: m.tooltip_notifications() },
    { icon: Settings, label: m.tooltip_settings() },
  ]

  return (
    <div className="flex items-center gap-1">
      {iconButtons.map(({ icon: Icon, label }) => (
        <Tooltip key={label}>
          <TooltipTrigger render={<Button variant="ghost" size="icon-sm" aria-label={label} />}>
            <Icon aria-hidden="true" />
          </TooltipTrigger>
          <TooltipContent>{label}</TooltipContent>
        </Tooltip>
      ))}
    </div>
  )
}

/** Dropdown menu and tooltip showcase card. */
export function MenuCard() {
  const [showProcessing, setShowProcessing] = useState(true)
  const [copied, setCopied] = useState(false)

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>{m.menu_heading()}</CardTitle>
        <CardDescription>{m.menu_description()}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="flex items-center justify-between gap-4 rounded-lg border bg-muted/40 p-3">
          <span className="text-sm font-medium">{m.menu_actions()}</span>
          <div className="flex items-center gap-2">
            <IconToolbar />
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
                {m.menu_actions()}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Miku — Snow Waltz</DropdownMenuLabel>
                  <DropdownMenuItem>{m.menu_view_details()}</DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setCopied(true)
                      window.setTimeout(() => setCopied(false), 1500)
                    }}
                  >
                    <Copy aria-hidden="true" />
                    {copied ? m.menu_copy_link_done() : m.menu_copy_link()}
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem
                  checked={showProcessing}
                  onCheckedChange={setShowProcessing}
                >
                  {m.menu_show_processing()}
                </DropdownMenuCheckboxItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" disabled>
                  {m.menu_delete()}
                  <span className="text-xs font-normal opacity-70">{m.menu_delete_hint()}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {showProcessing ? m.menu_show_processing_description() : null}
        </p>
      </CardContent>
    </Card>
  )
}
