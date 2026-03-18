export interface BlogPost {
  id: string
  title: string
  excerpt: string
  content: string
  image: string
  datePublished: string
  slug: string
}

export const blogPosts: BlogPost[] = [
  {
    id: '1',
    slug: 'how-steel-fabricators-plan-stock-bars-step-by-step',
    title: 'How Steel Fabricators Plan Stock Bars (Step-by-Step)',
    excerpt: 'Planning stock bars is one of the most important — and most underestimated — parts of any steel fabrication project. A small mistake can lead to excess material, high scrap, and increased costs.',
    content: `Planning stock bars is one of the most important — and most underestimated — parts of any steel fabrication project.

A small mistake in planning can lead to:

• Excess material purchases
• High levels of scrap
• Increased project costs

In this guide, we'll walk through how steel fabricators typically plan stock bars — and how this process can be significantly improved.

**Step 1: Receive the Project Data**

Fabricators usually start with one of the following:

• IFC model (from Tekla Structures / SDS2 / Advances Steel)
• Shop drawings
• Cut lists from detailers

At this stage, the goal is simple: Understand what needs to be produced.

This includes:
• Profile types (IPE, HEA, RHS, etc.)
• Part lengths
• Quantities

**Step 2: Extract Material Quantities (BOM)**

Next, fabricators extract a Bill of Materials (BOM).

This includes:
• Total length per profile
• Quantity per section
• Total weight

**The Problem:**

This step is often done manually or using spreadsheets.

Which leads to:
• Errors in quantities
• Missing parts
• Time wasted on repetitive work

**How Cutwise Helps:**

With Cutwise, you simply upload the IFC model, and the system automatically generates a structured BOM in seconds.

No manual counting.
No Excel work.

**Step 3: Define Stock Bar Lengths**

Steel is purchased in standard lengths, typically:
• **6m**
• **12m**
(sometimes 13.5m or custom)

The fabricator must decide: How many stock bars to order for each profile.

**Step 4: Create the Cutting Plan**

This is the most critical step.

The goal: Fit all required parts into stock bars with minimum waste.

**Manual Approach:**
• Trial and error in Excel
• Visual planning
• Experience-based decisions

**Result:**
• Inefficient usage
• **3–10% material waste** (sometimes more)

**Step 5: Estimate Waste & Costs**

After planning, fabricators estimate:
• Total leftover material
• Scrap percentage
• Total steel cost

**The Problem:**

By this stage, it's often too late to optimize.

**Where Most Fabricators Lose Money**

{{The biggest issue is not the steel price — it's how efficiently the steel is used.}}

Even a **5% improvement** in material usage can mean:
• Thousands saved per project
• Higher margins
• More competitive pricing

**How Cutwise Changes This Process**

Cutwise automates the entire workflow:

Instead of:
• Manual BOM extraction
• Trial-and-error cutting plans
• Guessing stock quantities

You get:
• Automatic BOM from IFC model
• Optimized cutting plans
• Exact stock bar requirements
• Clear material usage insights

All within minutes.

**Example Impact**

Without optimization:
**100 tons** project
**7% waste** → **7 tons** lost

With Cutwise:
Reduce waste to **~3%**
Save **4 tons** of steel

That's a direct cost saving on every project.

**Final Thoughts**

{{Stock bar planning is not just a technical step — it's a profit driver.}}

{{Fabricators who still rely on manual planning are leaving money on the table.}}

Cutwise gives you a faster, smarter way to:
• Plan materials
• Reduce waste
• Improve profitability

Want to see it in action?

Upload your IFC model and get your BOM + optimized cutting plan in minutes.`,
    image: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&h=450&fit=crop',
    datePublished: '2025-03-18',
  },
  {
    id: '6',
    slug: 'tekla-sds2-to-cutting-list-complete-workflow',
    title: 'Tekla Structures / SDS2 to Cutting List: The Complete Workflow',
    excerpt: 'For steel fabricators and detailing firms, the transition from a 3D model to a usable cutting list is a critical step in every project. In this guide, we break down the full workflow — and where most teams lose time and money.',
    content: `For steel fabricators and detailing firms, the transition from a 3D model to a usable cutting list is a critical step in every project.

While tools like Tekla Structures and SDS2 provide highly detailed models, turning that data into a clear, optimized cutting plan is not always straightforward.

In this guide, we break down the full workflow — and where most teams lose time and money.

**Step 1: Create the 3D Model**

The process begins in detailing software such as:

• **Tekla Structures**
• **SDS2**

Detailers build a complete 3D model including:

• Assemblies
• Parts
• Profiles (IPE, HEA, RHS, etc.)
• Exact dimensions

At this stage, the model contains everything needed for fabrication — but it's still not ready for cutting.

**Step 2: Export Model Data (IFC / Reports)**

To move forward, the model data is exported as:

• IFC file
• Material reports
• Part lists

These files contain all required fabrication data, but usually in a raw and unstructured format.

**Step 3: Extract the Cutting List**

Now comes the challenge:

👉 Converting model data into a usable cutting list

**Typical process:**
• Export reports from Tekla / SDS2
• Open in Excel
• Filter relevant parts
• Group by profiles
• Calculate quantities manually

**The Problem:**

This step is often:
• Time-consuming
• Error-prone
• Highly dependent on manual work

Even small mistakes can lead to:
• Missing parts
• Incorrect quantities
• Material shortages

**Step 4: Build the Bill of Materials (BOM)**

Once the data is cleaned, fabricators create a BOM:

• Total lengths per profile
• Quantities
• Total weights

This is used for:
• Purchasing materials
• Planning production

**The Problem:**

Manual BOM creation often leads to:
• Over-ordering steel
• Underestimating requirements
• Lack of clarity across the project

**Step 5: Create the Cutting Plan**

After defining quantities, the next step is:

👉 Plan how parts will be cut from stock bars

This involves:
• Matching part lengths to stock sizes (**6m** / **12m**)
• Minimizing leftover material
• Deciding cutting sequences

**Manual Reality:**

Most shops still rely on:
• Excel sheets
• Experience
• Trial and error

**Result:**
• **3–10% material waste**
• Inefficient stock usage
• Higher project costs

**Step 6: Final Output to Workshop**

Finally, the cutting list is passed to:
• Workshop teams
• Saw operators

Usually in the form of:
• Excel files
• Printed lists

At this point, changes are difficult — and mistakes become expensive.

**Where the Workflow Breaks**

Even with advanced detailing tools like Tekla or SDS2, the biggest gaps are:

• No direct connection between model and cutting optimization
• Heavy reliance on Excel
• Lack of automation in material planning

{{This is where time is lost — and costs increase.}}

**How Cutwise Improves the Workflow**

Cutwise connects directly to this process and simplifies it.

Instead of:
• Exporting reports
• Cleaning data manually
• Building BOM in Excel
• Guessing cutting plans

You simply:

👉 Upload the IFC model

And Cutwise automatically generates:

✔ Structured Bill of Materials (BOM)
✔ Optimized cutting plans
✔ Accurate stock bar requirements
✔ Clear material insights

**For Detailing Firms**

Cutwise is not only for fabricators.

Detailers can use it to:
• Provide material quantities to clients
• Deliver cutting plans as added value
• Improve project estimation speed

This makes your service more valuable and competitive.

**Real Impact on Projects**

Without optimization:
• Manual workflow
• High risk of errors
• Material waste

With Cutwise:
• Faster data processing
• Accurate planning
• Reduced steel waste
• Lower project costs

**Final Thoughts**

{{Tekla Structures and SDS2 give you powerful models — but turning those models into efficient cutting plans is where the real value is created.}}

Cutwise bridges that gap.

It transforms your model into:
• Clear material data
• Optimized cutting plans
• Better project decisions

Want to see it in action?

Upload your IFC model and generate your cutting list, BOM, and optimized plan in minutes.`,
    image: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&h=450&fit=crop',
    datePublished: '2025-03-19',
  },
  {
    id: '7',
    slug: 'how-to-reduce-steel-waste-in-fabrication-projects',
    title: 'How to Reduce Steel Waste in Fabrication Projects',
    excerpt: 'Steel waste is one of the biggest hidden costs in fabrication. Most shops focus on steel price per ton — but the real impact on profitability often comes from how efficiently that steel is used.',
    content: `Steel waste is one of the biggest hidden costs in fabrication.

Most shops focus on steel price per ton — but the real impact on profitability often comes from how efficiently that steel is used.

Even small improvements in planning can lead to significant savings.

In this guide, we'll break down the main causes of steel waste — and how to reduce it.

**Where Steel Waste Comes From**

Before solving the problem, it's important to understand where waste is created.

**1. Poor Cutting Planning**

The most common issue.

Parts are not arranged efficiently within stock bars, leading to:
• Large leftover pieces
• Unusable offcuts
• Increased scrap

**2. Manual Calculations**

Many fabrication shops still rely on:
• Excel sheets
• Manual grouping
• Experience-based decisions

This often leads to:
• Over-ordering materials
• Miscalculations
• Inefficient usage

**3. Lack of Visibility from Models**

Even when working with IFC or Tekla models, teams often don't have:
• Clear material breakdowns
• Accurate quantities
• Optimized cutting strategies

So decisions are made without full data.

**4. Late Optimization**

In many projects, optimization happens after materials are already ordered.

At that point:
👉 It's too late to reduce waste.

**5 Practical Ways to Reduce Steel Waste**

**1. Plan Before You Order Steel**

The biggest mistake is ordering materials before fully understanding:
• Total quantities
• Required lengths
• Cutting strategy

👉 Always define your cutting plan first.

**2. Group Parts by Profile and Length**

Instead of handling parts randomly:
• Group by profile type (IPE, HEA, RHS…)
• Sort by length
• Plan cutting sequences accordingly

This improves material utilization significantly.

**3. Use Standard Stock Sizes Efficiently**

Steel typically comes in:
• **6m**
• **12m**

The goal is to:
👉 Fit parts into these lengths with minimal leftover

Without optimization, small inefficiencies add up quickly.

**4. Reuse Offcuts (When Possible)**

Not all leftover material is waste.

Track:
• Reusable lengths
• Common sizes
• Future usage

But this only works if leftovers are:
👉 Planned and controlled

**5. Use Optimization Tools Instead of Manual Planning**

This is where the biggest improvement happens.

Manual planning has limits:
• Time-consuming
• Not scalable
• Not precise

Optimization tools can:
• Test multiple cutting combinations
• Find the best material usage
• Reduce waste significantly

**How Cutwise Helps Reduce Steel Waste**

Cutwise is built specifically to solve this problem.

Instead of manual workflows, you simply:

👉 Upload your IFC model or cut list

And get:

✔ Optimized cutting plans
✔ Accurate BOM (Bill of Materials)
✔ Exact stock bar requirements
✔ Clear view of material usage

**What This Means in Practice**

Without optimization:
• **100-ton** project
• **6–8% waste** → **6–8 tons** lost

With Cutwise:
• Reduce waste to **~2–3%**
• Save **3–5 tons** of steel

👉 That's direct cost savings on every project.

**Why This Matters**

{{Steel waste is not just leftover material — it directly affects project margins, pricing competitiveness, and operational efficiency.}}

Fabricators who control waste:
👉 Win more projects and improve profitability.

**Final Thoughts**

{{Reducing steel waste doesn't require changing your entire operation. It starts with better planning before cutting begins.}}

Cutwise gives you the tools to:
• Understand your material needs
• Optimize cutting strategies
• Reduce waste automatically

Want to reduce waste on your next project?

Upload your model and get an optimized cutting plan and BOM in minutes.`,
    image: 'https://images.unsplash.com/photo-1581092160568-35ac70634a08?w=800&h=450&fit=crop',
    datePublished: '2025-03-20',
  },
  {
    id: '8',
    slug: 'manual-vs-automated-steel-planning-cost-comparison',
    title: 'Manual vs Automated Steel Planning (Cost Comparison)',
    excerpt: 'Steel fabrication is a margin-driven business. Most companies focus on steel price per ton — but one of the biggest cost drivers is often overlooked: how efficiently you plan your materials.',
    content: `Steel fabrication is a margin-driven business.

Most companies focus on steel price per ton — but one of the biggest cost drivers is often overlooked:

👉 How efficiently you plan your materials

In this article, we compare manual steel planning vs automated planning, and show the real cost impact on fabrication projects.

**What is Manual Steel Planning?**

Manual planning typically involves:
• Exporting reports from Tekla / SDS2
• Working in Excel
• Grouping parts manually
• Estimating stock bar usage
• Building cutting plans by experience

This is still the most common approach in many workshops.

**What is Automated Steel Planning?**

Automated planning uses software to:
• Analyze project data (IFC or cut list)
• Generate a BOM automatically
• Optimize cutting plans
• Calculate exact stock requirements

Tools like Cutwise handle this process in minutes.

**Key Differences**

**1. Time Investment**

**Manual:**
• Several hours per project
• Repetitive Excel work
• Back-and-forth adjustments

**Automated:**
• Minutes to generate results
• No manual calculations

👉 Time saved = faster project turnaround

**2. Accuracy**

**Manual:**
• High risk of human error
• Missing or duplicated parts
• Inconsistent results

**Automated:**
• Data-driven calculations
• Consistent outputs
• Reliable quantities

👉 Fewer mistakes = fewer costly surprises

**3. Material Usage**

**Manual:**
• Based on experience
• Limited optimization
• Typically **5–10% waste**

**Automated:**
• Algorithm-based optimization
• Best-fit cutting plans
• Typically **2–4% waste**

👉 This is where the biggest savings happen

**4. Cost Impact (Real Example)**

Let's take a typical project:
• **100 tons** of steel
• **€1,000** per ton

**Manual Planning:**
• **7% waste** → **7 tons** lost
• Cost of waste: **€7,000**

**Automated Planning (Cutwise):**
• **3% waste** → **3 tons** lost
• Cost of waste: **€3,000**

💰 **Savings:**

👉 **€4,000** saved on a single project

**5. Scalability**

**Manual:**
• Hard to scale
• Depends on specific people
• Slows down as workload increases

**Automated:**
• Scales easily
• Works the same for every project
• Supports growth

**Why Most Fabricators Still Use Manual Planning**

Even with clear disadvantages, many shops still rely on manual methods because:
• "This is how we've always done it"
• Lack of simple tools
• Fear of changing workflows

{{But this comes at a hidden cost — on every project.}}

**How Cutwise Changes the Game**

Cutwise replaces manual planning with a simple workflow:

👉 Upload your IFC model or cut list

And instantly get:

✔ Accurate BOM (Bill of Materials)
✔ Optimized cutting plans
✔ Exact stock bar quantities
✔ Clear material cost insights

**What You Gain**

With Cutwise, you:
• Reduce steel waste
• Save thousands per project
• Eliminate manual Excel work
• Improve planning accuracy
• Deliver better pricing to clients

**Final Thoughts**

{{Manual planning may feel "good enough" — but it comes at a real cost.}}

In today's competitive market, fabricators who use automated planning tools gain a clear advantage:

👉 Lower costs
👉 Better margins
👉 Faster workflows

Cutwise gives you that advantage — without changing your entire process.

Ready to see the difference?

Upload your project and compare manual vs optimized results in minutes.`,
    image: 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=800&h=450&fit=crop',
    datePublished: '2025-03-21',
  },
  {
    id: '9',
    slug: 'how-to-calculate-steel-quantities-from-ifc-models',
    title: 'How to Calculate Steel Quantities from IFC Models',
    excerpt: 'For steel fabricators and detailing firms, accurately calculating steel quantities is essential for material purchasing, cost estimation, and production planning. In this guide, we break down how to do it faster and more accurately.',
    content: `For steel fabricators and detailing firms, accurately calculating steel quantities is essential for:
• Material purchasing
• Cost estimation
• Production planning

Today, most projects are delivered as IFC models — which contain all the necessary data.

But extracting accurate quantities from these models is not always simple.

In this guide, we'll break down how steel quantities are calculated from IFC models — and how to do it faster and more accurately.

**What is an IFC Model?**

An IFC (Industry Foundation Classes) file is a standardized 3D model format used in construction.

It contains detailed information about:
• Steel elements (beams, columns, plates)
• Dimensions
• Profiles
• Materials
• Assemblies

👉 In theory, everything you need for quantity takeoff is already inside the model.

**Step 1: Load the IFC Model**

The first step is to open the IFC file using:
• IFC viewers
• BIM tools
• Custom software

Once loaded, you can access all elements in the project.

**Step 2: Identify Relevant Steel Elements**

Not all elements in an IFC model are relevant for fabrication.

You need to filter:
• Structural steel members
• Profiles (IPE, HEA, RHS, etc.)
• Plates

Exclude:
• Bolts
• Non-structural elements
• Temporary objects

**Step 3: Extract Quantities per Element**

For each steel part, you need to extract:
• Length
• Profile type
• Quantity
• Weight (if available)

**Typical Manual Approach:**
• Navigate model element by element
• Export data to Excel
• Clean and organize manually

**The Problem:**
• Time-consuming
• High risk of missing data
• Difficult to scale for large projects

**Step 4: Group Data into a BOM**

Once the raw data is extracted, it must be grouped into a Bill of Materials (BOM):
• Total length per profile
• Quantity per section
• Total weight

This is used for:
• Ordering materials
• Estimating costs

**Step 5: Convert Quantities into Usable Data**

Raw quantities are not enough.

Fabricators need to translate them into:
• Stock bar requirements
• Cutting lists
• Material usage plans

This is where many workflows break.

**Common Challenges When Working with IFC Quantities**

Even though IFC models contain rich data, fabricators often face:

❌ **Unstructured Data**

Information is not always organized for fabrication needs.

❌ **Manual Processing**

Heavy reliance on Excel and manual filtering.

❌ **Missing or Inconsistent Data**

Different models may have different standards.

❌ **No Cutting Optimization**

Quantities alone don't tell you how to cut the steel efficiently.

**How Cutwise Simplifies Quantity Extraction**

Cutwise removes the complexity from this process.

Instead of:
• Manually extracting data
• Cleaning Excel files
• Building BOMs
• Guessing cutting plans

You simply:

👉 Upload your IFC model

And Cutwise automatically generates:

✔ Structured Bill of Materials (BOM)
✔ Accurate material quantities
✔ Optimized cutting plans
✔ Stock bar requirements

**What This Means in Practice**

**Manual Workflow:**
• Hours of work
• Risk of errors
• Limited optimization

**With Cutwise:**
• Results in minutes
• Accurate data
• Optimized material usage

**Real Impact on Projects**

Let's take a typical case:
• Large steel project
• Hundreds or thousands of elements

**Without automation:**
• Time spent on extraction
• Risk of missing quantities
• Inefficient material planning

**With Cutwise:**
• Instant quantity extraction
• Clear BOM
• Optimized cutting strategy

👉 Result: better decisions before fabrication begins

**Why This Matters**

Accurate quantity calculation is not just about numbers.

It directly impacts:
• Project cost
• Material waste
• Production efficiency

Fabricators who rely on manual workflows often:

👉 Overpay for steel
👉 Lose time
👉 Reduce their margins

**Final Thoughts**

{{IFC models already contain all the data you need — the challenge is turning that data into usable insights.}}

Cutwise does exactly that.

It transforms your IFC model into:
• Clear material quantities
• Structured BOM
• Optimized cutting plans

All in one simple workflow.

Want to simplify your quantity takeoff?

Upload your IFC model and get accurate quantities + cutting plan in minutes.`,
    image: 'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=800&h=450&fit=crop',
    datePublished: '2025-03-22',
  },
  {
    id: '10',
    slug: 'how-to-estimate-steel-project-costs-before-fabrication',
    title: 'How to Estimate Steel Project Costs Before Fabrication',
    excerpt: 'Accurate cost estimation is one of the most critical steps in any steel fabrication project. Quote too high — you lose the job. Quote too low — you lose your margin. In this guide, we break down how to estimate correctly and improve accuracy.',
    content: `Accurate cost estimation is one of the most critical steps in any steel fabrication project.

Quote too high — you lose the job.
Quote too low — you lose your margin.

The challenge is that many cost estimations are based on incomplete or unoptimized data, which leads to costly mistakes later in the project.

In this guide, we'll break down how to estimate steel project costs correctly — and how to improve accuracy before fabrication even begins.

**What Makes Up Steel Project Costs?**

Before estimating, it's important to understand the key cost components:

**1. Material Cost**

The largest portion of any project.

Calculated based on:
• Total steel weight (tons)
• Price per ton

👉 Even small errors here have a big financial impact.

**2. Waste (Hidden Cost)**

This is where many fabricators lose money.

Waste comes from:
• Inefficient cutting
• Poor planning
• Leftover materials

Typical waste:
👉 **5–10%** of total material

**3. Processing Costs**

Includes:
• Cutting
• Welding
• Drilling
• Handling

These depend on:
• Number of parts
• Complexity
• Time required

**4. Logistics & Handling**

• Transport
• Storage
• Internal movement

Often underestimated — but still relevant.

**Step-by-Step: How to Estimate Costs Correctly**

**Step 1: Extract Accurate Quantities**

Start by calculating:
• Total length per profile
• Quantity of parts
• Total weight

**Common Method:**
• Export from Tekla / SDS2
• Process in Excel

**The Problem:**
• Time-consuming
• Prone to errors
• Not always complete

**Step 2: Build a Bill of Materials (BOM)**

Organize your data into:
• Profile types (IPE, HEA, RHS…)
• Quantities
• Total tonnage

This becomes the foundation of your cost estimate.

**Step 3: Estimate Material Usage (Not Just Quantities)**

This is where many estimations fail.

👉 Having quantities is not enough
👉 You need to know how the steel will be used

Key question:
How many stock bars do I actually need?

**Step 4: Create a Cutting Plan**

Before ordering steel, define:
• How parts will be cut
• How they fit into stock bars
• Expected leftover material

Without this step:
You are guessing your material cost.

**Step 5: Calculate Waste Impact**

Example:
• Project size: **100 tons**
• Steel price: **€1,000** / ton

**Without optimization:**
• **7% waste** → **7 tons** lost
• Cost: **€7,000**

**With optimization:**
• **3% waste** → **3 tons** lost
• Cost: **€3,000**

👉 Difference: **€4,000** on one project

**Where Most Estimations Go Wrong**

Fabricators often:

❌ Estimate based on raw quantities only
❌ Ignore cutting efficiency
❌ Skip optimization before ordering
❌ Rely on manual Excel workflows

This leads to:
• Over-ordering steel
• Underestimating waste
• Reduced profit margins

**How Cutwise Improves Cost Estimation**

Cutwise allows you to estimate costs based on real, optimized data — not assumptions.

Instead of:
• Manual quantity extraction
• Guessing stock usage
• Estimating waste

You simply:

👉 Upload your IFC model or cut list

And get:

✔ Accurate BOM (Bill of Materials)
✔ Optimized cutting plans
✔ Exact stock bar requirements
✔ Clear material usage and waste insights

**What This Means for Your Business**

With Cutwise, you can:
• Quote projects with confidence
• Reduce material over-ordering
• Improve profit margins
• Stay competitive in tenders

👉 You are no longer estimating — you are calculating.

**Real Advantage in Competitive Bidding**

In today's market:
• Small price differences win projects
• Margins are tight
• Mistakes are expensive

Fabricators who use optimized data can:

✔ Offer more competitive prices
✔ Maintain healthy margins
✔ Reduce risk

**Final Thoughts**

{{Accurate cost estimation starts before fabrication begins.}}

{{It's not just about knowing how much steel you need — it's about knowing how efficiently you will use it.}}

Cutwise gives you that visibility.

Want to estimate your next project more accurately?

Upload your model and get a BOM, cutting plan, and real material cost insights in minutes.`,
    image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&h=450&fit=crop',
    datePublished: '2025-03-23',
  },
  {
    id: '11',
    slug: 'why-steel-fabricators-still-use-excel-and-what-its-costing-them',
    title: 'Why Steel Fabricators Still Use Excel — And What It\'s Costing Them',
    excerpt: 'Walk into almost any steel fabrication shop, and you\'ll still find Excel at the center of operations. It\'s flexible and familiar — but Excel was never built for steel fabrication workflows. Here\'s the hidden cost.',
    content: `Walk into almost any steel fabrication shop, and you'll still find the same tool at the center of operations:

👉 Excel

From cut lists to material planning, Excel has been the default solution for years.

It's flexible.
It's familiar.
And everyone knows how to use it.

But here's the problem:

👉 Excel was never built for steel fabrication workflows.

And the hidden cost of relying on it is much higher than most shops realize.

**Why Fabricators Still Use Excel**

Before we talk about the downsides, it's important to understand why Excel is still so common.

**1. It's Familiar**

Most teams have been using Excel for years.

There's no learning curve — and no need to change processes.

**2. It Feels Flexible**

You can:
• Build your own sheets
• Adjust formulas
• Customize workflows

But this flexibility often becomes chaos over time.

**3. No Dedicated Tool (Until Now)**

Many fabricators simply don't have a better alternative that fits their workflow.

So Excel becomes the "default system."

**The Hidden Costs of Excel**

At first glance, Excel seems free.

But in reality, it introduces several hidden costs that affect every project.

**1. Time Loss on Every Project**

Manual workflows require:
• Exporting data from Tekla / SDS2
• Cleaning and organizing spreadsheets
• Grouping parts
• Building cutting plans manually

👉 This can take hours per project

Time that could be spent on production or winning new jobs.

**2. Human Errors**

Excel depends entirely on manual input.

Common issues:
• Missing parts
• Incorrect quantities
• Broken formulas
• Duplicated data

👉 Even small mistakes can lead to costly fabrication issues.

**3. No Real Optimization**

Excel is not designed to optimize cutting plans.

Most planning is based on:
• Experience
• Trial and error
• Approximation

**Result:**

👉 **5–10%** material waste in many projects

**4. Inconsistent Results**

Two people working on the same project in Excel can produce:
• Different BOMs
• Different cutting plans
• Different material estimates

👉 No standardization = no control

**5. Lack of Scalability**

As your business grows:
• More projects
• More complexity
• More data

Excel becomes harder to manage.

👉 What worked for small jobs breaks at scale.

**What This Is Really Costing You**

Let's look at a simple example:
• Project size: **100 tons**
• Steel price: **€1,000** / ton

**With Excel-based planning:**
• **7% waste** → **7 tons** lost
• Cost: **€7,000**

**With optimized planning:**
• **3% waste** → **3 tons** lost
• Cost: **€3,000**

👉 **€4,000** difference on a single project

Now multiply that across multiple projects per year.

**Why Excel Can't Solve This**

Excel is a general-purpose tool.

It was never built to:
• Analyze IFC models
• Generate BOM automatically
• Optimize cutting plans
• Calculate stock bar usage

Trying to force it to do these tasks leads to:

👉 Complexity, errors, and inefficiency

**How Cutwise Replaces Excel Workflows**

Cutwise is designed specifically for steel fabrication planning.

Instead of:
• Exporting to Excel
• Cleaning data manually
• Building BOMs
• Guessing cutting plans

You simply:

👉 Upload your IFC model or cut list

And get:

✔ Automatic BOM (Bill of Materials)
✔ Optimized cutting plans
✔ Accurate stock bar requirements
✔ Clear material usage insights

**What Changes for Your Team**

With Cutwise:
• No more Excel-based planning
• No manual calculations
• No guesswork

👉 Just clear, optimized results in minutes

**When Should You Move Away from Excel?**

If you:
• Work on multiple projects per month
• Handle complex steel structures
• Want to reduce material waste
• Need faster and more accurate planning

👉 It's time to upgrade your workflow

**Final Thoughts**

{{Excel helped the industry for years. But steel fabrication is evolving — and the tools need to evolve with it.}}

{{The cost of staying with manual workflows is not just time — it's lost profit on every project.}}

Cutwise gives you a simple way to move forward:
• Faster planning
• Better accuracy
• Lower material costs

Ready to move beyond Excel?

Upload your project and get your BOM and optimized cutting plan in minutes.`,
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=450&fit=crop',
    datePublished: '2025-03-24',
  },
  {
    id: '12',
    slug: 'what-fabricators-should-check-before-ordering-steel',
    title: 'What Fabricators Should Check Before Ordering Steel',
    excerpt: 'Ordering steel too early — or without full clarity — is one of the most common (and expensive) mistakes in fabrication. In this guide, we walk through the key checks every fabricator should complete before ordering.',
    content: `Ordering steel too early — or without full clarity — is one of the most common (and expensive) mistakes in fabrication.

Once the material arrives on-site, it's too late to fix planning errors.

👉 The result:
• Excess stock
• Missing materials
• High waste
• Reduced margins

In this guide, we'll walk through the key checks every fabricator should complete before ordering steel.

**Why This Step Matters**

Steel is usually the largest cost component in a project.

A small mistake in ordering can lead to:
• Thousands in unnecessary costs
• Delays in production
• Rework and inefficiencies

👉 Proper planning before ordering = better profitability

**The Pre-Order Checklist**

**1. Verify the Bill of Materials (BOM)**

Before anything else, make sure your BOM is:
• Complete
• Accurate
• Up to date

Check:
• All profiles included (IPE, HEA, RHS…)
• Correct quantities
• No missing parts

**Common Mistake:**
Relying on partially extracted data from the model.

**2. Confirm Total Quantities & Weight**

You should clearly know:
• Total length per profile
• Total tonnage

This directly affects:
👉 Your purchasing cost

**Risk:**
Even small quantity errors can lead to:
• Over-ordering
• Under-ordering

**3. Define the Cutting Plan (Before Ordering)**

This is one of the most important — and most skipped — steps.

👉 Do NOT order steel before knowing how it will be cut.

You need to define:
• How parts fit into stock bars
• Cutting sequences
• Expected leftovers

Without this:
👉 You are guessing your material needs

**4. Calculate Stock Bar Requirements**

Steel is purchased in standard lengths:
• **6m**
• **12m**

You must determine:

👉 How many stock bars are actually required

**Common Issue:**
Ordering based on total length only (without optimization)

👉 This leads to excess material and waste

**5. Estimate Material Waste**

Every cutting plan produces leftover material.

The key is to control it.

**Typical waste without optimization:**
👉 **5–10%**

**With proper planning:**
👉 **2–4%**

**Why it matters:**
On a **100-ton** project:
• **5% waste** = **5 tons** lost
• **10% waste** = **10 tons** lost

**6. Check for Reusable Offcuts**

Before ordering new steel, check:
• Existing stock
• Reusable leftover pieces
• Common lengths already available

👉 This can reduce new material purchases

**7. Validate Profile Types & Sizes**

Make sure:
• Correct profiles are specified
• No mismatches between model and order
• All sizes match supplier availability

Mistakes here can cause:
• Delays
• Reorders
• Increased costs

**8. Review the Full Material Plan**

Before placing the order, ask:

👉 Do I have full visibility of:
• Quantities
• Cutting plan
• Stock usage
• Waste

If not — you're taking a risk.

**Where Most Fabricators Go Wrong**

Many shops:

❌ Order steel based on rough estimates
❌ Skip cutting optimization
❌ Rely on Excel workflows
❌ Discover issues only after material arrives

👉 At that point, it's already too late.

**How Cutwise Helps Before You Order**

Cutwise is designed exactly for this stage.

Instead of:
• Manually checking everything
• Working in Excel
• Guessing cutting plans

You simply:

👉 Upload your IFC model or cut list

And get:

✔ Accurate BOM (Bill of Materials)
✔ Optimized cutting plans
✔ Exact stock bar requirements
✔ Clear material usage and waste insights

**What This Means for Your Business**

With Cutwise, you can:
• Order the right amount of steel
• Reduce over-purchasing
• Minimize waste
• Improve project margins

👉 You move from estimation → to precision

**Real Impact Example**

Project: **100 tons**
Steel price: **€1,000** / ton

**Without proper checks:**
• **7% waste** → **€7,000** lost

**With optimized planning:**
• **3% waste** → **€3,000** lost

👉 **€4,000** saved before fabrication even begins

**Final Thoughts**

{{Ordering steel should never be based on assumptions. It should be based on clear, optimized, and validated data.}}

Fabricators who take the time to check properly:
• Reduce risk
• Save money
• Improve efficiency

Cutwise makes this process simple and fast.

Ready to order steel with confidence?

Upload your project and get your BOM, cutting plan, and material insights in minutes.`,
    image: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&h=450&fit=crop',
    datePublished: '2025-03-25',
  },
  {
    id: '13',
    slug: 'from-ifc-model-to-fabrication-complete-digital-workflow',
    title: 'From IFC Model to Fabrication: The Complete Digital Workflow',
    excerpt: 'Most projects start with detailed 3D models in Tekla or SDS2. But moving from the IFC model to actual fabrication is still often manual, fragmented, and inefficient. In this guide, we walk through the complete workflow — and where most fabricators lose time and money.',
    content: `Steel fabrication has become highly digital.

Most projects today start with detailed 3D models created in tools like Tekla Structures or SDS2. These models contain everything needed for fabrication — parts, profiles, dimensions, and assemblies.

But there's a gap.

👉 Moving from the IFC model to actual fabrication is still often manual, fragmented, and inefficient.

In this guide, we'll walk through the complete workflow — and show where most fabricators lose time and money.

**Step 1: Design & Detailing (Tekla / SDS2)**

The process begins with the detailing phase.

Detailers create a full 3D model including:
• Steel members (IPE, HEA, RHS…)
• Plates and assemblies
• Exact dimensions and connections

At this stage, the model is highly accurate and contains all required data.

👉 But it's still not ready for fabrication planning.

**Step 2: Export to IFC**

To share the model across teams, it's exported as an IFC file.

This file includes:
• Geometry
• Properties
• Material data

👉 IFC becomes the standard format for collaboration.

**Step 3: Data Extraction (The Breaking Point)**

This is where most workflows start to break.

**Typical process:**
• Export reports from Tekla / SDS2
• Open in Excel
• Filter and clean data
• Group parts manually

**The Problem:**
• Time-consuming
• Error-prone
• Not standardized

👉 Even though the data exists, it's not usable in its raw form.

**Step 4: Build the Bill of Materials (BOM)**

Once the data is extracted, fabricators create a BOM:
• Total quantities per profile
• Total lengths
• Total weight

This is used for:
• Ordering materials
• Estimating costs

**The Problem:**

Manual BOM creation leads to:
• Missing items
• Incorrect quantities
• Lack of clarity

**Step 5: Cutting Plan Optimization (Where Money is Won or Lost)**

This is the most critical stage.

👉 How efficiently you cut the steel determines your profit.

Fabricators must:
• Fit parts into stock bars (**6m** / **12m**)
• Minimize leftover material
• Plan cutting sequences

**Manual Reality:**
• Excel-based planning
• Trial and error
• Experience-based decisions

**Result:**

👉 **5–10%** material waste in many projects

**Step 6: Fabrication Execution**

Finally, the output is passed to the workshop:
• Cutting lists
• Production plans
• Assembly instructions

At this point:

👉 Mistakes become expensive
👉 Changes are difficult

**The Real Problem in the Workflow**

Even with advanced tools like Tekla and SDS2:

❌ No direct bridge between model and cutting optimization
❌ Heavy reliance on Excel
❌ Manual processes between steps
❌ No visibility into material efficiency

👉 This gap is where time and money are lost.

**How Cutwise Connects the Entire Workflow**

Cutwise fills this gap.

Instead of:
• Exporting reports
• Working in Excel
• Manually building BOMs
• Guessing cutting plans

You simply:

👉 Upload your IFC model

And get:

✔ Structured BOM (Bill of Materials)
✔ Accurate material quantities
✔ Optimized cutting plans
✔ Exact stock bar requirements
✔ Clear material usage insights

**What This Changes**

**Before (Manual Workflow):**
• Fragmented process
• Multiple tools
• High risk of errors
• Material waste

**After (With Cutwise):**
• One streamlined flow
• Automated data extraction
• Optimized planning
• Reduced waste and cost

**Real Impact on Projects**

Let's take a typical example:
• Project: **100 tons**
• Steel price: **€1,000** / ton

**Manual workflow:**
• **7% waste** → **€7,000** lost

**With Cutwise:**
• **3% waste** → **€3,000** lost

👉 **€4,000** saved on a single project

**Why This Matters Now**

The steel fabrication industry is becoming more competitive:
• Tighter margins
• Faster project timelines
• Higher expectations from clients

Fabricators who adopt digital workflows gain:

✔ Better cost control
✔ Faster planning
✔ Higher profitability

**Final Thoughts**

{{The future of steel fabrication is not just about better models — it's about what you do with those models.}}

IFC files already contain everything you need.

The key is turning that data into:
• Clear material insights
• Optimized cutting plans
• Better decisions before fabrication

Cutwise makes that possible.

Ready to connect your model to real fabrication results?

Upload your IFC model and get your BOM + optimized cutting plan in minutes.`,
    image: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&h=450&fit=crop',
    datePublished: '2025-03-26',
  },
]

export const getLatestPosts = (count: number = 3) =>
  [...blogPosts].sort((a, b) => new Date(b.datePublished).getTime() - new Date(a.datePublished).getTime()).slice(0, count)

export const getExcerptLines = (text: string, lines: number = 3) =>
  text.split(/\s+/).slice(0, lines * 12).join(' ') + (text.split(/\s+/).length > lines * 12 ? '...' : '')
