"use client";

import {
  segmentedControlItemVariants,
  segmentedControlRootClassName,
} from "@/lib/segmented-control";
import {
  RadioGroupPrimitive,
  RadioPrimitive,
} from "@/components/ui/radio-group";

const itemClassName = segmentedControlItemVariants({
  className: "grow",
  state: "checked",
});

export default function Particle() {
  return (
    <RadioGroupPrimitive
      aria-label="Billing period"
      className={segmentedControlRootClassName}
      defaultValue="monthly"
    >
      <RadioPrimitive.Root className={itemClassName} value="monthly">
        Monthly
      </RadioPrimitive.Root>
      <RadioPrimitive.Root className={itemClassName} value="yearly">
        Yearly
      </RadioPrimitive.Root>
    </RadioGroupPrimitive>
  );
}
