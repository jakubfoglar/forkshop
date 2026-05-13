export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="rounded-md border border-fogma-border bg-fogma-surface px-3 py-2 text-sm text-fogma-fg placeholder:text-fogma-fg-muted"
    />
  )
}
