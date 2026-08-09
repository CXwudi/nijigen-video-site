import * as m from '../../paraglide/messages'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'

/** Tabs showcase card with keyboard-navigable Base UI tabs. */
export function TabsCard() {
  // Resolved per render so SSR message calls follow the request locale.
  const tabs = [
    { value: 'overview', label: m.tabs_overview(), content: m.tabs_overview_content() },
    { value: 'details', label: m.tabs_details(), content: m.tabs_details_content() },
    { value: 'activity', label: m.tabs_activity(), content: m.tabs_activity_content() },
  ]

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>{m.tabs_heading()}</CardTitle>
        <CardDescription>{m.tabs_description()}</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="w-full">
            {tabs.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {tabs.map((tab) => (
            <TabsContent key={tab.value} value={tab.value} className="p-4">
              <p className="text-sm leading-relaxed text-muted-foreground">{tab.content}</p>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  )
}
