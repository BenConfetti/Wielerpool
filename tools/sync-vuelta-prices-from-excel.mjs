import fs from "node:fs/promises";
import path from "node:path";
import { FileBlob, SpreadsheetFile } from "file:///C:/Users/kejes/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs";

const root = process.cwd();
const workbookPath = path.join(root, "outputs", "vuelta-2026-20260818", "Wielerpool_prijslijst_vuelta_2026.xlsx");
const csvPath = path.join(root, "frontend", "data", "vuelta-2026-bc.csv");

const normalize = (value) => String(value || "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9]+/gi, " ")
  .trim()
  .toLowerCase();
const quote = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
const parseSemicolonCsv = (text) => text.trim().split(/\r?\n/).map((line) => {
  const values = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"' && quoted && line[index + 1] === '"') { value += '"'; index += 1; }
    else if (character === '"') quoted = !quoted;
    else if (character === ";" && !quoted) { values.push(value); value = ""; }
    else value += character;
  }
  values.push(value);
  return values;
});

const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(workbookPath));
const modelMaximum = Number(workbook.worksheets.getItem("Instellingen").getRange("B17").values[0][0]);
const rows = workbook.worksheets.getItem("Renners").getUsedRange().values.slice(5).filter((row) => row[0]);
const excelPrices = new Map(rows.map((row) => [normalize(row[0]), {
  name: String(row[0]),
  price: Number(row[13])
}]));
const invalid = [...excelPrices.values()].filter((entry) => !Number.isFinite(entry.price) || entry.price < 0);
if (invalid.length) throw new Error(`Ongeldige definitieve prijzen: ${invalid.map((entry) => entry.name).join(", ")}`);

const csvRows = parseSemicolonCsv(await fs.readFile(csvPath, "utf8"));
const header = csvRows.shift();
const missing = csvRows.filter((row) => !excelPrices.has(normalize(row[0]))).map((row) => row[0]);
if (missing.length) throw new Error(`Niet gevonden in Excel: ${missing.join(", ")}`);
if (csvRows.length !== excelPrices.size) throw new Error(`Aantal renners verschilt: app=${csvRows.length}, Excel=${excelPrices.size}`);

const changes = csvRows.map((row) => ({ name: row[0], before: Number(row[1]), after: excelPrices.get(normalize(row[0])).price }))
  .filter((change) => change.before !== change.after);
csvRows.forEach((row) => { row[1] = String(excelPrices.get(normalize(row[0])).price); });
csvRows.sort((left, right) => Number(right[1]) - Number(left[1]) || left[0].localeCompare(right[0]));
csvRows.forEach((row, index) => { row[2] = String(index + 1); });

const output = [header, ...csvRows].map((row) => row.map(quote).join(";")).join("\r\n") + "\r\n";
await fs.writeFile(csvPath, output, "utf8");
console.log(JSON.stringify({ riders: csvRows.length, modelMaximum, changes, pogacar: csvRows.find((row) => normalize(row[0]) === "pogacar tadej")?.[1] }));
