/**
 * Local blog images from /public. Key = slug, value = path (served from public root).
 * Missing entries fall back to post.image.
 */
export const localBlogImages: Record<string, string> = {
  'how-steel-fabricators-plan-stock-bars-step-by-step':
    '/How Steel Fabricators Plan Stock Bars (Step-by-Step).jpg',
  'tekla-sds2-to-cutting-list-complete-workflow':
    '/Tekla Structures SDS2 to Cutting List The Complete Workflow.jpeg',
  'how-to-reduce-steel-waste-in-fabrication-projects':
    '/How to Reduce Steel Waste in Fabrication Projects.jpeg',
  'manual-vs-automated-steel-planning-cost-comparison':
    '/Manual vs Automated Steel Planning (Cost Comparison).jpeg',
  'how-to-calculate-steel-quantities-from-ifc-models':
    '/How to Calculate Steel Quantities from IFC Models.jpeg',
  'how-to-estimate-steel-project-costs-before-fabrication':
    '/How to Estimate Steel Project Costs Before Fabrication.jpeg',
  'why-steel-fabricators-still-use-excel-and-what-its-costing-them':
    "/Why Steel Fabricators Still Use Excel — And What It's Costing Them.jpeg",
  'what-fabricators-should-check-before-ordering-steel':
    '/What Fabricators Should Check Before Ordering Steel.jpeg',
  'from-ifc-model-to-fabrication-complete-digital-workflow':
    '/From IFC Model to Fabrication The Complete Digital Workflow.jpeg',
}

export const getBlogImage = (slug: string, fallback: string): string =>
  localBlogImages[slug] ?? fallback
