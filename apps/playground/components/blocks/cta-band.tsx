export function CTABand({ text = "Ready to ship?" }: { text?: string }) {
  return (
    <section
      data-fogma-block="cta-band"
      className="border-t border-fogma-border px-8 py-12 text-center"
    >
      <p className="text-xl">{text}</p>
    </section>
  )
}
