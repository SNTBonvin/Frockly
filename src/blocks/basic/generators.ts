import * as Blockly from "blockly";
import { javascriptGenerator, Order } from "blockly/javascript";

const G: any = javascriptGenerator;
export const ExcelGen = G;
export { Order as ExcelOrder };
function excelQuote(s: string) {
  return `"${(s ?? "").replace(/"/g, '""')}"`;
}

export function registerBasicGenerators() {

  // ★ここが無いなら、その時点で import/版の問題
  if (!G?.forBlock) {
    throw new Error("javascriptGenerator.forBlock is missing (Blockly version/import mismatch)");
  }

  G.forBlock["basic_start"] = function (block: Blockly.Block) {
    const expr = G.valueToCode(block, "EXPR", Order.NONE) || "";
    return `=${expr}\n`;
  };

  G.forBlock["basic_number"] = function (block: Blockly.Block) {
    const raw = String(block.getFieldValue("NUM") ?? "").trim();
    return [raw, Order.ATOMIC];
  };

  G.forBlock["basic_string"] = function (block: Blockly.Block) {
    const raw = String(block.getFieldValue("STR") ?? "");
    return [excelQuote(raw), Order.ATOMIC];
  };

  G.forBlock["basic_cell"] = function (block: Blockly.Block) {
    const raw = String(block.getFieldValue("CELL") ?? "").trim();
    return [raw, Order.ATOMIC];
  };

  G.forBlock["basic_range"] = function (block: Blockly.Block) {
    const raw = String(block.getFieldValue("RANGE") ?? "").trim();
    return [raw, Order.ATOMIC];
  };

  G.forBlock["basic_arith"] = function (block: Blockly.Block) {
    const op = String(block.getFieldValue("OP") ?? "+");
    const order = op === "*" || op === "/" ? Order.MULTIPLICATION : Order.ADDITION;
    const a = G.valueToCode(block, "A", order) || "";
    const b = G.valueToCode(block, "B", order) || "";
    return [`${a}${op}${b}`, order];
  };

  G.forBlock["basic_cmp"] = function (block: Blockly.Block) {
    const op = String(block.getFieldValue("OP") ?? "=");
    const a = G.valueToCode(block, "A", Order.RELATIONAL) || "";
    const b = G.valueToCode(block, "B", Order.RELATIONAL) || "";
    return [`${a}${op}${b}`, Order.RELATIONAL];
  };

  G.forBlock["basic_paren"] = function (block: Blockly.Block) {
    const inner = G.valueToCode(block, "INNER", Order.NONE) || "";
    return [`(${inner})`, Order.ATOMIC];
  };
}
