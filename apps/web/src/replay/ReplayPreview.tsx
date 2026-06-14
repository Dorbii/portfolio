import { useEffect } from 'react'
import {
  arenaConfig as previewArenaConfig,
  abilityProofReplay,
  machineProofMachineDesigns,
  machineProofReplay,
  mockBotBlueprints,
  mockReplay,
  mockTeamIdentities,
  stress64BotBlueprints,
  stress64MachineDesigns,
  stress64Replay,
} from '../mockSession'
import { ReplayViewer } from './ReplayViewer'
import type { CameraPreset } from './replayMapping'
import { normalizeCameraPreset } from './camera/presets'

type ReplayPreviewProof = 'ability' | 'machine' | 'stress64'

export function ReplayPreview({
  defaultProof = null,
}: {
  defaultProof?: ReplayPreviewProof | null
} = {}) {
  const previewOptions = resolveReplayPreviewOptions(window.location.search, defaultProof)
  const proofMode = Boolean(previewOptions.proof)
  const timeline = previewOptions.proof === 'machine'
    ? machineProofReplay
    : previewOptions.proof === 'ability'
      ? abilityProofReplay
      : previewOptions.proof === 'stress64'
        ? stress64Replay
        : mockReplay
  const machineDesigns = previewOptions.proof === 'machine'
    ? machineProofMachineDesigns
    : previewOptions.proof === 'stress64'
      ? stress64MachineDesigns
      : undefined
  const botBlueprints = previewOptions.proof === 'stress64'
    ? stress64BotBlueprints
    : mockBotBlueprints

  useEffect(() => {
    if (!proofMode) {
      return undefined
    }

    const originalBodyOverflow = document.body.style.overflow
    const originalHtmlOverflow = document.documentElement.style.overflow

    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = originalBodyOverflow
      document.documentElement.style.overflow = originalHtmlOverflow
    }
  }, [proofMode])

  return (
    <main className={`replay-preview-page${proofMode ? ' replay-preview-proof' : ''}`}>
      <header className="replay-preview-header">
        <div>
          <span className="eyebrow">Art preview</span>
          <h1>Agent Arena</h1>
        </div>
        <strong>{previewArenaConfig.name}</strong>
      </header>
      <section className="replay-preview-frame">
        <ReplayViewer
          autoPlay={Boolean(previewOptions.proof)}
          arena={previewArenaConfig}
          botBlueprints={botBlueprints}
          initialCameraPreset={previewOptions.cameraPreset}
          initialTime={previewOptions.time}
          machineDesigns={machineDesigns}
          proofMode={proofMode}
          teamIdentities={mockTeamIdentities}
          timeline={timeline}
        />
      </section>
    </main>
  )
}

function resolveReplayPreviewOptions(
  search: string,
  defaultProof: ReplayPreviewProof | null = null,
): {
  cameraPreset: CameraPreset
  proof: ReplayPreviewProof | null
  time: number
} {
  const params = new URLSearchParams(search)
  const parsedTime = Number(params.get('time'))
  const proof = params.get('proof')
  const normalizedProof = proof === 'ability' || proof === 'machine' || proof === 'stress64'
    ? proof
    : defaultProof

  return {
    cameraPreset: normalizeCameraPreset(params.get('camera')),
    proof: normalizedProof,
    time: Number.isFinite(parsedTime) ? parsedTime : 0,
  }
}
