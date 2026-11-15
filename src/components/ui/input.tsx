import * as React from "react";
import { Input as AntInput } from "antd";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <AntInput
        type={type}
        className={cn(className)}
        ref={ref as any}
        {...(props as any)}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
