import { GlassSurface } from "./ui/Surfaces";
import { MotionContent } from "./MotionContent";
export function AppHeader({ children }: { children: React.ReactNode }) {
  return <GlassSurface as="header" className="hero-bar">{children}</GlassSurface>;
}
export function AppPage({ header, children, className = "", motion = true }: { header: React.ReactNode; children: React.ReactNode; className?: string; motion?: boolean }) {
  return <main id="main-content" tabIndex={-1} className={`container-page ${className}`}>
    <AppHeader>{header}</AppHeader>
    {motion ? <MotionContent>{children}</MotionContent> : children}
  </main>;
}
