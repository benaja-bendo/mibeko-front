import * as React from "react"
import { cn } from "@/shared/lib/utils"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'gold' | 'danger'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    const variants = {
      default: "bg-s3 text-t1 hover:bg-s4 border border-b1",
      outline: "bg-transparent border border-b1 text-t2 hover:bg-s2 hover:text-t1",
      ghost: "bg-transparent text-t2 hover:bg-s2 hover:text-t1 border-none",
      gold: "bg-gold text-[#120e00] hover:bg-gold/90 border-none font-bold",
      danger: "bg-red-d text-red hover:bg-red/20 border border-red/20",
    }
    
    const sizes = {
      default: "h-9 px-4 py-2 text-sm",
      sm: "h-8 px-3 text-xs",
      lg: "h-10 px-8 text-sm",
      icon: "h-9 w-9 p-0 flex items-center justify-center",
    }

    return (
      <button
        className={cn(
          "inline-flex items-center justify-center rounded-md font-medium transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold disabled:pointer-events-none disabled:opacity-50",
          variants[variant],
          sizes[size],
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
