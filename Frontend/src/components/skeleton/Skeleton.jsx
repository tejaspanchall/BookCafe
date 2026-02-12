export default function Skeleton({ className, ...props }) {
  return (
    <div 
      className={`animate-pulse rounded ${className}`}
      style={{ 
        backgroundColor: "var(--color-bg-secondary)",
        color: "var(--color-text-primary)"
      }}
      {...props}
    />
  );
} 