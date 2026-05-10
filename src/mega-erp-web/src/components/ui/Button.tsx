import React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
}

export const Button = ({ 
  className, 
  variant = "primary", 
  size = "md", 
  ...props 
}: ButtonProps) => {
  const variants = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-500/20",
    secondary: "bg-purple-600 text-white hover:bg-purple-700 shadow-purple-500/20",
    outline: "border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50",
    ghost: "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-6 py-2.5",
    lg: "px-8 py-3.5 text-lg",
  };

  return (
    <button
      className={cn(
        "premium-button inline-flex items-center justify-center font-semibold transition-all duration-300",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  );
};
