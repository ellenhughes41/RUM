import * as React from "react";
import { Radio } from "antd";
import { cn } from "@/lib/utils";

export interface RadioGroupProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  disabled?: boolean;
  children?: React.ReactNode;
}

const RadioGroup = React.forwardRef<any, RadioGroupProps>(
  ({ className, onValueChange, children, ...props }, ref) => (
    <Radio.Group
      ref={ref}
      onChange={(e) => onValueChange?.(e.target.value)}
      className={cn("grid gap-2", className)}
      {...(props as any)}
    >
      {children}
    </Radio.Group>
  ),
);
RadioGroup.displayName = "RadioGroup";

export interface RadioGroupItemProps {
  value: string;
  id?: string;
  className?: string;
  disabled?: boolean;
  children?: React.ReactNode;
}

const RadioGroupItem = React.forwardRef<any, RadioGroupItemProps>(
  ({ className, children, ...props }, ref) => (
    <Radio ref={ref} className={cn(className)} {...(props as any)}>
      {children}
    </Radio>
  ),
);
RadioGroupItem.displayName = "RadioGroupItem";

export { RadioGroup, RadioGroupItem };
