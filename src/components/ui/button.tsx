
import React from 'react'

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default'|'secondary'|'destructive'|'ghost'
  size?: 'default'|'icon'
}

export function Button({ className='', variant='default', size='default', ...props }: Props) {
  const base = 'inline-flex items-center justify-center gap-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:opacity-50'
  const variants: Record<string,string> = {
    default: 'bg-slate-900 text-white hover:bg-slate-800',
    secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-200',
    destructive: 'bg-red-600 text-white hover:bg-red-700',
    ghost: 'bg-transparent hover:bg-slate-100'
  }
  const sizes: Record<string,string> = {
    default: 'h-9 px-3 py-2 rounded-2xl',
    icon: 'h-9 w-9 rounded-xl'
  }
  return <button {...props} className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} />
}
