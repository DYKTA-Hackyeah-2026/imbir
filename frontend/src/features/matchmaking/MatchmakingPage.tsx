import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { FlaskConical, HeartHandshake } from "lucide-react"
import { MatchmakingFlow } from "./MatchmakingFlow"

export function MatchmakingPage() {
  return (
    <div className="min-h-screen bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Przejdź do treści
      </a>

      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-4">
          <HeartHandshake aria-hidden="true" className="size-7 text-primary" />
          <div>
            <p className="text-base font-semibold">
              Małopolski Hub Innowacji Społecznych
            </p>
            <p className="text-sm text-muted-foreground">
              Asystent dopasowania rozwiązań do potrzeb
            </p>
          </div>
        </div>
      </header>

      <main id="main-content" tabIndex={-1} className="mx-auto max-w-5xl px-4 py-8">
        <Alert variant="demo">
          <FlaskConical aria-hidden="true" />
          <AlertTitle>Tryb demonstracyjny</AlertTitle>
          <AlertDescription>
            Wersja pokazowa korzysta z przykładowej bazy innowacji i symuluje działanie
            AI. Dopasowania i uzasadnienia nie są oficjalnymi rekomendacjami — zawsze
            weryfikuj informacje w materiałach źródłowych.
          </AlertDescription>
        </Alert>

        <div className="mt-8">
          <MatchmakingFlow />
        </div>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-5xl space-y-2 px-4 py-6 text-sm text-muted-foreground">
          <p>
            Serwis zaprojektowany z myślą o dostępności: duże elementy do klikania,
            czytelne teksty i pełna obsługa klawiaturą.
          </p>
          <p>
            W razie problemów z korzystaniem poproś o pomoc osobę zaufaną lub skontaktuj
            się z lokalnym punktem wsparcia.
          </p>
        </div>
      </footer>
    </div>
  )
}
