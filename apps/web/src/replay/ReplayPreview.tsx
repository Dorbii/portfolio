import {
  arenaConfig as previewArenaConfig,
  abilityProofReplay,
  mockBotBlueprints,
  mockReplay,
} from '../mockSession'
import { ReplayViewer } from './ReplayViewer'
import type { CameraPreset } from './replayMapping'
import { normalizeCameraPreset } from './replayCameraPresets'

export function ReplayPreview() {
  const previewOptions = resolveReplayPreviewOptions(window.location.search)
  const timeline = previewOptions.proofMode ? abilityProofReplay : mockReplay

  return (
    <main className={`replay-preview-page${previewOptions.proofMode ? ' replay-preview-proof' : ''}`}>
      <header className="replay-preview-header">
        <div>
          <span className="eyebrow">Art preview</span>
          <h1>Agent Arena</h1>
        </div>
        <strong>{previewArenaConfig.name}</strong>
      </header>
      <section className="replay-preview-frame">
        <ReplayViewer
          arena={previewArenaConfig}
          botBlueprints={mockBotBlueprints}
          initialCameraPreset={previewOptions.cameraPreset}
          initialTime={previewOptions.time}
          proofMode={previewOptions.proofMode}
          timeline={timeline}
        />
      </section>
    </main>
  )
}

function resolveReplayPreviewOptions(search: string): {
  cameraPreset: CameraPreset
  proofMode: boolean
  time: number
} {
  const params = new URLSearchParams(search)
  const parsedTime = Number(params.get('time'))

  return {
    cameraPreset: normalizeCameraPreset(params.get('camera')),
    proofMode: params.get('proof') === 'ability',
    time: Number.isFinite(parsedTime) ? parsedTime : 0,
  }
}
