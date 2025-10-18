
import React from 'react'

type SelectRootProps = {
  value?: string
  onValueChange?: (v: string) => void
  children: React.ReactNode
  className?: string
}
export function Select({ value, onValueChange, children }: SelectRootProps) {
  const items: { value: string, label: string }[] = []
  React.Children.forEach(children as any, (child: any) => {
    if (child && child.type && child.type.displayName === 'SelectContent') {
      React.Children.forEach(child.props.children, (grand: any) => {
        if (grand && grand.type && grand.type.displayName === 'SelectItem') {
          const v = String(grand.props.value ?? '')
          let label = ''
          React.Children.forEach(grand.props.children, (n: any) => {
            if (typeof n === 'string') label += n
          })
          if (!label) label = v
          items.push({ value: v, label })
        }
      })
    }
  })
  return (
    <select className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-400"
      value={value} onChange={(e) => onValueChange?.(e.target.value)}>
      {items.map(it => <option key={it.value} value={it.value}>{it.label}</option>)}
    </select>
  )
}
export function SelectTrigger({ children, className='' }: React.PropsWithChildren<{ className?: string }>) { return <div className={className} style={{display:'none'}}>{children}</div> }
SelectTrigger.displayName = 'SelectTrigger'
export function SelectValue({ placeholder }: { placeholder?: string }) { return <>{placeholder}</> }
SelectValue.displayName = 'SelectValue'
export function SelectContent({ children }: React.PropsWithChildren<{}>) { return <>{children}</> }
SelectContent.displayName = 'SelectContent'
export function SelectItem({ value, children }: React.PropsWithChildren<{ value: string }>) { return <>{children}</> }
SelectItem.displayName = 'SelectItem'
