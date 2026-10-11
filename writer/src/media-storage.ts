import { HttpError } from "./model";

// D1 limits each BLOB and row to 2 MB. Keep original image bytes in smaller rows.
export const MEDIA_CHUNK_SIZE = 1024 * 1024;

export async function readMedia(db: D1Database, id: string): Promise<Uint8Array> {
  const object = await db.prepare("SELECT data, size FROM media WHERE id = ?").bind(id).first<{ data: number[]; size: number }>();
  if (!object) throw new HttpError(422, "첨부 이미지가 없습니다. 다시 첨부해 주세요.");
  const first = Uint8Array.from(object.data);
  if (first.length === object.size) return first;
  const chunks = await db.prepare("SELECT position, data FROM media_chunks WHERE media_id = ? ORDER BY position").bind(id).all<{
    position: number;
    data: number[];
  }>();
  const result = new Uint8Array(object.size);
  result.set(first);
  let offset = first.length;
  for (const [index, chunk] of chunks.results.entries()) {
    if (chunk.position !== index + 1 || offset + chunk.data.length > result.length)
      throw new HttpError(422, "첨부 이미지가 손상되었습니다. 다시 첨부해 주세요.");
    result.set(chunk.data, offset);
    offset += chunk.data.length;
  }
  if (offset !== result.length) throw new HttpError(422, "첨부 이미지가 손상되었습니다. 다시 첨부해 주세요.");
  return result;
}
