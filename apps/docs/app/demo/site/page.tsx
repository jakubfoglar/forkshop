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
    <div className="demo-scope">
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
    </div>
  )
}
