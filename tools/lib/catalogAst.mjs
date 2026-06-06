import fs from 'node:fs/promises'
import ts from 'typescript'

export async function extractCatalogParts(catalogPath) {
  const sourceText = await fs.readFile(catalogPath, 'utf8')
  const sourceFile = ts.createSourceFile(catalogPath, sourceText, ts.ScriptTarget.Latest, true)

  return extractCatalogPartsFromSource(sourceFile, sourceText)
}

export function extractCatalogPartsFromSource(sourceFile, sourceText) {
  const parts = []

  function visit(node) {
    if (
      ts.isVariableDeclaration(node) &&
      nodeName(node.name) === 'PART_CATALOG' &&
      node.initializer &&
      ts.isArrayLiteralExpression(node.initializer)
    ) {
      for (const element of node.initializer.elements) {
        if (!ts.isCallExpression(element) || !ts.isObjectLiteralExpression(element.arguments[0])) {
          continue
        }

        const part = { tags: [], stats: {} }
        for (const property of element.arguments[0].properties) {
          if (!ts.isPropertyAssignment(property)) continue
          const key = nodeName(property.name)
          if (key) part[key] = literalValue(property.initializer, sourceText)
        }
        parts.push(part)
      }
    }

    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  return parts
}

export function nodeName(name) {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) {
    return name.text
  }

  return undefined
}

export function literalValue(node, sourceText) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text
  if (ts.isNumericLiteral(node)) return Number(node.text)
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false
  if (ts.isArrayLiteralExpression(node)) {
    return node.elements.map((element) => literalValue(element, sourceText))
  }
  if (ts.isPropertyAccessExpression(node)) return node.name.text
  if (ts.isObjectLiteralExpression(node)) {
    const output = {}

    for (const property of node.properties) {
      if (!ts.isPropertyAssignment(property)) continue
      const key = nodeName(property.name)
      if (key) output[key] = literalValue(property.initializer, sourceText)
    }

    return output
  }

  return sourceText.slice(node.pos, node.end).trim()
}
