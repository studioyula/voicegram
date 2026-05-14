#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

function parseArgs(argv) {
  const args = {
    input: "",
    output: "",
    title: "대화기록",
    deleteInput: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--input") args.input = argv[i + 1] || "";
    if (token === "--output") args.output = argv[i + 1] || "";
    if (token === "--title") args.title = argv[i + 1] || "대화기록";
    if (token === "--delete-input") args.deleteInput = true;
  }

  if (!args.input || !args.output) {
    throw new Error(
      "Usage: node .cursor/skills/transcript-to-md/transcript-jsonl-to-md.mjs --input <jsonl> --output <md> [--title <title>] [--delete-input]",
    );
  }

  return args;
}

function normalizeRole(role) {
  if (role === "user") return "User";
  if (role === "assistant") return "Assistant";
  return "System";
}

function extractTextParts(record) {
  const message = record?.message;
  const content = message?.content;
  if (!Array.isArray(content)) return [];

  const textParts = [];
  for (const item of content) {
    if (item?.type === "text" && typeof item.text === "string") {
      const cleaned = item.text.trim();
      if (cleaned) textParts.push(cleaned);
    }
  }
  return textParts;
}

function stripTimestamps(text) {
  return text
    .replace(/<timestamp>[\s\S]*?<\/timestamp>\s*/g, "")
    .replace(
      /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s.+\(UTC[^\n]*\)\s*$/gm,
      "",
    )
    .trim();
}

function toMarkdown(records, title) {
  const lines = [`# ${title}`, ""];

  for (const record of records) {
    const role = normalizeRole(record?.role);
    const textParts = extractTextParts(record);
    if (textParts.length === 0) continue;

    const messageText = stripTimestamps(textParts.join("\n\n"));
    if (!messageText) continue;
    lines.push(`[${role}]`);
    lines.push(messageText);
    lines.push("");
  }

  return `${lines.join("\n").trim()}\n`;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const inputAbs = path.resolve(args.input);
  const outputAbs = path.resolve(args.output);

  const raw = fs.readFileSync(inputAbs, "utf8");
  const records = raw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line));

  const md = toMarkdown(records, args.title);
  fs.mkdirSync(path.dirname(outputAbs), { recursive: true });
  fs.writeFileSync(outputAbs, md, "utf8");

  if (args.deleteInput) {
    fs.unlinkSync(inputAbs);
  }

  console.log(
    JSON.stringify({
      success: true,
      input: inputAbs,
      output: outputAbs,
      deleteInput: args.deleteInput,
      records: records.length,
    }),
  );
}

main();
