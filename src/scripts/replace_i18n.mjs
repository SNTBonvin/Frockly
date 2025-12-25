/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

// ====== 設定 ======
const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, "src");
const I18N_FILE = path.join(SRC_DIR, "i18n", "strings.ts"); // ここは君の実ファイルに合わせて
const OUT_DIR = path.join(ROOT, "i18n_replace_out"); // ここに置換後ファイル(差分)を吐く
const APPLY = false; // trueにしたら上書きする（まずはfalse推奨）

// "t" は各ファイルで用意してる想定。無い場合は置換しない（安全）
const TRANSLATE_FN = "t";

// 除外
const EXCLUDE_RE = /src[\\/](i18n|__tests__|test|dist|build)[\\/]/i;

// ====== ユーティリティ ======
function walkDir(dir) {
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walkDir(p));
    else if (ent.isFile() && (p.endsWith(".ts") || p.endsWith(".tsx"))) out.push(p);
  }
  return out;
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function rel(p) {
  return path.relative(ROOT, p).replaceAll("\\", "/");
}

// import/export の from "xxx" を除外
function isModuleSpecifier(node) {
  const p = node.parent;
  return (
    p &&
    (ts.isImportDeclaration(p) || ts.isExportDeclaration(p)) &&
    p.moduleSpecifier === node
  );
}

// テンプレ文字列（式あり）は除外
function isTemplateWithExpr(node) {
  return ts.isTemplateExpression(node);
}

// ====== 1) STRから「値→キー」逆引きマップを作る ======
// ※ 雑に正規表現で抜く。TS実行(import)より事故少ない。
// 形式: KEY: { en: "...", ja: "..." }
function buildReverseMapFromStringsTs(code) {
  /** @type {Map<string, string[]>} text -> keys */
  const map = new Map();

  const entryRe =
    /([A-Z0-9_]+)\s*:\s*\{\s*en\s*:\s*"([^"]*)"\s*,\s*ja\s*:\s*"([^"]*)"\s*\}/g;

  let m;
  while ((m = entryRe.exec(code))) {
    const key = m[1];
    const en = m[2];
    const ja = m[3];

    for (const text of [en, ja]) {
      if (!text) continue;
      const arr = map.get(text) ?? [];
      arr.push(key);
      map.set(text, arr);
    }
  }
  return map;
}

const i18nCode = fs.readFileSync(I18N_FILE, "utf8");
const reverse = buildReverseMapFromStringsTs(i18nCode);

// 同じ文言が複数キーに割り当たってると危険なので、曖昧なのは置換しない
function pickUniqueKey(text) {
  const keys = reverse.get(text);
  if (!keys || keys.length === 0) return null;
  const uniq = [...new Set(keys)];
  if (uniq.length !== 1) return null;
  return uniq[0];
}

// ====== 2) 各ファイルをASTで見て、辞書にあれば置換 ======
const files = walkDir(SRC_DIR).filter((f) => !EXCLUDE_RE.test(f));

ensureDir(OUT_DIR);

let totalHits = 0;
let totalReplaced = 0;

/** dry-runレポート */
const report = [];

for (const file of files) {
  const code = fs.readFileSync(file, "utf8");
  const isTsx = file.endsWith(".tsx");
  const sf = ts.createSourceFile(
    file,
    code,
    ts.ScriptTarget.Latest,
    true,
    isTsx ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  );

  // そのファイル内に "const t = tr(...)" みたいなのが存在するか軽く判定
  // 無ければ安全のため置換しない（必要なら自動挿入もできるけど、まずは安全）
  const hasT = code.includes(`const ${TRANSLATE_FN} `) || code.includes(`let ${TRANSLATE_FN} `) || code.includes(`${TRANSLATE_FN} = tr(`) || code.includes(`const ${TRANSLATE_FN}=tr(`);

  /** @type {{start:number,end:number,repl:string,orig:string,kind:string}[]} */
  const edits = [];

  function addEdit(node, origText, key, kind) {
    edits.push({
      start: node.getStart(sf),
      end: node.getEnd(),
      repl: `${TRANSLATE_FN}("${key}")`,
      orig: origText,
      kind,
    });
  }

  function visit(node) {
    // "..." / '...'
    if (ts.isStringLiteral(node)) {
      if (isModuleSpecifier(node)) return;
      const text = node.text;
      const key = pickUniqueKey(text);
      if (key) {
        totalHits++;
        if (hasT) {
          addEdit(node, text, key, "StringLiteral");
          totalReplaced++;
        }
      }
    }

    // `...` (式なし)
    if (ts.isNoSubstitutionTemplateLiteral(node)) {
      const text = node.text;
      const key = pickUniqueKey(text);
      if (key) {
        totalHits++;
        if (hasT) {
          addEdit(node, text, key, "NoSubTemplate");
          totalReplaced++;
        }
      }
    }

    // JSXテキスト: <div>保存</div>
    // ここは React 的に <div>{t("SAVE")}</div> に変える必要ある
    if (ts.isJsxText(node)) {
      const raw = node.getText(sf);
      const text = raw.replace(/\s+/g, " ").trim();
      if (text) {
        const key = pickUniqueKey(text);
        if (key) {
          totalHits++;
          if (hasT) {
            edits.push({
              start: node.getStart(sf),
              end: node.getEnd(),
              repl: `{${TRANSLATE_FN}("${key}")}`,
              orig: text,
              kind: "JsxText",
            });
            totalReplaced++;
          }
        }
      }
    }

    // テンプレ式入りは何もしない
    if (isTemplateWithExpr(node)) return;

    ts.forEachChild(node, visit);
  }

  visit(sf);

  if (edits.length === 0) continue;

  // 逆順に適用
  edits.sort((a, b) => b.start - a.start);
  let out = code;
  for (const e of edits) {
    out = out.slice(0, e.start) + e.repl + out.slice(e.end);
  }

  const dst = path.join(OUT_DIR, rel(file));
  ensureDir(path.dirname(dst));
  fs.writeFileSync(dst, out, "utf8");

  report.push({
    file: rel(file),
    replaced: edits.length,
    note: hasT ? "" : "SKIPPED(no t variable)",
  });

  if (APPLY && hasT) {
    fs.writeFileSync(file, out, "utf8");
  }
}

// レポート
console.log("=== i18n replace report ===");
console.log("I18N file:", rel(I18N_FILE));
console.log("Output dir:", rel(OUT_DIR));
console.log("Total hits (found in dict):", totalHits);
console.log("Total replaced (files with t):", totalReplaced);
console.log("");

for (const r of report) {
  console.log(`${r.replaced}\t${r.file}\t${r.note}`);
}

console.log("\nNOTE: ambiguous texts (multiple keys) are skipped.");
console.log("NOTE: files without `t` variable are skipped for safety.");
