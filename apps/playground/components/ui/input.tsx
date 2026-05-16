export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="rounded-md border border-forkshop-border-strong bg-forkshop-surface px-3 py-2 text-sm text-forkshop-fg placeholder:text-forkshop-fg-muted shadow-sm"
    />
  )
}
