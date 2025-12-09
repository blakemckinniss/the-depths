import { DungeonGame } from "@/components/dungeon-game"
import { ErrorBoundary } from "@/components/error-boundary"

export default function Home() {
  return (
    <ErrorBoundary>
      <DungeonGame />
    </ErrorBoundary>
  )
}
