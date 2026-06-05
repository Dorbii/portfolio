import { useEffect, useRef, useState } from 'react'
import type {
  BotBlueprint,
  TeamRole,
} from '../../../../packages/schemas/src/index.js'
import {
  animateAssembly,
  attachAssemblyBot,
  type AssemblyResources,
} from './botAssemblyAnimation'
import {
  createAssemblyResources,
  isAssemblyRendererSupported,
} from './botAssemblyRenderer'

type AssemblyStatus = 'booting' | 'ready' | 'unavailable' | 'context_lost'

type BotAssemblySceneProps = {
  blueprint: BotBlueprint
  role: TeamRole
  submitted: boolean
}

export function BotAssemblyScene({
  blueprint,
  role,
  submitted,
}: BotAssemblySceneProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const resourcesRef = useRef<AssemblyResources | null>(null)
  const submittedRef = useRef(submitted)
  const [status, setStatus] = useState<AssemblyStatus>('booting')
  const [message, setMessage] = useState('')

  useEffect(() => {
    submittedRef.current = submitted
  }, [submitted])

  useEffect(() => {
    const canvas = canvasRef.current

    if (!canvas) {
      return undefined
    }

    let resources: AssemblyResources | null = null
    let disposed = false

    try {
      if (!isAssemblyRendererSupported()) {
        setStatus('unavailable')
        setMessage('WebGL is not available in this browser context.')

        return undefined
      }

      resources = createAssemblyResources(canvas, role, submittedRef.current)
      const activeResources = resources

      resourcesRef.current = resources
      setStatus('ready')

      activeResources.engine.runRenderLoop(() => {
        if (disposed) {
          return
        }

        animateAssembly(activeResources, submittedRef.current)
        activeResources.scene.render()
      })

      const resize = () => activeResources.engine.resize()
      const handleContextLost = (event: Event) => {
        event.preventDefault()
        activeResources.engine.stopRenderLoop()
        setStatus('context_lost')
        setMessage('The assembly canvas lost its WebGL context.')
      }
      const handleContextRestored = () => {
        if (disposed) {
          return
        }

        setStatus('ready')
        activeResources.engine.resize()
        activeResources.engine.runRenderLoop(() => {
          if (!disposed) {
            animateAssembly(activeResources, submittedRef.current)
            activeResources.scene.render()
          }
        })
      }

      window.addEventListener('resize', resize)
      canvas.addEventListener('webglcontextlost', handleContextLost)
      canvas.addEventListener('webglcontextrestored', handleContextRestored)

      return () => {
        disposed = true
        window.removeEventListener('resize', resize)
        canvas.removeEventListener('webglcontextlost', handleContextLost)
        canvas.removeEventListener('webglcontextrestored', handleContextRestored)
        resourcesRef.current = null
        activeResources.scene.dispose()
        activeResources.engine.dispose()
      }
    } catch (error) {
      setStatus('unavailable')
      setMessage(error instanceof Error ? error.message : 'Assembly renderer failed to start.')
      resourcesRef.current = null
      resources?.scene.dispose()
      resources?.engine.dispose()

      return undefined
    }
  }, [role])

  useEffect(() => {
    const resources = resourcesRef.current

    if (!resources) {
      return
    }

    attachAssemblyBot(resources, blueprint, role)
  }, [blueprint, role])

  return (
    <div className="bot-assembly-stage" data-renderer-state={status}>
      <canvas
        ref={canvasRef}
        aria-label={`${role} bot assembly bay`}
        aria-hidden={status === 'unavailable'}
        hidden={status === 'unavailable'}
      />
      {status === 'booting' ? (
        <div className="assembly-renderer-status" role="status">
          Renderer starting
        </div>
      ) : null}
      {status !== 'ready' && status !== 'booting' ? (
        <div className="replay-error" role="status">
          <strong>Assembly renderer unavailable</strong>
          <span>{message}</span>
        </div>
      ) : null}
    </div>
  )
}
