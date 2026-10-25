// Downloads only gaze-enriched CSVs from GazeTypeBD; excludes videos and images.
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import zlib from 'node:zlib'

const DOWNLOAD_URL = 'https://data.mendeley.com/public-api/zip/4m2pm5hp9j/download/1'
const OUT = path.join(import.meta.dirname, 'data', 'gazetypebd', 'raw')
const CONCURRENCY = 12
const EXTRA_SLACK = 4096

async function range(start, end) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const response = await fetch(DOWNLOAD_URL, { headers: { Range: `bytes=${start}-${end}` } })
    if (response.status === 206) return Buffer.from(await response.arrayBuffer())
    const message = `Dataset range request ${start}-${end} returned HTTP ${response.status}`
    if (response.status !== 429 && response.status < 500) throw new Error(message)
    await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)))
  }
  throw new Error(`Dataset range request failed after retries: ${start}-${end}`)
}

function zipEntries(tail, tailStart) {
  const eocd = tail.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]))
  if (eocd < 0) throw new Error('ZIP directory footer not found.')
  let count = tail.readUInt16LE(eocd + 10)
  let directoryOffset = tail.readUInt32LE(eocd + 16)
  if (count === 0xffff || directoryOffset === 0xffffffff) {
    const locator = eocd - 20
    if (tail.readUInt32LE(locator) !== 0x07064b50) throw new Error('ZIP64 locator not found.')
    const zip64Offset = Number(tail.readBigUInt64LE(locator + 8))
    const zip64 = zip64Offset - tailStart
    if (tail.readUInt32LE(zip64) !== 0x06064b50) throw new Error('ZIP64 directory footer not found.')
    count = Number(tail.readBigUInt64LE(zip64 + 32))
    directoryOffset = Number(tail.readBigUInt64LE(zip64 + 48))
  }
  let cursor = directoryOffset - tailStart
  if (cursor < 0 || cursor >= tail.length) throw new Error('ZIP central directory is outside the downloaded tail.')
  const entries = []
  for (let index = 0; index < count; index++) {
    if (tail.readUInt32LE(cursor) !== 0x02014b50) break
    const method = tail.readUInt16LE(cursor + 10)
    const compressedSize32 = tail.readUInt32LE(cursor + 20)
    const size32 = tail.readUInt32LE(cursor + 24)
    const nameLength = tail.readUInt16LE(cursor + 28)
    const extraLength = tail.readUInt16LE(cursor + 30)
    const commentLength = tail.readUInt16LE(cursor + 32)
    const localOffset32 = tail.readUInt32LE(cursor + 42)
    const name = tail.subarray(cursor + 46, cursor + 46 + nameLength).toString('utf8')
    const extraStart = cursor + 46 + nameLength
    let compressedSize = compressedSize32
    let size = size32
    let localOffset = localOffset32
    if (compressedSize32 === 0xffffffff || size32 === 0xffffffff || localOffset32 === 0xffffffff) {
      let extraCursor = extraStart
      const extraEnd = extraStart + extraLength
      while (extraCursor + 4 <= extraEnd) {
        const id = tail.readUInt16LE(extraCursor)
        const length = tail.readUInt16LE(extraCursor + 2)
        const valueStart = extraCursor + 4
        if (id === 0x0001) {
          let valueCursor = valueStart
          if (size32 === 0xffffffff) { size = Number(tail.readBigUInt64LE(valueCursor)); valueCursor += 8 }
          if (compressedSize32 === 0xffffffff) { compressedSize = Number(tail.readBigUInt64LE(valueCursor)); valueCursor += 8 }
          if (localOffset32 === 0xffffffff) localOffset = Number(tail.readBigUInt64LE(valueCursor))
          break
        }
        extraCursor += 4 + length
      }
    }
    if (/\/csv_data\/P\d{3}\/(?:meta_data\.json|calibration\/calibration\.csv|word\d+_[^/]+\/gaze_enriched\.csv)$/.test(name)) {
      entries.push({ name, method, compressedSize, size, localOffset })
    }
    cursor += 46 + nameLength + extraLength + commentLength
  }
  return entries
}

async function extract(entry) {
  const slack = 30 + Buffer.byteLength(entry.name) + EXTRA_SLACK + entry.compressedSize
  let local = await range(entry.localOffset, entry.localOffset + slack - 1)
  if (local.readUInt32LE(0) !== 0x04034b50) throw new Error(`Invalid local ZIP header for ${entry.name}`)
  const nameLength = local.readUInt16LE(26)
  const extraLength = local.readUInt16LE(28)
  const dataStart = 30 + nameLength + extraLength
  if (dataStart + entry.compressedSize > local.length) {
    local = await range(entry.localOffset, entry.localOffset + dataStart + entry.compressedSize - 1)
  }
  const compressed = local.subarray(dataStart, dataStart + entry.compressedSize)
  const result = entry.method === 8 ? zlib.inflateRawSync(compressed) : entry.method === 0 ? compressed : null
  if (!result) throw new Error(`Unsupported ZIP compression method ${entry.method} for ${entry.name}`)
  if (result.length !== entry.size) throw new Error(`Unexpected size for ${entry.name}: ${result.length}/${entry.size}`)
  const csvDataIndex = entry.name.indexOf('/csv_data/')
  if (csvDataIndex < 0) throw new Error(`Unexpected dataset path: ${entry.name}`)
  const relative = entry.name.slice(csvDataIndex + '/csv_data/'.length)
  const destination = path.join(OUT, ...relative.split('/'))
  await mkdir(path.dirname(destination), { recursive: true })
  await writeFile(destination, result)
}

const response = await fetch(DOWNLOAD_URL, { headers: { Range: 'bytes=0-0' } })
const total = Number(response.headers.get('content-range')?.split('/').at(-1))
if (!Number.isFinite(total)) throw new Error('Dataset server did not return archive size.')
const tailSize = 4_000_000
const tailStart = total - tailSize
const tail = await range(tailStart, total - 1)
const entries = zipEntries(tail, tailStart)
if (!entries.length) throw new Error('No GazeTypeBD gaze CSV entries found in the archive.')
await mkdir(OUT, { recursive: true })
let completed = 0
let next = 0
let failure = null
async function worker() {
  while (!failure) {
    const index = next++
    if (index >= entries.length) return
    try {
      await extract(entries[index])
      completed++
      if (completed % 25 === 0 || completed === entries.length) console.log(`Downloaded ${completed}/${entries.length} gaze files`)
    } catch (error) {
      failure = error
      return
    }
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker))
if (failure) throw failure
console.log(`Saved ${completed} GazeTypeBD gaze files under ${OUT}`)


