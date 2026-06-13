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

export function ReplayPreview() {
  const previewOptions = resolveReplayPreviewOptions(window.location.search)
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

  return (
    <main className={`replay-preview-page${previewOptions.proof ? ' replay-preview-proof' : ''}`}>
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
          proofMode={Boolean(previewOptions.proof)}
          teamIdentities={mockTeamIdentities}
          timeline={timeline}
        />
      </section>
    </main>
  )
}

function resolveReplayPreviewOptions(search: string): {
  cameraPreset: CameraPreset
  proof: 'ability' | 'machine' | 'stress64' | null
  time: number
} {
  const params = new URLSearchParams(search)
  const parsedTime = Number(params.get('time'))
  const proof = params.get('proof')

  return {
    cameraPreset: normalizeCameraPreset(params.get('camera')),
    proof: proof === 'ability' || proof === 'machine' || proof === 'stress64' ? proof : null,
    time: Number.isFinite(parsedTime) ? parsedTime : 0,
  }
}
