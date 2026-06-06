import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'
import { gzipSync } from 'node:zlib'

const distAssetsDir = resolve('dist/assets')
const chunkGzipBudgetBytes = 380 * 1024

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
    chunk.fileName.startsWith('babylonPartRenderer-')
    || chunk.source.includes('replay-camera')
    || chunk.source.includes('bot_part'),
  )
  .sort((a, b) => b.gzipBytes - a.gzipBytes)

const rendererChunk = chunkCandidates[0]

if (!rendererChunk) {
  throw new Error('No Babylon renderer chunk found in dist/assets.')
}

const result = {
  budgetGzipBytes: chunkGzipBudgetBytes,
  fileName: basename(rendererChunk.fileName),
  gzipBytes: rendererChunk.gzipBytes,
  rawBytes: rendererChunk.rawBytes,
  withinBudget: rendererChunk.gzipBytes <= chunkGzipBudgetBytes,
}

if (!result.withinBudget) {
  throw new Error(`Babylon renderer chunk over gzip budget: ${JSON.stringify(result)}`)
}

console.log(JSON.stringify(result, null, 2))
