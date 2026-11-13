// Pembaca XLSX minimal tanpa dependensi (Node stdlib). Membaca sheet pertama
// dan mengembalikan array of array of string. Hanya dipakai untuk impor DPT.
import zlib from "node:zlib";

function readZip(buf) {
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (buf[i] === 0x50 && buf[i + 1] === 0x4b && buf[i + 2] === 0x05 && buf[i + 3] === 0x06) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error("EOCD tidak ditemukan");
  const cdOffset = buf.readUInt32LE(eocd + 16);
  const cdSize = buf.readUInt32LE(eocd + 12);
  const entries = new Map();
  let pos = cdOffset;
  const end = cdOffset + cdSize;
  while (pos < end && buf.readUInt32LE(pos) === 0x02014b50) {
    const method = buf.readUInt16LE(pos + 10);
    const csize = buf.readUInt32LE(pos + 20);
    const nameLen = buf.readUInt16LE(pos + 28);
    const extraLen = buf.readUInt16LE(pos + 30);
    const commentLen = buf.readUInt16LE(pos + 32);
    const localOffset = buf.readUInt32LE(pos + 42);
    const name = buf.toString("utf8", pos + 46, pos + 46 + nameLen);
    const localNameLen = buf.readUInt16LE(localOffset + 26);
    const localExtraLen = buf.readUInt16LE(localOffset + 28);
    const dataOffset = localOffset + 30 + localNameLen + localExtraLen;
    const raw = buf.subarray(dataOffset, dataOffset + csize);
    let data;
    if (method === 0) data = Buffer.from(raw);
    else if (method === 8) data = zlib.inflateRawSync(raw);
    else throw new Error("metode kompresi tidak didukung: " + method);
    entries.set(name, data);
    pos += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

function colIndex(letters) {
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

function decodeXml(s) {
  return s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'");
}

export function parseXlsx(buf) {
  const zip = readZip(buf);
  const wbXml = (zip.get("xl/workbook.xml") || Buffer.alloc(0)).toString("utf8");
  const relsXml = (zip.get("xl/_rels/workbook.xml.rels") || Buffer.alloc(0)).toString("utf8");
  const rels = new Map();
  for (const m of relsXml.matchAll(/<Relationship[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"[^>]*\/>/g)) rels.set(m[1], m[2]);
  const sheets = [];
  for (const m of wbXml.matchAll(/<sheet[^>]*name="([^"]*)"[^>]*r:id="([^"]+)"[^>]*\/>/g)) sheets.push({ name: m[1], rid: m[2] });
  if (!sheets.length) for (const m of wbXml.matchAll(/<sheet[^>]*r:id="([^"]+)"[^>]*name="([^"]*)"[^>]*\/>/g)) sheets.push({ name: m[2], rid: m[1] });
  const first = sheets[0];
  if (!first) throw new Error("sheet tidak ditemukan");
  const target = rels.get(first.rid) || "worksheets/sheet1.xml";
  const path = target.startsWith("/") ? target.slice(1) : "xl/" + target.replace(/^\.\//, "");
  const sheetXml = (zip.get(path) || zip.get("xl/worksheets/sheet1.xml") || Buffer.alloc(0)).toString("utf8");
  if (!sheetXml) throw new Error("sheet XML tidak ditemukan");

  const ssXml = (zip.get("xl/sharedStrings.xml") || Buffer.alloc(0)).toString("utf8");
  const strings = [];
  for (const si of ssXml.matchAll(/<si>([\s\S]*?)<\/si>/g)) {
    const texts = [...si[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((m) => decodeXml(m[1]));
    strings.push(texts.join(""));
  }

  const rows = [];
  for (const rowM of sheetXml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
    const cells = [];
    let colIdx = 0;
    for (const cM of rowM[1].matchAll(/<c\s+([^>]*)>([\s\S]*?)<\/c>/g)) {
      const attrs = cM[1];
      const rAttr = attrs.match(/\br="([A-Z]+)(\d+)"/);
      if (rAttr) {
        const col = colIndex(rAttr[1]);
        while (cells.length < col) cells.push("");
        colIdx = col;
      }
      const t = (attrs.match(/\bt="([^"]*)"/) || [])[1] || "n";
      const vMatch = cM[2].match(/<v>([\s\S]*?)<\/v>/);
      const isMatch = cM[2].match(/<is>([\s\S]*?)<\/is>/);
      let value = "";
      if (t === "s") {
        const idx = vMatch ? Number(vMatch[1]) : NaN;
        value = Number.isFinite(idx) && idx >= 0 && idx < strings.length ? strings[idx] : "";
      } else if (t === "inlineStr") {
        const tM = isMatch ? isMatch[1].match(/<t[^>]*>([\s\S]*?)<\/t>/) : null;
        value = tM ? decodeXml(tM[1]) : "";
      } else if (t === "str") {
        value = vMatch ? decodeXml(vMatch[1]) : "";
      } else if (vMatch) {
        value = vMatch[1];
      }
      cells[colIdx] = value;
      colIdx++;
    }
    rows.push(cells);
  }
  return rows;
}
