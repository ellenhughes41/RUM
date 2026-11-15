import * as React from "react";
import { Checkbox as AntCheckbox } from "antd";
import { cn } from "@/lib/utils";

export interface CheckboxProps extends Omit<React.HTMLAttributes<HTMLInputElement>, 'onChange'> {
  checked?: boolean | "indeterminate";
  onCheckedChange?: (checked: boolean | "indeterminate") => void;
  className?: string;
  disabled?: boolean;
  id?: string;
  name?: string;
  value?: string;
  required?: boolean;
}

const Checkbox = React.forwardRef<any, CheckboxProps>(
  ({ className, checked, onCheckedChange, ...props }, ref) => (
    <AntCheckbox
      ref={ref}
      checked={checked === "indeterminate" ? false : checked}
      indeterminate={checked === "indeterminate"}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
      className={cn(className)}
      {...(props as any)}
    />
  ),
);
Checkbox.displayName = "Checkbox";

export { Checkbox };
