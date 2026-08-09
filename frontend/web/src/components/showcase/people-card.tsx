import { useEffect, useState } from 'react'

import * as m from '../../paraglide/messages'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Progress, ProgressLabel, ProgressValue } from '../ui/progress'
import { Avatar, AvatarFallback, AvatarGroup } from '../ui/avatar'
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip'
import { collaborators, pipelineSteps, type PipelineStep } from './showcase-data'

/** Resolve pipeline step labels per render so SSR message calls follow the request locale. */
function stepLabel(key: PipelineStep['key']) {
  switch (key) {
    case 'transcoding':
      return m.progress_transcoding()
    case 'uploading':
      return m.progress_uploading()
    case 'analyzing':
      return m.progress_analyzing()
  }
}
/** One pipeline step with an animated progress bar (client-only ticker). */
function PipelineBar({ label, initial }: { readonly label: string; readonly initial: number }) {
  const [value, setValue] = useState(initial)

  useEffect(() => {
    const timer = setInterval(() => {
      setValue((current) => Math.min(100, current + 1))
    }, 1200)
    return () => clearInterval(timer)
  }, [])

  return (
    <Progress value={value} className="w-full">
      <ProgressLabel>{label}</ProgressLabel>
      <ProgressValue>
        {/* Base UI formats value/100 with style:'percent', so formattedValue already
            carries the localized percent sign; only guard the null case. */}
        {(formattedValue) => formattedValue ?? '0%'}
      </ProgressValue>
    </Progress>
  )
}

/** Avatar group where each avatar shows a tooltip with the collaborator name. */
function CollaboratorAvatars() {
  return (
    <AvatarGroup>
      {collaborators.map((person) => (
        <Tooltip key={person.name}>
          <TooltipTrigger render={<Avatar size="lg" className="cursor-default" />}>
            <AvatarFallback className={person.className}>{person.initials}</AvatarFallback>
          </TooltipTrigger>
          <TooltipContent>{person.name}</TooltipContent>
        </Tooltip>
      ))}
    </AvatarGroup>
  )
}

/** Progress and collaborators showcase card. */
export function PeopleCard() {
  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>{m.progress_heading()}</CardTitle>
        <CardDescription>{m.progress_description()}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="flex flex-col gap-4">
          {pipelineSteps.map((step) => (
            <PipelineBar key={step.key} label={stepLabel(step.key)} initial={step.progress} />
          ))}
        </div>
        <div className="flex items-center justify-between gap-4 rounded-lg border bg-muted/40 p-3">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium">{m.progress_people()}</span>
            <span className="text-xs text-muted-foreground">{m.progress_people_note()}</span>
          </div>
          <CollaboratorAvatars />
        </div>
      </CardContent>
    </Card>
  )
}
