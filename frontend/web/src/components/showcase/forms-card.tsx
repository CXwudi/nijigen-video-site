import { useState } from 'react'
import { CheckCircle2 } from 'lucide-react'

import * as m from '../../paraglide/messages'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Checkbox } from '../ui/checkbox'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select'
import { Switch } from '../ui/switch'
import { Textarea } from '../ui/textarea'

/** Form controls showcase card with a working (mock) upload form. */
export function FormsCard() {
  const [category, setCategory] = useState<string>('anime')
  const [privateUpload, setPrivateUpload] = useState(false)
  const [notify, setNotify] = useState(true)
  const [saved, setSaved] = useState(false)

  // Resolved per render so SSR message calls follow the request locale.
  const categoryItems = [
    { label: m.home_stat_anime_clips(), value: 'anime' },
    { label: m.home_stat_character_edits(), value: 'character' },
    { label: m.forms_category_original(), value: 'original' },
    { label: m.forms_category_other(), value: 'other' },
  ]

  return (
    <Card id="forms" className="scroll-mt-20 shadow-sm">
      <CardHeader>
        <CardTitle>{m.forms_heading()}</CardTitle>
        <CardDescription>{m.forms_description()}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <Label htmlFor="forms-title">{m.forms_clip_title()}</Label>
          <Input id="forms-title" placeholder={m.forms_clip_title_placeholder()} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="forms-category">{m.forms_category()}</Label>
          <Select
            items={categoryItems}
            value={category}
            onValueChange={(value) => setCategory(value ?? 'anime')}
          >
            <SelectTrigger id="forms-category" className="w-full">
              <SelectValue placeholder={m.forms_category()} />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {categoryItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="forms-notes">{m.forms_notes()}</Label>
          <Textarea id="forms-notes" rows={3} placeholder={m.forms_notes_placeholder()} />
        </div>
        <div className="flex items-start gap-2.5">
          <Checkbox id="forms-private" checked={privateUpload} onCheckedChange={setPrivateUpload} />
          <div className="flex flex-col gap-1">
            <Label htmlFor="forms-private">{m.forms_private()}</Label>
            <span className="text-xs text-muted-foreground">{m.forms_private_description()}</span>
          </div>
        </div>
        <div className="flex items-center justify-between gap-4 rounded-lg border bg-muted/40 p-3">
          <Label htmlFor="forms-notify">{m.forms_notify()}</Label>
          <Switch id="forms-notify" checked={notify} onCheckedChange={setNotify} />
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => setSaved(true)}>{m.forms_save_draft()}</Button>
          {saved && (
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <CheckCircle2 aria-hidden="true" className="size-4 text-success" />
              {m.forms_draft_saved()}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
