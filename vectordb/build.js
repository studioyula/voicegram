#!/usr/bin/env node
/**
 * vectordb/build.js — docs/ 폴더를 TF-IDF 인덱스로 빌드
 * 실행: node vectordb/build.js
 * 결과: vectordb/data/index.json
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { tokenize, buildIDF, tfidfVector } from "./tfidf.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOCS_DIR = path.join(__dirname, "..", "docs");
const OUT_PATH = path.join(__dirname, "data", "index.json");

/** .md 파일 재귀 수집 */
function collectMdFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...collectMdFiles(full));
    else if (entry.name.endsWith(".md")) results.push(full);
  }
  return results;
}

/** 마크다운을 ## 헤딩 기준으로 청킹 */
function chunkMarkdown(content, source) {
  const chunks = [];
  const lines = content.split("\n");
  let currentHeading = "(intro)";
  let currentLines = [];

  for (const line of lines) {
    const headingMatch = line.match(/^#{1,3}\s+(.+)/);
    if (headingMatch) {
      if (currentLines.length > 0) {
        const text = currentLines.join("\n").trim();
        if (text.length > 20) {
          chunks.push({ source, heading: currentHeading, content: text });
        }
      }
      currentHeading = headingMatch[1].trim();
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }
  if (currentLines.length > 0) {
    const text = currentLines.join("\n").trim();
    if (text.length > 20) {
      chunks.push({ source, heading: currentHeading, content: text });
    }
  }
  return chunks;
}

// ── Main ──
console.log("[vectordb] 빌드 시작...");

const mdFiles = collectMdFiles(DOCS_DIR);
console.log(`[vectordb] ${mdFiles.length}개 .md 파일 발견`);

let allChunks = [];
for (const fp of mdFiles) {
  const relPath = path.relative(path.join(__dirname, ".."), fp);
  const content = fs.readFileSync(fp, "utf-8");
  const chunks = chunkMarkdown(content, relPath);
  allChunks.push(...chunks);
}
console.log(`[vectordb] ${allChunks.length}개 청크 생성`);

// 토큰화
const docs = allChunks.map((c) => ({
  ...c,
  tokens: tokenize(c.heading + " " + c.content),
}));

// IDF 계산
const idf = buildIDF(docs);
console.log(`[vectordb] 어휘 크기: ${Object.keys(idf).length}`);

// TF-IDF 벡터 생성
const indexedChunks = docs.map((d) => ({
  source: d.source,
  heading: d.heading,
  content: d.content.slice(0, 500), // 저장 시 500자로 제한
  vector: tfidfVector(d.tokens, idf),
}));

// 저장
const index = { idf, chunks: indexedChunks, buildTime: new Date().toISOString() };
fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
fs.writeFileSync(OUT_PATH, JSON.stringify(index), "utf-8");

const sizeKB = Math.round(fs.statSync(OUT_PATH).size / 1024);
console.log(`[vectordb] 빌드 완료: ${OUT_PATH} (${sizeKB}KB)`);
