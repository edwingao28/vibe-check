interface CardProps {
  title: string;
  description: string;
  variant?: "filled" | "outline";
}

export function Card({ title, description, variant = "filled" }: CardProps) {
  const base = "p-5";
  const variants = {
    filled: "bg-brand-50 rounded-md",
    outline: "border border-neutral-200 rounded-sm",
  };

  return (
    <div className={`${base} ${variants[variant]}`}>
      <h3 className="text-lg font-semibold text-brand-900 mb-2">{title}</h3>
      <p className="text-sm text-neutral-600 leading-relaxed">{description}</p>
    </div>
  );
}
