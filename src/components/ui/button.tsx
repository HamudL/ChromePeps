import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all duration-200 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-sm hover:bg-primary-strong",
        // Primäres Conversion-CTA der „Chromatogramm"-Sprache: volle
        // Viridian-Fläche, heller Text, einmaliger Shine-Sweep beim
        // Hover (btn-shine, globals.css). Der Variant-Name "gold" ist
        // historisch — alle Call-Sites nutzen ihn als Haupt-CTA.
        gold: "btn-shine bg-primary text-primary-foreground font-semibold shadow-[0_1px_0_hsl(0_0%_100%/0.12)_inset,0_10px_28px_-14px_hsl(var(--primary)/0.7)] hover:bg-primary-strong",
        // Ink — tiefes Nachtblau als gewichtiger Sekundär-CTA auf
        // hellen Flächen.
        ink: "bg-ink text-ink-foreground border border-ink-border shadow-sm hover:border-primary/50 hover:bg-[hsl(218_32%_10%)]",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground hover:border-primary/60",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary-strong underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        // XL — für Hero-/Hauptseiten-CTAs mit Präsenz.
        xl: "h-12 rounded-md px-9 text-base [&_svg]:size-5",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
