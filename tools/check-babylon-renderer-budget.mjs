import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'
import { gzipSync } from 'node:zlib'

const distAssetsDir = resolve('dist/assets')
const chunkGzipBudgetBytes = 560 * 1024
const aggregateGzipBudgetBytes = 720 * 1024
const rendererChunkFilePrefixes = [
  'ArenaPreviewScene-',
  'BabylonPartCatalogScene-',
  'BabylonReplayScene-',
  'PartCatalogPage-',
  'ReplayViewer-',
  'rendererKit-',
]
const rendererChunkSourceMarkers = [
  'arena-preview-stage',
  'bot_part',
  'data-renderer-budget-state',
  'part-catalog-stage',
  'replay-camera',
]

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
    rendererChunkFilePrefixes.some((prefix) => chunk.fileName.startsWith(prefix))
    || rendererChunkSourceMarkers.some((marker) => chunk.source.includes(marker)),
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
