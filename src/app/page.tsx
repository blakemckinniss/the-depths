import { DungeonGame } from "@/components/core/dungeon-game"
import { ErrorBoundary } from "@/components/core/error-boundary"

export default function Home() {
  return (
    <ErrorBoundary>
      <DungeonGame />
    </ErrorBoundary>
  )
}
