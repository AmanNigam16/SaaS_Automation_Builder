import { ArrowRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { WORKFLOW_TEMPLATES } from '@/lib/workflow-templates'
import { TemplateButton } from './template-button'

const TemplatesPage = () => (
  <div className="flex flex-col gap-4">
    <h1 className="sticky top-0 z-[10] flex items-center justify-between border-b bg-background/50 p-6 text-4xl backdrop-blur-lg">
      Templates
    </h1>
    <section className="grid gap-4 p-6 lg:grid-cols-2">
      {WORKFLOW_TEMPLATES.map((template) => {
        const nodeTypes = JSON.parse(template.nodes) as Array<{ type: string }>
        return (
          <Card key={template.id} className="flex flex-col">
            <CardHeader>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">Guided draft</Badge>
                <Badge variant="outline">{nodeTypes.length} steps</Badge>
              </div>
              <CardTitle>{template.name}</CardTitle>
              <CardDescription>{template.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 space-y-4">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                {nodeTypes.map((node, index) => (
                  <span key={`${template.id}-${index}`} className="flex items-center gap-2">
                    <span className="rounded-md border bg-muted/40 px-2 py-1">{node.type}</span>
                    {index < nodeTypes.length - 1 && <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />}
                  </span>
                ))}
              </div>
              <p className="text-sm text-muted-foreground"><span className="font-medium text-foreground">Before publishing:</span> {template.setup}</p>
            </CardContent>
            <CardFooter>
              <TemplateButton templateId={template.id} />
            </CardFooter>
          </Card>
        )
      })}
    </section>
  </div>
)

export default TemplatesPage
