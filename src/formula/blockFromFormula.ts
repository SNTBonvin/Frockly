import * as Blockly from "blockly";
import { tokenizeFormula } from "./tokenize";
import { parseAst } from "./parser";
import { astToBlockly } from "./astToBlockly";

export function blockFromFormula(
  workspace: Blockly.WorkspaceSvg,
  formulaText: string
) {
  const { src, toks } = tokenizeFormula(formulaText);
  let ast;
  try {
    ast = parseAst(src, toks);
  } catch (err) {
    console.error("[blockFromFormula] parseAst failed", {
      formulaText,
      src,
      toks,
      err,
    });
    throw err;
  }

  // ルート (= start)
  const start = workspace.newBlock("basic_start");
  start.initSvg();
  (start as any).render?.();

  let built;
  try {
    built = astToBlockly(workspace, ast);
  } catch (err) {
    console.error("[blockFromFormula] astToBlockly failed", {
      formulaText,
      src,
      toks,
      ast,
      err,
    });
    throw err;
  }

  // start.EXPR ← built
  const exprConn = start.getInput("EXPR")?.connection;
  if (exprConn && built.outConn) exprConn.connect(built.outConn);

  start.moveBy(40, 40);

  // 選択（workspace.setSelectedは使わん）
  (start as any).select?.();

  // 最後にレイアウト更新（君の流儀）
  workspace.resize();

  return start;
}
