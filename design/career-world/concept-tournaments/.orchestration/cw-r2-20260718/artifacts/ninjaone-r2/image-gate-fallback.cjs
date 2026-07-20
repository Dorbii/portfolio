const fs = require("node:fs/promises")
const path = require("node:path")
const sharp = require("sharp")

const CANVAS = { width: 1536, height: 1024 }
const CELL = { width: 480, height: 320, caption: 44, columns: 2 }

async function pngFiles(folder) {
  return (await fs.readdir(folder))
    .filter((name) => name.toLowerCase().endsWith(".png"))
    .sort()
}

async function normalize(folder) {
  for (const name of await pngFiles(folder)) {
    const input = path.join(folder, name)
    const temp = `${input}.normalize-tmp.png`
    await sharp(input)
      .resize({
        ...CANVAS,
        fit: "contain",
        withoutEnlargement: true,
        kernel: sharp.kernel.lanczos3,
        background: { r: 10, g: 10, b: 10 },
      })
      .grayscale()
      .toColourspace("srgb")
      .png({ compressionLevel: 9 })
      .toFile(temp)
    await fs.rename(temp, input)
    process.stdout.write(`${input} ${CANVAS.width}x${CANVAS.height}\n`)
  }
}

function escapeXml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
}

async function contactSheet(folder, outputDir) {
  const files = await pngFiles(folder)
  if (files.length === 0) throw new Error(`no PNG files in ${folder}`)

  const rows = Math.ceil(files.length / CELL.columns)
  const sheetWidth = CELL.width * CELL.columns
  const sheetHeight = (CELL.height + CELL.caption) * rows
  const composites = []
  const captions = []

  for (let index = 0; index < files.length; index += 1) {
    const name = files[index]
    const imagePath = path.join(folder, name)
    const resized = await sharp(imagePath)
      .resize({ width: CELL.width, height: CELL.height, fit: "inside" })
      .png()
      .toBuffer({ resolveWithObject: true })
    const cellX = (index % CELL.columns) * CELL.width
    const cellY = Math.floor(index / CELL.columns) * (CELL.height + CELL.caption)
    composites.push({
      input: resized.data,
      left: cellX + Math.floor((CELL.width - resized.info.width) / 2),
      top: cellY + Math.floor((CELL.height - resized.info.height) / 2),
    })
    captions.push(
      `<text x="${cellX + 8}" y="${cellY + CELL.height + 25}" fill="white" font-family="Arial, sans-serif" font-size="13">${escapeXml(`${String(index + 1).padStart(2, "0")} ${path.parse(name).name}`)}</text>`,
    )
  }

  const captionSvg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${sheetWidth}" height="${sheetHeight}">${captions.join("")}</svg>`,
  )
  await fs.mkdir(outputDir, { recursive: true })
  const output = path.join(outputDir, `${path.basename(folder)}-contact-sheet.png`)
  await sharp({
    create: {
      width: sheetWidth,
      height: sheetHeight,
      channels: 3,
      background: "#11151a",
    },
  })
    .composite([...composites, { input: captionSvg, left: 0, top: 0 }])
    .png({ compressionLevel: 9 })
    .toFile(output)
  process.stdout.write(`${output}\n`)
}

async function verify(folder, promptSetPath) {
  const promptSet = JSON.parse(await fs.readFile(promptSetPath, "utf8"))
  const expected = promptSet.prompts.map(({ output }) => output).sort()
  const actual = await pngFiles(folder)
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`filename mismatch\nexpected=${JSON.stringify(expected)}\nactual=${JSON.stringify(actual)}`)
  }
  for (const name of actual) {
    const imagePath = path.join(folder, name)
    const metadata = await sharp(imagePath).metadata()
    const { data, info } = await sharp(imagePath).raw().toBuffer({ resolveWithObject: true })
    if (metadata.width !== CANVAS.width || metadata.height !== CANVAS.height || info.channels !== 3) {
      throw new Error(`${name}: expected 1536x1024 RGB, got ${metadata.width}x${metadata.height} channels=${info.channels}`)
    }
    for (let offset = 0; offset < data.length; offset += 3) {
      if (data[offset] !== data[offset + 1] || data[offset] !== data[offset + 2]) {
        throw new Error(`${name}: non-grayscale pixel at byte offset ${offset}`)
      }
    }
    process.stdout.write(`${name} 1536x1024 RGB exact-grayscale\n`)
  }
  process.stdout.write(`verified ${actual.length}/${expected.length} expected PNGs\n`)
}

async function main() {
  const [command, ...args] = process.argv.slice(2)
  if (command === "normalize" && args.length === 1) return normalize(args[0])
  if (command === "contact" && args.length === 2) return contactSheet(args[0], args[1])
  if (command === "verify" && args.length === 2) return verify(args[0], args[1])
  throw new Error("usage: image-gate-fallback.cjs normalize <folder> | contact <folder> <output-dir> | verify <folder> <prompt-set>")
}

main().catch((error) => {
  console.error(error.stack || error)
  process.exitCode = 1
})
