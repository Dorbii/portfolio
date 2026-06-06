import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'
import { gzipSync } from 'node:zlib'

const distAssetsDir = resolve('dist/assets')
const chunkGzipBudgetBytes = 380 * 1024
const aggregateGzipBudgetBytes = 420 * 1024

if (!existsSync(distAssetsDir)) {
  throw new Error('dist/assets is missing. Run npm.cmd run build before checking renderer budgets.')
}

const chunkCandidates = readdirSync(distAssetsDir)
  .filter((fileName) => fileName.endsWith('.js'))
  .map((fileName) => {
    const path = join(distAssetsDir, fileName)
    const source = readFileSync(path)

    return {
      fileName,
      gzipBytes: gzipSync(source).length,
      rawBytes: statSync(path).size,
      source,
    }
  })
  .filter((chunk) =>
    chunk.fileName.startsWith('ArenaPreviewScene-')
    || chunk.fileName.startsWith('ReplayViewer-')
    || chunk.fileName.startsWith('babylonArena-')
    || chunk.fileName.startsWith('babylonPartRenderer-')
    || chunk.fileName.startsWith('babylonRendererKit-')
    || chunk.source.includes('replay-camera')
    || chunk.source.includes('bot_part'),
  )
  .sort((a, b) => b.gzipBytes - a.gzipBytes)

const rendererChunk = chunkCandidates[0]
const totalGzipBytes = chunkCandidates.reduce((total, chunk) => total + chunk.gzipBytes, 0)
const totalRawBytes = chunkCandidates.reduce((total, chunk) => total + chunk.rawBytes, 0)

if (!rendererChunk) {
  throw new Error('No Babylon renderer chunk found in dist/assets.')
}

const result = {
  aggregateGzipBudgetBytes,
  budgetGzipBytes: chunkGzipBudgetBytes,
  chunkCount: chunkCandidates.length,
  fileName: basename(rendererChunk.fileName),
  gzipBytes: rendererChunk.gzipBytes,
  rawBytes: rendererChunk.rawBytes,
  totalGzipBytes,
  totalRawBytes,
  withinAggregateBudget: totalGzipBytes <= aggregateGzipBudgetBytes,
  withinBudget:
    rendererChunk.gzipBytes <= chunkGzipBudgetBytes
    && totalGzipBytes <= aggregateGzipBudgetBytes,
}

if (!result.withinBudget) {
  throw new Error(`Babylon renderer payload over gzip budget: ${JSON.stringify(result)}`)
}

console.log(JSON.stringify(result, null, 2))
