export type DurableObjectId = unknown

export type DurableObjectStorage = {
  get<T>(key: string): Promise<T | undefined>
  put<T>(key: string, value: T): Promise<void>
}

export type DurableObjectState = {
  storage: DurableObjectStorage
}

export type DurableObjectStub = {
  fetch(request: Request): Promise<Response>
}

export type DurableObjectNamespace = {
  idFromName(name: string): DurableObjectId
  get(id: DurableObjectId): DurableObjectStub
}

export type WorkerEnv = {
  AGENT_ARENA_SESSION?: DurableObjectNamespace
  AGENT_ARENA_ALLOWED_ORIGINS?: string
  GPT_AUTO_POLL_ATTEMPTS?: string
  GPT_AUTO_POLL_DELAY_MS?: string
}
