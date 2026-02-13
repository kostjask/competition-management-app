type LoadingSpinnerProps = {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
};

export function LoadingSpinner({ size = "md", className = "" }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4 border-2",
    md: "h-8 w-8 border-2",
    lg: "h-12 w-12 border-3",
    xl: "h-16 w-16 border-4",
  };

  return (
    <div className={`inline-block ${className}`} role="status" aria-label="Loading">
      <div
        className={`${sizeClasses[size]} animate-spin rounded-full border-slate-200 border-t-amber-500`}
      />
    </div>
  );
}

type FullPageLoadingProps = {
  message?: string;
};

/**
 * Full-page centered loading spinner with optional message
 */
export function FullPageLoading({ message }: FullPageLoadingProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50">
      <LoadingSpinner size="xl" />
      {message && <p className="text-sm text-slate-600">{message}</p>}
    </div>
  );
}