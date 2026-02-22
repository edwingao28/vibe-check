interface ButtonProps {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
}

export function Button({ children, variant = "primary", size = "md" }: ButtonProps) {
  const sizeClasses = {
    sm: "px-3 py-1.5 text-sm rounded-sm",
    md: "px-4 py-2 text-base rounded-md",
    lg: "px-6 py-3 text-lg rounded-lg",
  };

  const variantClasses = {
    primary: "bg-primary-600 text-white hover:bg-primary-700",
    secondary: "bg-secondary-500 text-white hover:bg-secondary-700",
    ghost: "bg-transparent text-neutral-700 hover:bg-neutral-100 border border-neutral-200",
  };

  return (
    <button
      className={`${sizeClasses[size]} ${variantClasses[variant]} font-body transition-colors`}
      style={{ fontFamily: "var(--font-body)" }}
    >
      {children}
    </button>
  );
}
