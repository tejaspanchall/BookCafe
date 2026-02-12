export default function LoadingSpinner({ size = 'w-4 h-4', color = 'text-white' }) {
  return (
    <div className={`inline-block ${size} animate-spin rounded-full border-2 border-solid border-current border-r-transparent ${color} motion-reduce:animate-[spin_1.5s_linear_infinite]`} role="status">
      <span className="sr-only">Loading...</span>
    </div>
  );
} 