import { Footer } from './Footer'

type LayoutProps = {
  children: React.ReactNode
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <div className="flex-1 overflow-auto flex flex-col">
        {children}
      </div>
      <div className="shrink-0">
        <Footer />
      </div>
    </div>
  )
}

