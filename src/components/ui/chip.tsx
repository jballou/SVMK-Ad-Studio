import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { ChevronDown, CircleCheck, CircleX, Clock, Dot, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const chipVariants = cva(
  "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-3 py-1.5 text-base font-normal leading-none [&_svg]:shrink-0 [&_svg]:size-4",
  {
    variants: {
      variant: {
        information: "bg-brand-neutral-100 text-brand-neutral-850",
        completed: "bg-brand-green-100 text-brand-green-600",
        pending: "bg-brand-yellow-100 text-brand-orange-600",
        failed: "bg-brand-red-100 text-brand-red-500",
        label: "bg-brand-neutral-100 text-brand-neutral-850",
      },
      interactive: {
        true: "cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-periwinkle-500 disabled:cursor-not-allowed disabled:opacity-60",
        false: "",
      },
    },
    compoundVariants: [
      { variant: "information", interactive: true, className: "hover:bg-brand-neutral-150" },
      { variant: "label", interactive: true, className: "hover:bg-brand-neutral-150" },
      { variant: "completed", interactive: true, className: "hover:bg-brand-green-200" },
      { variant: "pending", interactive: true, className: "hover:bg-brand-yellow-200" },
      { variant: "failed", interactive: true, className: "hover:bg-brand-red-200" },
    ],
    defaultVariants: { variant: "information", interactive: false },
  },
);

export type ChipVariant = NonNullable<VariantProps<typeof chipVariants>["variant"]>;

const DEFAULT_ICON: Record<ChipVariant, LucideIcon | null> = {
  information: Dot,
  completed: CircleCheck,
  pending: Clock,
  failed: CircleX,
  label: null,
};

export interface ChipProps extends Omit<React.HTMLAttributes<HTMLElement>, "color"> {
  variant?: ChipVariant;
  /** Replace the variant's default leading icon, or pass `null` to hide it. */
  icon?: LucideIcon | null;
  /** Trailing chevron. Defaults to on for the `label` variant. */
  chevron?: boolean;
  /** Render as a button (for chips that open a menu or filter). */
  onClick?: React.MouseEventHandler<HTMLElement>;
  disabled?: boolean;
}

export function Chip({ variant = "information", icon, chevron, className, children, onClick, disabled, ...props }: ChipProps) {
  const Icon = icon === undefined ? DEFAULT_ICON[variant] : icon;
  const showChevron = chevron ?? variant === "label";
  const interactive = !!onClick;
  const classes = cn(chipVariants({ variant, interactive }), className);
  const content = (
    <>
      {Icon && <Icon aria-hidden strokeWidth={Icon === Dot ? 6 : 2} />}
      {children}
      {showChevron && <ChevronDown aria-hidden />}
    </>
  );
  if (interactive) {
    return (
      <button type="button" data-slot="chip" className={classes} onClick={onClick} disabled={disabled} {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}>
        {content}
      </button>
    );
  }
  return (
    <span data-slot="chip" className={classes} {...props}>
      {content}
    </span>
  );
}

export { chipVariants };
