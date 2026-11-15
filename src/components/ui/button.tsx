import * as React from "react";
import { Button as AntButton } from "antd";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Keep buttonVariants for backward compat (used by pagination.tsx)
const buttonVariants = cva("", {
  variants: {
    variant: {
      default: "",
      destructive: "",
      success: "",
      outline: "",
      secondary: "",
      ghost: "",
      link: "",
      ai: "",
      approve: "",
      deny: "",
    },
    size: {
      default: "",
      sm: "",
      lg: "",
      xl: "",
      icon: "",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "default",
  },
});

export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "type">,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  type?: "submit" | "button" | "reset";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "default",
      size = "default",
      asChild = false,
      type,
      children,
      style: userStyle,
      ...props
    },
    ref,
  ) => {
    let antType: "primary" | "default" | "dashed" | "text" | "link" = "primary";
    let danger = false;
    let customStyle: React.CSSProperties = {};

    switch (variant) {
      case "destructive":
        antType = "primary";
        danger = true;
        break;
      case "success":
        antType = "primary";
        customStyle = { backgroundColor: "#52c41a", borderColor: "#52c41a" };
        break;
      case "outline":
        antType = "default";
        break;
      case "secondary":
        antType = "default";
        break;
      case "ghost":
        antType = "text";
        break;
      case "link":
        antType = "link";
        break;
      case "ai":
        antType = "primary";
        customStyle = {
          background: "linear-gradient(135deg, #1677ff, #36cfc9)",
          borderColor: "transparent",
        };
        break;
      case "approve":
        antType = "primary";
        customStyle = { backgroundColor: "#52c41a", borderColor: "#52c41a" };
        break;
      case "deny":
        antType = "primary";
        danger = true;
        break;
      default:
        antType = "primary";
        break;
    }

    let antSize: "small" | "middle" | "large" = "middle";
    switch (size) {
      case "sm":
        antSize = "small";
        break;
      case "lg":
      case "xl":
        antSize = "large";
        break;
      case "icon":
        antSize = "small";
        break;
      default:
        antSize = "middle";
    }

    return (
      <AntButton
        ref={ref as any}
        type={antType}
        htmlType={type}
        danger={danger}
        size={antSize}
        className={cn(size === "icon" && "!w-8 !h-8 !p-0 !min-w-0 !inline-flex !items-center !justify-center", className)}
        style={{ ...customStyle, ...userStyle }}
        {...(props as any)}
      >
        {children}
      </AntButton>
    );
  },
);
Button.displayName = "Button";
export { Button, buttonVariants };
