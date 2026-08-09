import { Plus, Search } from 'lucide-react'

import * as m from '../../paraglide/messages'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'

const variantNames = ['default', 'secondary', 'outline', 'ghost', 'destructive', 'link'] as const

const sizes = ['xs', 'sm', 'default', 'lg'] as const

/** Snow Miku semantic badge tints using the custom info/success/warning tokens. */
const badgeTints = [
  { key: 'info', className: 'bg-info text-info-foreground' },
  { key: 'success', className: 'bg-success text-success-foreground' },
  { key: 'warning', className: 'bg-warning text-warning-foreground' },
] as const

/** Buttons and badges showcase card. */
export function ButtonsCard() {
  const variantLabels: Record<(typeof variantNames)[number], string> = {
    default: m.buttons_variant_default(),
    secondary: m.buttons_variant_secondary(),
    outline: m.buttons_variant_outline(),
    ghost: m.buttons_variant_ghost(),
    destructive: m.buttons_variant_destructive(),
    link: m.buttons_variant_link(),
  }
  const badgeLabels: Record<(typeof badgeTints)[number]['key'], string> = {
    info: m.buttons_badge_info(),
    success: m.buttons_badge_success(),
    warning: m.buttons_badge_warning(),
  }

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>{m.buttons_heading()}</CardTitle>
        <CardDescription>{m.buttons_description()}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {m.buttons_variants()}
          </h3>
          <div className="flex flex-wrap gap-2">
            {variantNames.map((variant) => (
              <Button key={variant} variant={variant}>
                {variantLabels[variant]}
              </Button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {m.buttons_sizes()}
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            {sizes.map((size) => (
              <Button key={size} size={size}>
                {size === 'default' ? m.buttons_variant_default() : size}
              </Button>
            ))}
            <Button size="icon" aria-label={m.buttons_icon_only()}>
              <Plus aria-hidden="true" />
            </Button>
            <Button className="gap-1.5">
              <Search aria-hidden="true" />
              {m.buttons_with_icon()}
            </Button>
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {m.buttons_badges()}
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            <Badge>{m.queue_status_pending()}</Badge>
            <Badge variant="secondary">{variantLabels.secondary}</Badge>
            <Badge variant="outline">{variantLabels.outline}</Badge>
            <Badge variant="destructive">{variantLabels.destructive}</Badge>
            {badgeTints.map(({ key, className }) => (
              <Badge key={key} className={className}>
                {badgeLabels[key]}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
