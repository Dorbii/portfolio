import { readdirSync, readFileSync } from 'node:fs'
import { dirname, extname, join, normalize, relative, resolve } from 'node:path'
import ts from 'typescript'

const repoRoot = process.cwd()
const sourceRoots = ['apps', 'packages', 'tests', 'tools']
const sourceExtensions = ['.ts', '.tsx', '.mjs', '.js']
const ignoredDirectories = new Set([
  '.git',
  '.test-build',
  'dist',
  'exports',
  'node_modules',
  'smoke-artifacts',
])

const files = sourceRoots
  .flatMap((root) => walk(join(repoRoot, root)))
  .map((file) => normalize(file))
const fileSet = new Set(files)
const exportsByFile = new Map(files.map((file) => [file, new Map()]))
const localReexports = []
const starReexports = []
const namedImports = []
const namespaceUses = []

for (const file of files) {
  collectFileSymbols(file)
}

const usedExports = new Map()
for (const namedImport of namedImports) {
  markUsed(namedImport.file, namedImport.name)
}
for (const namespaceUse of namespaceUses) {
  markAllReachable(namespaceUse.file)
}

const report = createReport()
const wantsJson = process.argv.includes('--json')
const failOnCandidates = process.argv.includes('--fail-on-candidates')

if (wantsJson) {
  console.log(JSON.stringify(report, null, 2))
} else {
  printTextReport(report)
}

if (failOnCandidates && report.summary.reviewCandidates > 0) {
  process.exitCode = 1
}

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = join(directory, entry.name)

    if (entry.isDirectory()) {
      if (ignoredDirectories.has(entry.name)) {
        return []
      }

      return walk(file)
    }

    return sourceExtensions.includes(extname(entry.name)) ? [file] : []
  })
}

function collectFileSymbols(file) {
  const source = readFileSync(file, 'utf8')
  const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true)

  function visit(node) {
    if (ts.isImportDeclaration(node)) {
      collectImport(file, node)
    } else if (ts.isExportDeclaration(node)) {
      collectExportDeclaration(file, sourceFile, node)
    } else if (hasExportModifier(node)) {
      collectExportedDeclaration(file, sourceFile, node)
    } else if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      collectDynamicImport(file, node)
    }

    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
}

function collectImport(file, node) {
  const importedFile = resolveLocalSpecifier(file, textValue(node.moduleSpecifier))

  if (!importedFile) {
    return
  }

  const bindings = node.importClause?.namedBindings

  if (!bindings) {
    namespaceUses.push({ file: importedFile })
    return
  }

  if (ts.isNamespaceImport(bindings)) {
    namespaceUses.push({ file: importedFile })
    return
  }

  for (const element of bindings.elements) {
    namedImports.push({
      file: importedFile,
      name: (element.propertyName ?? element.name).text,
    })
  }
}

function collectDynamicImport(file, node) {
  const [argument] = node.arguments

  if (!argument || !ts.isStringLiteralLike(argument)) {
    return
  }

  const importedFile = resolveLocalSpecifier(file, argument.text)

  if (importedFile) {
    namespaceUses.push({ file: importedFile })
  }
}

function collectExportDeclaration(file, sourceFile, node) {
  const exportedFromFile = resolveLocalSpecifier(file, textValue(node.moduleSpecifier))

  if (!node.exportClause) {
    if (exportedFromFile) {
      starReexports.push({ file, targetFile: exportedFromFile })
    }

    return
  }

  if (!ts.isNamedExports(node.exportClause)) {
    return
  }

  for (const element of node.exportClause.elements) {
    const exportedName = element.name.text
    const localName = (element.propertyName ?? element.name).text

    recordExport(file, exportedName, sourceFile, element, 'reexport')

    if (exportedFromFile) {
      localReexports.push({
        exportedName,
        file,
        targetFile: exportedFromFile,
        targetName: localName,
      })
    }
  }
}

function collectExportedDeclaration(file, sourceFile, node) {
  if (ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node) || ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node) || ts.isEnumDeclaration(node)) {
    if (node.name) {
      recordExport(file, node.name.text, sourceFile, node, declarationKind(node))
    }

    return
  }

  if (ts.isVariableStatement(node)) {
    for (const declaration of node.declarationList.declarations) {
      collectBindingNames(declaration.name).forEach((name) => {
        recordExport(file, name, sourceFile, declaration, 'variable')
      })
    }
  }
}

function recordExport(file, name, sourceFile, node, kind) {
  const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1
  exportsByFile.get(file).set(name, {
    classification: classifyExport(file, name),
    file: relativePath(file),
    kind,
    line,
    name,
  })
}

function collectBindingNames(name) {
  if (ts.isIdentifier(name)) {
    return [name.text]
  }

  if (ts.isObjectBindingPattern(name) || ts.isArrayBindingPattern(name)) {
    return name.elements.flatMap((element) => collectBindingNames(element.name))
  }

  return []
}

function hasExportModifier(node) {
  return Boolean(node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword))
}

function declarationKind(node) {
  if (ts.isFunctionDeclaration(node)) return 'function'
  if (ts.isClassDeclaration(node)) return 'class'
  if (ts.isInterfaceDeclaration(node)) return 'interface'
  if (ts.isTypeAliasDeclaration(node)) return 'type'
  if (ts.isEnumDeclaration(node)) return 'enum'
  return 'declaration'
}

function textValue(node) {
  if (!node) {
    return undefined
  }

  return ts.isStringLiteralLike(node) ? node.text : undefined
}

function resolveLocalSpecifier(file, specifier) {
  if (!specifier?.startsWith('.')) {
    return undefined
  }

  const specifierWithoutJs = specifier.replace(/\.(js|mjs)$/, '')
  const base = resolve(dirname(file), specifierWithoutJs)

  for (const extension of sourceExtensions) {
    const candidate = normalize(`${base}${extension}`)

    if (fileSet.has(candidate)) {
      return candidate
    }
  }

  for (const extension of sourceExtensions) {
    const candidate = normalize(join(base, `index${extension}`))

    if (fileSet.has(candidate)) {
      return candidate
    }
  }

  return undefined
}

function markUsed(file, name, stack = new Set()) {
  const key = `${file}:${name}`

  if (stack.has(key)) {
    return
  }

  stack.add(key)

  if (exportsByFile.get(file)?.has(name)) {
    setUsed(file, name)
  }

  for (const reexport of localReexports) {
    if (reexport.file === file && reexport.exportedName === name) {
      markUsed(reexport.targetFile, reexport.targetName, stack)
    }
  }

  for (const reexport of starReexports) {
    if (reexport.file === file) {
      markUsed(reexport.targetFile, name, stack)
    }
  }
}

function markAllReachable(file, seen = new Set()) {
  if (seen.has(file)) {
    return
  }

  seen.add(file)

  for (const name of exportsByFile.get(file)?.keys() ?? []) {
    markUsed(file, name)
  }

  for (const reexport of localReexports) {
    if (reexport.file === file) {
      markUsed(reexport.targetFile, reexport.targetName)
    }
  }

  for (const reexport of starReexports) {
    if (reexport.file === file) {
      markAllReachable(reexport.targetFile, seen)
    }
  }
}

function setUsed(file, name) {
  if (!usedExports.has(file)) {
    usedExports.set(file, new Set())
  }

  usedExports.get(file).add(name)
}

function createReport() {
  const unused = []
  let exportedSymbols = 0
  let usedSymbols = 0

  for (const [file, exportMap] of exportsByFile.entries()) {
    for (const record of exportMap.values()) {
      exportedSymbols += 1

      if (usedExports.get(file)?.has(record.name)) {
        usedSymbols += 1
        continue
      }

      unused.push(record)
    }
  }

  unused.sort((left, right) =>
    left.classification.rank - right.classification.rank ||
    left.file.localeCompare(right.file) ||
    left.line - right.line ||
    left.name.localeCompare(right.name),
  )

  return {
    candidates: unused,
    summary: {
      exportedSymbols,
      files: files.length,
      keepByContract: unused.filter((record) => record.classification.action === 'keep').length,
      reviewCandidates: unused.filter((record) => record.classification.action === 'review').length,
      unusedExports: unused.length,
      usedSymbols,
    },
  }
}

function classifyExport(file, name) {
  const relativeFile = relativePath(file)

  if (relativeFile.startsWith('tests/')) {
    return keep('test-only keep', 40)
  }

  if (/^packages\/[^/]+\/src\/index\.ts$/.test(relativeFile)) {
    return keep('package barrel/public API keep', 10)
  }

  if (relativeFile === 'apps/worker/src/index.ts') {
    return keep('Worker entrypoint keep', 10)
  }

  if (relativeFile === 'packages/schemas/src/types.ts' || relativeFile === 'packages/schemas/src/relay.ts') {
    return keep('schema contract keep', 10)
  }

  if (relativeFile.endsWith('agentClient.ts') && ['AgentArenaClient', 'AgentArenaApiError'].includes(name)) {
    return keep('browser API surface keep', 20)
  }

  if (relativeFile.includes('/mock') || relativeFile.includes('mock')) {
    return keep('fixture/mock surface keep', 35)
  }

  if (relativeFile.startsWith('tools/')) {
    return review('tool export review', 60)
  }

  return review('internal export review', 50)
}

function keep(reason, rank) {
  return { action: 'keep', rank, reason }
}

function review(reason, rank) {
  return { action: 'review', rank, reason }
}

function relativePath(file) {
  return relative(repoRoot, file).replaceAll('\\', '/')
}

function printTextReport(report) {
  console.log('Dead export audit')
  console.log(`files=${report.summary.files}`)
  console.log(`exportedSymbols=${report.summary.exportedSymbols}`)
  console.log(`usedSymbols=${report.summary.usedSymbols}`)
  console.log(`unusedExports=${report.summary.unusedExports}`)
  console.log(`reviewCandidates=${report.summary.reviewCandidates}`)
  console.log(`keepByContract=${report.summary.keepByContract}`)

  const shown = report.candidates.slice(0, 80)

  for (const record of shown) {
    console.log(
      `${record.classification.action}\t${record.classification.reason}\t${record.file}:${record.line}\t${record.name}`,
    )
  }

  if (report.candidates.length > shown.length) {
    console.log(`... ${report.candidates.length - shown.length} more; rerun with --json for full output`)
  }
}
