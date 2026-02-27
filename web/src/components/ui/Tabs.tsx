import { useState, ReactNode, useEffect, useRef } from 'react'
import { cn } from '../../lib/utils'

interface TabsProps {
  defaultValue: string
  children: ReactNode
  className?: string
}

interface TabsListProps {
  children: ReactNode
  className?: string
}

interface TabsTriggerProps {
  value: string
  children: ReactNode
  className?: string
}

interface TabsContentProps {
  value: string
  children: ReactNode
  className?: string
}

export function Tabs({ defaultValue, children, className }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultValue)
  const [direction, setDirection] = useState<'left' | 'right'>('right')
  const tabOrder = useRef<string[]>([])

  const childrenArray = Array.isArray(children) ? children : children ? [children] : []

  // Extract tab order on mount
  useEffect(() => {
    childrenArray.forEach((child: any) => {
      if (child.type === TabsContent && !tabOrder.current.includes(child.props.value)) {
        tabOrder.current.push(child.props.value)
      }
    })
  }, [])

  const handleTabChange = (newTab: string) => {
    const currentIndex = tabOrder.current.indexOf(activeTab)
    const newIndex = tabOrder.current.indexOf(newTab)
    setDirection(newIndex > currentIndex ? 'right' : 'left')
    setActiveTab(newTab)
  }

  return (
    <div className={cn("w-full", className)}>
      {childrenArray.map((child: any) => {
        if (child.type === TabsList) {
          return (
            <div key="list" className="flex justify-center border-b border-border mb-6">
              <div className="inline-flex gap-1 p-1">
                {child.props.children.map((trigger: any) => (
                  <button
                    key={trigger.props.value}
                    onClick={() => handleTabChange(trigger.props.value)}
                    className={cn(
                      "px-6 py-3 text-sm font-semibold rounded-t-lg transition-all duration-200",
                      activeTab === trigger.props.value
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                  >
                    {trigger.props.children}
                  </button>
                ))}
              </div>
            </div>
          )
        }
        if (child.type === TabsContent) {
          const isActive = activeTab === child.props.value
          return (
            <div
              key={child.props.value}
              className={cn(
                "relative overflow-hidden",
                !isActive && "hidden"
              )}
            >
              <div
                className={cn(
                  "animate-in fade-in-0 duration-300",
                  direction === 'right' ? "slide-in-from-right-10" : "slide-in-from-left-10"
                )}
              >
                {child.props.children}
              </div>
            </div>
          )
        }
        return child
      })}
    </div>
  )
}

export function TabsList({ children, className }: TabsListProps) {
  return <div className={className}>{children}</div>
}

export function TabsTrigger({ value: _value, children, className }: TabsTriggerProps) {
  return <div className={className}>{children}</div>
}

export function TabsContent({ value: _value, children, className }: TabsContentProps) {
  return <div className={className}>{children}</div>
}
