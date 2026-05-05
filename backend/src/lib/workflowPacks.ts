import { existsSync } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import type { ErrorObject } from "ajv";
import Ajv2020 from "ajv/dist/2020";
import { parse as parseYaml } from "yaml";

const WORKFLOW_FILE_RE = /\.workflow\.(ya?ml|json)$/i;

export type WorkflowPackColumn = {
  name: string;
  format: string;
  prompt: string;
};

export type WorkflowPack = {
  id: string;
  title: string;
  type: "assistant" | "tabular";
  practice?: string;
  jurisdiction?: string;
  language?: string;
  version?: string;
  is_system?: boolean;
  prompt_md: string;
  columns_config?: WorkflowPackColumn[] | null;
};

export type WorkflowPackValidationResult =
  | {
      filePath: string;
      valid: true;
      workflow: WorkflowPack;
      errors: [];
    }
  | {
      filePath: string;
      valid: false;
      workflow?: undefined;
      errors: string[];
    };

export function getRepoRoot() {
  return path.resolve(__dirname, "../../..");
}

export function resolveWorkflowPackDir(inputDir: string | undefined) {
  const repoRoot = getRepoRoot();
  if (!inputDir) return path.join(repoRoot, "workflow-packs");
  if (path.isAbsolute(inputDir)) return inputDir;

  const fromCwd = path.resolve(process.cwd(), inputDir);
  if (existsSync(fromCwd)) return fromCwd;

  return path.resolve(repoRoot, inputDir);
}

export async function collectWorkflowPackFiles(dir: string): Promise<string[]> {
  const dirStat = await stat(dir);
  if (!dirStat.isDirectory()) {
    throw new Error(`Workflow path is not a directory: ${dir}`);
  }

  const files: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectWorkflowPackFiles(entryPath)));
    } else if (entry.isFile() && WORKFLOW_FILE_RE.test(entry.name)) {
      files.push(entryPath);
    }
  }

  return files.sort();
}

function parseWorkflowPackFile(filePath: string, raw: string) {
  if (filePath.toLowerCase().endsWith(".json")) {
    return JSON.parse(raw);
  }
  return parseYaml(raw);
}

function displayPath(filePath: string, repoRoot: string) {
  const relativePath = path.relative(repoRoot, filePath);
  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    return filePath;
  }
  return relativePath;
}

function formatAjvErrors(errors: ErrorObject[] | null | undefined) {
  return (errors ?? []).map((error) => {
    const location = error.instancePath || "/";
    return `${location}: ${error.message ?? "invalid value"}`;
  });
}

export async function validateWorkflowPackFiles(
  workflowDir: string,
): Promise<WorkflowPackValidationResult[]> {
  const repoRoot = getRepoRoot();
  const schemaPath = path.join(repoRoot, "schemas", "workflow.schema.json");
  const schema = JSON.parse(await readFile(schemaPath, "utf8")) as Record<string, unknown>;
  const ajv = new Ajv2020({ allErrors: true });
  const validate = ajv.compile<WorkflowPack>(schema);
  const workflowFiles = await collectWorkflowPackFiles(workflowDir);

  const results: WorkflowPackValidationResult[] = [];

  for (const filePath of workflowFiles) {
    const readablePath = displayPath(filePath, repoRoot);

    try {
      const parsed = parseWorkflowPackFile(filePath, await readFile(filePath, "utf8"));
      const valid = validate(parsed);
      if (valid) {
        results.push({
          filePath: readablePath,
          valid: true,
          workflow: parsed,
          errors: [],
        });
      } else {
        results.push({
          filePath: readablePath,
          valid: false,
          errors: formatAjvErrors(validate.errors),
        });
      }
    } catch (error) {
      results.push({
        filePath: readablePath,
        valid: false,
        errors: [error instanceof Error ? error.message : String(error)],
      });
    }
  }

  return results;
}

export function printWorkflowPackValidationResults(results: WorkflowPackValidationResult[]) {
  if (results.length === 0) {
    console.log("No workflow files found.");
    return;
  }

  for (const result of results) {
    if (result.valid) {
      console.log(`OK ${result.filePath}`);
      continue;
    }

    console.log(`INVALID ${result.filePath}`);
    for (const error of result.errors) {
      console.log(`  - ${error}`);
    }
  }

  const validCount = results.filter((result) => result.valid).length;
  const invalidCount = results.length - validCount;
  console.log("");
  console.log(`Workflow validation: ${validCount} valid, ${invalidCount} invalid, ${results.length} total`);
}
