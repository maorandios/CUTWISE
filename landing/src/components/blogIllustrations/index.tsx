import type { ReactNode } from 'react'
import { IFCToFabricationIllustration } from './IFCToFabricationIllustration'

export const blogIllustrations: Record<string, (props: { className?: string }) => ReactNode> = {
  'from-ifc-model-to-fabrication-complete-digital-workflow': ({ className }) => (
    <IFCToFabricationIllustration className={className} />
  ),
}

export const getBlogIllustration = (slug: string) => blogIllustrations[slug]
