#!/usr/bin/env node
import "dotenv/config";
/**
 * coloso-ae-mcp v3.0 — Adobe After Effects MCP Server (Student Edition)
 *
 * 2개 툴: scan / execute
 * + 내장 벡터DB로 AE API 문서 자동 조회
 *
 * 구조:
 *   - MCP 서버 (stdio): Claude/Cursor와 통신
 *   - 내장 Express 브릿지 (port 3002): HTTP로 AE 제어 가능 (선택)
 *   - macOS: osascript → AE DoScriptFile → 결과 파일 → chokidar 감지
 *   - Windows: AfterFX.exe -r → 결과 파일 → chokidar 감지
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import { exec, execFile } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import chokidar from "chokidar";
import { z } from "zod";
import { searchDocs, isIndexBuilt, getStats } from "./vectordb/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Motion Helper Library 로드 ───────────────────────────────────────────────
const MOTION_LIB_PATH = path.join(__dirname, "helpers", "motion.jsx");
let MOTION_LIB_CODE = "";
try {
  MOTION_LIB_CODE = fs.readFileSync(MOTION_LIB_PATH, "utf-8");
} catch (e) {
  console.error(`[coloso-ae-mcp] helpers/motion.jsx 로드 실패: ${e.message}`);
}

// ─── 설정 ─────────────────────────────────────────────────────────────────────
const AE_APP = process.env.AE_APP ?? "Adobe After Effects 2026";
const AE_PATH = process.env.AE_PATH ?? ""; // Windows: AfterFX.exe 전체 경로
const IS_WIN = process.platform === "win32";
const BRIDGE_PORT = parseInt(process.env.BRIDGE_PORT ?? "3002");
const TMP_DIR = path.join(__dirname, "tmp");
const LOGS_DIR = path.join(__dirname, "logs");
const SCAN_DIR = path.join(__dirname, "scripts", "scan");

fs.mkdirSync(TMP_DIR, { recursive: true });
fs.mkdirSync(LOGS_DIR, { recursive: true });

// ─── 대기 요청 관리 ───────────────────────────────────────────────────────────
const pendingRequests = new Map();
const completedResults = new Map();
let lastCompletedRequestId = null;
const MAX_COMPLETED_RESULTS = 200;

function saveCompletedResult(requestId, result) {
  completedResults.set(requestId, {
    requestId,
    completedAt: new Date().toISOString(),
    ...result,
  });
  lastCompletedRequestId = requestId;
  if (completedResults.size > MAX_COMPLETED_RESULTS) {
    const firstKey = completedResults.keys().next().value;
    if (firstKey) completedResults.delete(firstKey);
  }
}

const watcher = chokidar.watch(LOGS_DIR, {
  ignored: /^\./,
  persistent: true,
  ignoreInitial: true,
});

function resolveRequest(requestId, filePath) {
  const entry = pendingRequests.get(requestId);
  if (entry) pendingRequests.delete(requestId);
  setTimeout(() => {
    try {
      const raw = fs.readFileSync(filePath, "utf-8");
      const parsed = JSON.parse(raw);
      saveCompletedResult(requestId, parsed);
      if (entry && typeof entry.resolve === "function") entry.resolve(parsed);
      if (entry && entry.scriptPath) {
        try { fs.unlinkSync(entry.scriptPath); } catch {}
      }
    } catch (e) {
      const fallback = {
        success: false,
        error: `결과 파일 파싱 실패: ${e.message}`,
        requestId,
      };
      saveCompletedResult(requestId, fallback);
      if (entry && typeof entry.resolve === "function") entry.resolve(fallback);
      if (entry && entry.scriptPath) {
        try { fs.unlinkSync(entry.scriptPath); } catch {}
      }
    }
  }, 300);
}

watcher.on("add", (fp) => {
  const m = path.basename(fp).match(/^ae_result_(.+)\.json$/);
  if (m) resolveRequest(m[1], fp);
});
watcher.on("change", (fp) => {
  const m = path.basename(fp).match(/^ae_result_(.+)\.json$/);
  if (m) resolveRequest(m[1], fp);
});

// ─── AE 스크립트 래핑 ────────────────────────────────────────────────────────
function wrapScript(code, requestId) {
  const logPath = path
    .join(LOGS_DIR, `ae_result_${requestId}.json`)
    .replace(/\\/g, "/");

  const cleanCode = code
    .replace(/app\.beginUndoGroup\s*\([^)]*\)\s*;?/g, "/* beginUndoGroup removed */")
    .replace(/app\.endUndoGroup\s*\(\s*\)\s*;?/g, "/* endUndoGroup removed */");

  return `
var _ts = new Date().getTime();
var _logs = [];
var _success = true;
var _error = "";
var _output = "";
var _expressionErrors = [];

function log(msg) { _logs.push(String(msg)); }

function setExpr(prop, expr) {
    prop.expression = expr;
    var _exprErr = prop.expressionError;
    if (_exprErr && _exprErr !== "") {
        throw new Error("Expression 에러 [" + prop.name + "]: " + _exprErr);
    }
    return prop;
}

function _scanExpressionErrors() {
    var found = [];
    try {
        var comp = app.project ? app.project.activeItem : null;
        if (!comp || !(comp instanceof CompItem)) return found;
        for (var li = 1; li <= comp.numLayers; li++) {
            var layer = comp.layer(li);
            if (!layer) continue;
            var layerName = layer.name || ("Layer " + li);
            function walk(prop, pathParts) {
                if (!prop) return;
                var pName = prop.name || prop.matchName || "prop";
                var nextPath = pathParts.concat([pName]);
                if (prop.propertyType === PropertyType.PROPERTY) {
                    try {
                        if (prop.canSetExpression && prop.expressionEnabled && prop.expressionError && prop.expressionError !== "") {
                            found.push({
                                layer: layerName,
                                propertyPath: nextPath.join(" > "),
                                error: String(prop.expressionError)
                            });
                        }
                    } catch(_e) {}
                    return;
                }
                if (prop.numProperties && prop.numProperties > 0) {
                    for (var i = 1; i <= prop.numProperties; i++) {
                        walk(prop.property(i), nextPath);
                    }
                }
            }
            try {
                walk(layer, []);
            } catch(_e2) {}
        }
    } catch(_eTop) {}
    return found;
}

// ─── Motion Helper Library ──────────────────────────────────────────────
${MOTION_LIB_CODE}
// ────────────────────────────────────────────────────────────────────────

try { app.preferences.savePrefAsBool("Main Pref Section", "Show Tool Tips", true); } catch(e) {}
$.level = 0;

if (typeof JSON === "undefined") {
    var JSON = {};
    JSON.stringify = function(obj) {
        if (obj === null) return "null";
        if (obj === undefined) return "null";
        var t = typeof obj;
        if (t === "number" || t === "boolean") return String(obj);
        if (t === "string") return '"' + obj.replace(/\\\\/g, "\\\\\\\\").replace(/"/g, '\\\\"').replace(/\\n/g, "\\\\n").replace(/\\r/g, "\\\\r") + '"';
        if (obj instanceof Array) {
            var a = [];
            for (var i = 0; i < obj.length; i++) a.push(JSON.stringify(obj[i]));
            return "[" + a.join(",") + "]";
        }
        if (t === "object") {
            var pairs = [];
            for (var k in obj) {
                if (obj.hasOwnProperty(k)) {
                    var v = JSON.stringify(obj[k]);
                    if (v !== undefined) pairs.push('"' + k + '":' + v);
                }
            }
            return "{" + pairs.join(",") + "}";
        }
        return "null";
    };
}

app.beginUndoGroup("AE-MCP");
try {
    var _ret = (function() {
${cleanCode}
    })();
    if (_ret !== undefined) {
        _output = (typeof _ret === "object") ? JSON.stringify(_ret) : String(_ret);
    }
} catch(e) {
    _success = false;
    var _eLine = e.line !== undefined ? e.line : "?";
    var _eFile = "script";
    if (e.fileName) { var _fp = e.fileName.split("/"); _eFile = _fp[_fp.length - 1] || _eFile; }
    _error = e.message + " [" + _eFile + ":" + _eLine + "]";
    _logs.push("[ERROR] " + _error);
} finally {
    app.endUndoGroup();
    _expressionErrors = _scanExpressionErrors();
    if (_expressionErrors.length > 0) {
        _success = false;
        if (!_error || _error === "") {
            _error = "Expression 에러 감지: " + _expressionErrors.length + "개";
        }
        _logs.push("[EXPR ERRORS] " + _expressionErrors.length + "개");
    }

    var _f = new File("${logPath}");
    _f.encoding = "UTF-8";
    _f.open("w");

    function _esc(s) {
        return s.replace(/\\\\/g, "\\\\\\\\")
                .replace(/"/g, '\\\\"')
                .replace(/\\r\\n/g, "\\\\n")
                .replace(/\\r/g, "\\\\n")
                .replace(/\\n/g, "\\\\n");
    }

    _f.write(
        '{"requestId":"${requestId}",' +
        '"success":' + _success + ',' +
        '"output":"' + _esc(_output) + '",' +
        '"logs":"' + _esc(_logs.join("\\n")) + '",' +
        '"error":"' + _esc(_error) + '",' +
        '"expressionErrors":' + JSON.stringify(_expressionErrors) + ',' +
        '"timestamp":"' + _ts + '"}'
    );
    _f.close();
}
`.trim();
}

// ─── 실행 코어 ────────────────────────────────────────────────────────────────
function cleanupOldLogs(prefix) {
  var pfx = prefix || "ae_result_";
  try {
    const files = fs
      .readdirSync(LOGS_DIR)
      .filter((f) => f.startsWith(pfx) && f.endsWith(".json"))
      .map((f) => ({
        p: path.join(LOGS_DIR, f),
        t: fs.statSync(path.join(LOGS_DIR, f)).mtime,
      }))
      .sort((a, b) => a.t - b.t);
    if (files.length >= 10) {
      files.slice(0, files.length - 5).forEach((f) => {
        try { fs.unlinkSync(f.p); } catch {}
      });
    }
  } catch {}
}

/** execute — 코드에서 AE API 토큰을 뽑아 벡터DB 힌트 문자열 생성 */
function buildAeDocHintsFromCode(code) {
  if (!isIndexBuilt() || !code) return "";
  const keywords = code.match(
    /\b(app\.\w+|CompItem|AVLayer|ShapeLayer|TextLayer|PropertyType|KeyframeInterpolationType|sourceRectAtTime|transform\.\w+|property\([^)]+\))\b/g
  );
  if (!keywords) return "";
  const uniqueKw = [...new Set(keywords)].slice(0, 3);
  const results = uniqueKw.flatMap((kw) => searchDocs(kw, 2));
  if (results.length === 0) return "";
  return (
    "\n\n📖 관련 AE API 문서:\n" +
    results
      .map((r) => `- [${r.source}] ${r.heading}: ${r.content.slice(0, 120)}...`)
      .join("\n")
  );
}

function executeInAE(code, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const requestId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const scriptPath = path.join(TMP_DIR, `script_${requestId}.jsx`);

    fs.writeFileSync(scriptPath, wrapScript(code, requestId), "utf-8");
    cleanupOldLogs();

    if (IS_WIN) {
      const aePath = AE_PATH || "AfterFX.exe";
      execFile(aePath, ["-r", scriptPath], { timeout: 10000 }, (err) => {
        if (err) console.error(`[coloso-ae-mcp] AE 오류: ${err.message}`);
      });
    } else {
      const cmd = `osascript -e 'tell application "${AE_APP}" to DoScriptFile "${scriptPath.replace(/'/g, "\\'")}"'`;
      exec(cmd, { timeout: 10000 }, (err) => {
        if (err) console.error(`[coloso-ae-mcp] osascript 오류: ${err.message}`);
      });
    }

    const timer = setTimeout(() => {
      pendingRequests.delete(requestId);
      try { fs.unlinkSync(scriptPath); } catch {}
      reject(new Error(`타임아웃: ${timeoutMs / 1000}초 내에 AE 응답 없음`));
    }, timeoutMs);

    pendingRequests.set(requestId, {
      resolve: (result) => {
        clearTimeout(timer);
        resolve(result);
      },
      reject,
      scriptPath,
    });
  });
}

// ─── MCP 도구 등록 ──
const mcp = new McpServer({
  name: "coloso-ae-mcp",
  version: "3.0.0",
  description: "Adobe MCP — AE 전용 (scan/execute)",
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1. scan — AE 컴포지션 구조 + 키프레임 정보 조회 (read-only)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
mcp.tool(
  "scan",
  [
    "고정 스캔 스크립트를 실행합니다.",
    "현재 활성 컴프, 전체 레이어 목록, 선택 레이어/선택 속성/선택 키프레임 정보를 반환합니다.",
  ].join(" "),
  {},
  async () => {
    try {
      const scanScriptPath = path.join(SCAN_DIR, "ae-fixed-scan.jsx");
      if (!fs.existsSync(scanScriptPath)) {
        return { content: [{ type: "text", text: "scan 스크립트를 찾을 수 없습니다: scripts/scan/ae-fixed-scan.jsx" }], isError: true };
      }
      const script = fs.readFileSync(scanScriptPath, "utf-8");
      const result = await executeInAE(script);
      if (!result.success) {
        return { content: [{ type: "text", text: `scan 실패: ${result.error}` }], isError: true };
      }
      let output = result.output || "{}";
      try { output = JSON.stringify(JSON.parse(output), null, 2); } catch {}
      return { content: [{ type: "text", text: output }] };
    } catch (e) {
      return { content: [{ type: "text", text: `오류: ${e.message}` }], isError: true };
    }
  }
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2. execute — AE ExtendScript 코드 작성·실행
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
mcp.tool(
  "execute",
  [
    "ExtendScript 코드를 AE에서 실행합니다.",
    "단일 스크립트: script 파라미터 사용.",
    "배치 실행: scripts 배열 [{label, code}]로 여러 스크립트 순차 실행.",
    "규칙: ES3/ES5 문법 (var, function), return으로 결과 반환, log()로 디버그.",
    "벡터DB가 빌드되어 있으면 코드 내 AE API 키워드를 자동 검색해 관련 문서를 힌트로 제공합니다 (기본 켜짐).",
  ].join(" "),
  {
    script: z.string().optional().describe("실행할 ExtendScript 코드 (단일)."),
    scripts: z.array(
      z.object({
        label: z.string().describe("스크립트 설명"),
        code: z.string().describe("ExtendScript 코드"),
      })
    ).optional().describe("배치 실행할 스크립트 배열."),
    timeout: z.number().optional().describe("타임아웃 ms (기본 10000)."),
    searchDocs: z.boolean().optional().describe(
      "벡터DB 문서 힌트. 생략 또는 true면 검색, false만 끔."
    ),
  },
  async ({ script, scripts, timeout, searchDocs } = {}) => {
    const timeoutMs = timeout || 10000;
    const doSearch = searchDocs !== false;

    const codeForHints =
      script || (scripts && scripts.map((s) => s.code).join(" ")) || "";
    const docHints = doSearch ? buildAeDocHintsFromCode(codeForHints) : "";

    // 배치 모드
    if (scripts && scripts.length > 0) {
      const results = [];
      for (const { label, code } of scripts) {
        try {
          const result = await executeInAE(code, timeoutMs);
          results.push({
            label, success: result.success,
            output: result.output || null,
            error: result.error || null,
            logs: result.logs || null,
          });
        } catch (e) {
          results.push({ label, success: false, error: e.message });
        }
      }
      const text = results.map((r) =>
        `[${r.label}] ${r.success ? "✓" : "✗"}\n${r.error ? `에러: ${r.error}\n` : ""}${r.output ? `결과: ${r.output}\n` : ""}${r.logs ? `로그: ${r.logs}` : ""}`
      ).join("\n\n") + docHints;
      return { content: [{ type: "text", text }] };
    }

    // 단일 모드
    if (!script) {
      return { content: [{ type: "text", text: "script 또는 scripts 파라미터가 필요합니다." }], isError: true };
    }

    try {
      const result = await executeInAE(script, timeoutMs);
      const parts = [];
      if (!result.success && result.error) parts.push(`에러: ${result.error}`);
      if (result.output) parts.push(`결과:\n${result.output}`);
      if (result.logs) parts.push(`로그:\n${result.logs}`);
      if (!parts.length) parts.push("스크립트 실행 완료 (출력 없음)");
      if (docHints) parts.push(docHints);
      return { content: [{ type: "text", text: parts.join("\n\n") }] };
    } catch (e) {
      return { content: [{ type: "text", text: `실행 실패: ${e.message}` }], isError: true };
    }
  }
);

// ─── 내장 Express 브릿지 서버 ─────────────────────────────────────────────────
function startBridgeServer() {
  const app = express();
  app.use(cors());
  app.use(bodyParser.json({ limit: "10mb" }));

  app.get("/status", (req, res) => {
    res.json({
      status: "running",
      version: "3.0.0",
      tools: ["scan", "execute"],
      ae: AE_APP,
      vectorDB: isIndexBuilt() ? getStats() : "not built",
      pendingRequests: pendingRequests.size,
      uptime: Math.round(process.uptime()),
    });
  });

  app.post("/execute", async (req, res) => {
    const { script, searchDocs: searchDocsFlag } = req.body;
    if (!script) {
      return res.status(400).json({ success: false, error: "script 필드가 필요합니다" });
    }
    try {
      const result = await executeInAE(script);
      const doSearch = searchDocsFlag !== false;
      let docHints = "";
      if (doSearch) {
        docHints = buildAeDocHintsFromCode(script);
      }
      res.json({
        ...result,
        ...(docHints ? { docHints } : {}),
      });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  const server = app.listen(BRIDGE_PORT, () => {
    console.error(`[coloso-ae-mcp] 브릿지 서버: http://localhost:${BRIDGE_PORT}`);
  });

  server.on("error", (err) => {
    if (err && err.code === "EADDRINUSE") {
      console.error(
        `[coloso-ae-mcp] 브릿지 포트 ${BRIDGE_PORT} 사용 중 - 브릿지 없이 MCP(stdio)만 실행합니다.`
      );
      return;
    }
    console.error(`[coloso-ae-mcp] 브릿지 서버 오류: ${err.message}`);
  });
}

// ─── 진입점 ───────────────────────────────────────────────────────────────────
async function main() {
  console.error(`[coloso-ae-mcp] v3.0 시작 중... (AE: ${AE_APP})`);
  console.error(`[coloso-ae-mcp] 벡터DB: ${isIndexBuilt() ? "빌드됨" : "미빌드 (node vectordb/build.js 실행 필요)"}`);

  startBridgeServer();

  const transport = new StdioServerTransport();
  await mcp.connect(transport);
  console.error("[coloso-ae-mcp] MCP 서버 실행 중 (stdio) — 2 tools: scan, execute");
}

main().catch((e) => {
  console.error("[coloso-ae-mcp] 치명적 오류:", e);
  process.exit(1);
});
