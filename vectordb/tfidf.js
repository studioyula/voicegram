/**
 * vectordb/tfidf.js — Pure JS TF-IDF 엔진
 * 외부 의존성 없음. 수강생 배포용 완전 독립 패키지.
 */

/** 토큰화: 소문자 변환 + 구두점 분리 + 2자 미만 제거 */
export function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9가-힣_.]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 2);
}

/** TF: 문서 내 단어 빈도 */
function termFrequency(tokens) {
  const tf = {};
  for (const t of tokens) tf[t] = (tf[t] || 0) + 1;
  const len = tokens.length || 1;
  for (const t in tf) tf[t] /= len;
  return tf;
}

/** IDF 계산 */
export function buildIDF(docs) {
  const df = {};
  const N = docs.length;
  for (const doc of docs) {
    const seen = new Set(doc.tokens);
    for (const t of seen) df[t] = (df[t] || 0) + 1;
  }
  const idf = {};
  for (const t in df) idf[t] = Math.log(N / df[t]) + 1;
  return idf;
}

/** TF-IDF 벡터 생성 */
export function tfidfVector(tokens, idf) {
  const tf = termFrequency(tokens);
  const vec = {};
  for (const t in tf) {
    if (idf[t]) vec[t] = tf[t] * idf[t];
  }
  return vec;
}

/** 코사인 유사도 */
export function cosineSimilarity(a, b) {
  let dot = 0, magA = 0, magB = 0;
  for (const t in a) {
    magA += a[t] * a[t];
    if (b[t]) dot += a[t] * b[t];
  }
  for (const t in b) magB += b[t] * b[t];
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

/**
 * 인덱스에서 검색
 * @param {string} query - 검색어
 * @param {{chunks: Array, idf: Object}} index - 빌드된 인덱스
 * @param {number} topK - 반환 개수
 * @returns {Array<{chunk: Object, score: number}>}
 */
export function search(query, index, topK = 5) {
  const queryTokens = tokenize(query);
  const queryVec = tfidfVector(queryTokens, index.idf);

  const results = index.chunks.map((chunk) => ({
    chunk,
    score: cosineSimilarity(queryVec, chunk.vector),
  }));

  return results
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map((r) => ({
      source: r.chunk.source,
      heading: r.chunk.heading,
      content: r.chunk.content,
      score: Math.round(r.score * 1000) / 1000,
    }));
}
