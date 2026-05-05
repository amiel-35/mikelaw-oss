import {
  printWorkflowPackValidationResults,
  resolveWorkflowPackDir,
  validateWorkflowPackFiles,
} from "../lib/workflowPacks";

async function main() {
  const workflowDir = resolveWorkflowPackDir(process.argv[2]);
  const results = await validateWorkflowPackFiles(workflowDir);
  printWorkflowPackValidationResults(results);

  if (results.some((result) => !result.valid)) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
