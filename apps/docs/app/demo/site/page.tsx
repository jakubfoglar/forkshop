import {
  SiteHeader,
  Hero,
  StatsBelt,
  AboutCallout,
  EventSchedule,
  SurferGrid,
  GallerySection,
  SponsorStrip,
  CtaBuyPass,
  SiteFooter,
} from "../_components/blocks"

export default function WaveclashLandingPage() {
  return (
    <main>
      <SiteHeader />
      <Hero />
      <StatsBelt />
      <AboutCallout />
      <EventSchedule />
      <SurferGrid />
      <GallerySection />
      <SponsorStrip />
      <CtaBuyPass />
      <SiteFooter />
    </main>
  )
}
