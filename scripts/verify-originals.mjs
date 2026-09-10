import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
const root = path.resolve(import.meta.dirname, "..");
const snapshot = JSON.parse(
  fs.readFileSync(path.join(root, "docs/source-snapshot.json"), "utf8"),
);
let count = 0;
for (const part of snapshot)
  for (const file of part.files) {
    const source = path.resolve(root, "..", file.path);
    if (
      !fs.existsSync(source) ||
      crypto
        .createHash("sha256")
        .update(fs.readFileSync(source))
        .digest("hex") !== file.sha256
    )
      throw Error(`Original changed: ${file.path}`);
    count++;
  }
console.log(
  `PASS: ${count} files across ${snapshot.length} original parts unchanged.`,
);
