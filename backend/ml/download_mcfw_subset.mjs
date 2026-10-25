// Download only the small structured-task and natural-image subset needed for
// the ReVoice gaze-mode prototype. The complete public archive is about 1 GB.
import https from 'node:https'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import zlib from 'node:zlib'

const ARCHIVE_URL = 'https://zenodo.org/api/records/18725479/files/dataset.zip/content'
const OUT = path.join(import.meta.dirname, 'data', 'raw')

function request(url, headers = {}) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'ReVoice-Gaze-Prototype/1.0', ...headers } }, response => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        response.resume()
        request(response.headers.location, headers).then(resolve, reject)
        return
      }
      const chunks = []
      response.on('data', chunk => chunks.push(chunk))
      response.on('end', () => {
        const body = Buffer.concat(chunks)
        if (response.statusCode < 200 || response.statusCode >= 300) {
          reject(new Error(`Dataset request failed (${response.statusCode}): ${body.toString().slice(0, 160)}`))
          return
        }
        resolve({ body, headers: response.headers })
      })
    }).on('error', reject)
  })
}

function parseCentralDirectory(tail, archiveStart) {
  const eocd = tail.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]))
  if (eocd < 0) throw new Error('Could not find the ZIP directory in the archive tail.')
  const entries = tail.readUInt16LE(eocd + 10)
  let offset = tail.readUInt32LE(eocd + 16) - archiveStart
  const files = new Map()
  for (let i = 0; i < entries; i++) {
    if (tail.readUInt32LE(offset) !== 0x02014b50) break
    const compressedSize = tail.readUInt32LE(offset + 20)
    const nameLength = tail.readUInt16LE(offset + 28)
    const extraLength = tail.readUInt16LE(offset + 30)
    const commentLength = tail.readUInt16LE(offset + 32)
    const localOffset = tail.readUInt32LE(offset + 42)
    const name = tail.subarray(offset + 46, offset + 46 + nameLength).toString('utf8')
    files.set(name, { name, compressedSize, localOffset })
    offset += 46 + nameLength + extraLength + commentLength
  }
  return files
}

async function extractZipMember(file, archiveSize) {
  const header = await request(ARCHIVE_URL, { Range: `bytes=${file.localOffset}-${file.localOffset + 99}` })
  const nameLength = header.body.readUInt16LE(26)
  const extraLength = header.body.readUInt16LE(28)
  const compressedStart = file.localOffset + 30 + nameLength + extraLength
  const compressedEnd = compressedStart + file.compressedSize - 1
  if (compressedEnd >= archiveSize) throw new Error(`Invalid ZIP range for ${file.name}`)
  const compressed = await request(ARCHIVE_URL, { Range: `bytes=${compressedStart}-${compressedEnd}` })
  return zlib.inflateRawSync(compressed.body)
}

const head = await request(ARCHIVE_URL, { Range: 'bytes=0-0' })
const archiveSize = Number(head.headers['content-range']?.split('/').at(-1))
if (!Number.isFinite(archiveSize)) throw new Error('The dataset host did not return an archive size.')
const tailSize = 1_200_000
const archiveStart = archiveSize - tailSize
const { body: tail } = await request(ARCHIVE_URL, { Range: `bytes=${archiveStart}-${archiveSize - 1}` })
const files = parseCentralDirectory(tail, archiveStart)
const wanted = []
for (let person = 1; person <= 15; person++) {
  const id = String(person).padStart(3, '0')
  wanted.push(`dataset/data/participant_${id}/password_experiment_block1.tsv`)
  wanted.push(`dataset/data/participant_${id}/image_20_1.tsv`)
}

await mkdir(OUT, { recursive: true })
let completed = 0
for (const name of wanted) {
  const file = files.get(name)
  if (!file) {
    console.warn(`Missing from this dataset version: ${name}`)
    continue
  }
  const bytes = await extractZipMember(file, archiveSize)
  const relative = name.replace(/^dataset\/data\//, '')
  const destination = path.join(OUT, relative)
  await mkdir(path.dirname(destination), { recursive: true })
  await writeFile(destination, bytes)
  completed++
  if (completed % 10 === 0 || completed === wanted.length) console.log(`Fetched ${completed}/${wanted.length} files`)
}
console.log(`Saved the MCFW-Gaze prototype subset to ${OUT}`)
