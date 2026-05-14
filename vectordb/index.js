/**
 * vectordb/index.js — 검색 API (MCP 서버에서 import)
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { search as tfidfSearch } from "./tfidf.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INDEX_PATH = path.join(__dirname, "data", "index.json");

let _index = null;

/** 인덱스 로드 (lazy) */
function loadIndex() {
  if (_index) return _index;
  try {
    const raw = fs.readFileSync(INDEX_PATH, "utf-8");
    _index = JSON.parse(raw);
    return _index;
  } catch (e) {
    console.error(`[vectordb] 인덱스 로드 실패: ${e.message}`);
    return null;
  }
}

/**
 * AE API 문서 검색
 * @param {string} query - 검색어 (자연어 또는 API 키워드)
 * @param {number} topK - 반환 개수 (기본 5)
 * @returns {Array<{source, heading, content, score}>}
 */
export function searchDocs(query, topK = 5) {
  const index = loadIndex();
  if (!index) return [];
  return tfidfSearch(query, index, topK);
}

/** 인덱스 존재 여부 */
export function isIndexBuilt() {
  return fs.existsSync(INDEX_PATH);
}

/** 인덱스 통계 */
export function getStats() {
  const index = loadIndex();
  if (!index) return null;
  return {
    chunks: index.chunks.length,
    vocabulary: Object.keys(index.idf).length,
    buildTime: index.buildTime,
    sizeKB: Math.round(fs.statSync(INDEX_PATH).size / 1024),
  };
}
