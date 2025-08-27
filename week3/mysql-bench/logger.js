import fs from "fs";
import path from "path";

const LOG_FILE = path.resolve("./benchmark_results.txt");

export function log(line) {
  const ts = new Date().toISOString();
  const msg = `${ts} | ${line}`;
  fs.appendFileSync(LOG_FILE, msg + "\n");
  console.log(msg);
}
