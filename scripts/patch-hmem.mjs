import fs from "node:fs";

const file = new URL("../vendor/hmem/src/trustLedger.ts", import.meta.url);
let source = fs.readFileSync(file, "utf8");
if (source.includes("constructor(private clock: () => number, persistDir?: string)")) {
  source = source
    .replace("  private file?: string;", "  private file?: string;\n  private clock: () => number;")
    .replace(
      "  constructor(private clock: () => number, persistDir?: string) {",
      "  constructor(clock: () => number, persistDir?: string) {\n    this.clock = clock;",
    );
  fs.writeFileSync(file, source);
}
