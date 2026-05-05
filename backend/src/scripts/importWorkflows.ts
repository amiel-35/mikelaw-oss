import { createHash } from "node:crypto";
import {
  printWorkflowPackValidationResults,
  resolveWorkflowPackDir,
  validateWorkflowPackFiles,
} from "../lib/workflowPacks";

// Stable namespace for deriving deterministic database UUIDs from workflow pack ids.
const WORKFLOW_PACK_NAMESPACE = "8a1ed3bb-5d9d-4c0c-8a71-87d8fe247df7";

type ImportAction = "would create";

function parseArgs(argv: string[]) {
  const dryRun = argv.includes("--dry-run");
  const workflowDirArg = argv.find((arg) => arg !== "--dry-run");
  return { dryRun, workflowDirArg };
}

function uuidBytes(uuid: string) {
  return Buffer.from(uuid.replace(/-/g, ""), "hex");
}

function formatUuid(bytes: Buffer) {
  const hex = bytes.toString("hex");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join("-");
}

function deterministicUuidV5(name: string, namespace: string) {
  const hash = createHash("sha1").update(uuidBytes(namespace)).update(name).digest();
  const bytes = Buffer.from(hash.subarray(0, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  return formatUuid(bytes);
}

function workflowDatabaseId(packId: string) {
  return deterministicUuidV5(`workflow-pack:${packId}`, WORKFLOW_PACK_NAMESPACE);
}

async function main() {
  const { dryRun, workflowDirArg } = parseArgs(process.argv.slice(2));
  if (!dryRun) {
    throw new Error("Only dry-run import is supported. Re-run with --dry-run.");
  }

  const workflowDir = resolveWorkflowPackDir(workflowDirArg);
  const results = await validateWorkflowPackFiles(workflowDir);
  const invalidResults = results.filter((result) => !result.valid);

  if (invalidResults.length > 0) {
    printWorkflowPackValidationResults(results);
    process.exitCode = 1;
    return;
  }

  const validResults = results.filter((result) => result.valid);
  if (validResults.length === 0) {
    console.log("No workflow files found.");
    return;
  }

  for (const result of validResults) {
    const workflow = result.workflow;
    const dbId = workflowDatabaseId(workflow.id);
    const action: ImportAction = "would create";

    console.log(`${action.toUpperCase()} ${result.filePath}`);
    console.log(`  pack_id: ${workflow.id}`);
    console.log(`  db_id: ${dbId}`);
    console.log(`  title: ${workflow.title}`);
    console.log(`  type: ${workflow.type}`);
    console.log(`  is_system: ${workflow.is_system ?? false}`);
  }

  console.log("");
  console.log(`Workflow import dry-run: ${validResults.length} would create, 0 invalid, ${results.length} total`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
