import { writeFileSync } from "fs";

// --- Types ---

interface User {
  email: string;
  name: string;
  [key: string]: unknown;
}

interface Config {
  count: number;
  output: string;
  domain: string;
}

// --- Arg parsing ---

function parseArgs(argv: string[]): Config {
  const get = (flag: string, def: string): string => {
    const i = argv.indexOf(flag);
    const next = argv[i + 1];
    if (i !== -1 && next !== undefined) return next;
    return def;
  };

  const count = parseInt(get("-n", "1000"), 10);
  if (isNaN(count) || count <= 0) {
    throw new Error(`Invalid -n value: must be a positive integer`);
  }

  if (count > 1_000_000) {
    throw new Error(`Can not generate more than 1 million users`);
  }

  return {
    count,
    output: get("-o", "bodies.jsonl"),
    domain: get("--domain", "example.com"),
  };
}

// --- Sequence encoder ---

function toSequenceId(index: number): string {
  const LETTERS = 26;
  const DIGITS = 10;
  const BLOCK = LETTERS * LETTERS * LETTERS; // 17,576 letter combos
  const TOTAL = BLOCK * DIGITS * DIGITS * DIGITS; // 17,576,000 total

  if (index >= TOTAL)
    throw new Error(`Index ${index} exceeds max sequence ${TOTAL}`);

  const digits = index % 1000;
  const letters = Math.floor(index / 1000);

  const l0 = String.fromCharCode(65 + (letters % 26));
  const l1 = String.fromCharCode(65 + (Math.floor(letters / 26) % 26));
  const l2 = String.fromCharCode(65 + (Math.floor(letters / 676) % 26));

  return `${l2}${l1}${l0}${String(digits).padStart(3, "0")}`;
}

// --- Generator ---

function generateUser(index: number, domain: string): User {
  const id = toSequenceId(index);
  return {
    email: `user_${id}@${domain}`,
    name: `User ${index + 1}`,
  };
}

function generateLines(config: Config): string[] {
  return Array.from({ length: config.count }, (_, i) =>
    JSON.stringify(generateUser(i, config.domain)),
  );
}

// --- Main ---

function main(): void {
  const config = parseArgs(process.argv.slice(2));
  const lines = generateLines(config);
  writeFileSync(config.output, lines.join("\n") + "\n", "utf-8");
  console.log(`✓ Generated ${config.count} records → ${config.output}`);
}

main();

/*
Load testing with oha

oha -n 100 -q 10 -m POST -H "Content-Type: application/json" -Z bodies.jsonl http://localhost:8080/user/register
*/
