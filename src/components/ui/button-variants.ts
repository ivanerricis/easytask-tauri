import { cva } from "class-variance-authority"

export const buttonVariants = cva(
  "inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-xs text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-white shadow-xs hover:bg-primary/90",
        destructive:
          "bg-transparent border-2 border-destructive/15 shadow-xs text-destructive hover:bg-destructive/15",
        outline:
          "bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-background dark:hover:bg-input/50 border",
        buttonIcon:
          "bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-background dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80",
        ghost:
          "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-xs gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-xs px-6 has-[>svg]:px-4",
        icon: "size-8 [&_svg]:!h-5 [&_svg]:!w-5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)
