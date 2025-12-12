#!/usr/bin/env bun
/**
 * Tacy Stack CLI
 * Interactive project scaffolder
 */

import { $ } from "bun";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

// ANSI color codes
const colors = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  dim: "\x1b[2m",
};

function log(message: string, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function header() {
  log("\n╔═══════════════════════════════════════╗", colors.cyan);
  log("║                                       ║", colors.cyan);
  log("║     🥞  Tacy Stack Generator  🥞      ║", colors.cyan);
  log("║                                       ║", colors.cyan);
  log("║   Bun + Lit + Drizzle + Passkeys      ║", colors.cyan);
  log("║                                       ║", colors.cyan);
  log("╚═══════════════════════════════════════╝", colors.cyan);
  log("");
}

async function prompt(
  question: string,
  defaultValue?: string,
): Promise<string> {
  const hint = defaultValue
    ? colors.dim + ` (${defaultValue})` + colors.reset
    : "";
  process.stdout.write(`${colors.bold}${question}${hint}: ${colors.reset}`);

  for await (const line of console) {
    const input = line.trim();
    return input || defaultValue || "";
  }

  return defaultValue || "";
}

function validateProjectName(name: string): string | null {
  if (!name) return "Project name is required";
  if (!/^[a-z0-9-_]+$/i.test(name)) {
    return "Project name can only contain letters, numbers, hyphens, and underscores";
  }
  return null;
}

async function main() {
  header();

  // Get project name
  let projectName = "";
  while (true) {
    projectName = await prompt("Project name", "my-app");
    const error = validateProjectName(projectName);
    if (!error) break;
    log(`❌ ${error}\n`, colors.red);
  }

  // Get target directory
  const targetDir = join(process.cwd(), projectName);

  if (existsSync(targetDir)) {
    log(`\n❌ Directory "${projectName}" already exists!`, colors.red);
    log(
      `   Please choose a different name or remove the existing directory.\n`,
      colors.dim,
    );
    process.exit(1);
  }

  // Confirm
  log("");
  log("📋 Project Summary:", colors.bold);
  log(`   Name: ${colors.cyan}${projectName}${colors.reset}`);
  log(`   Path: ${colors.dim}${targetDir}${colors.reset}`);
  log("");

  const confirm = await prompt("Create project?", "Y/n");
  if (confirm.toLowerCase() === "n") {
    log("\n👋 Cancelled\n", colors.yellow);
    process.exit(0);
  }

  // Create project
  log(`\n🚀 Creating project...`, colors.green);

  // Create directory
  mkdirSync(targetDir, { recursive: true });

  // Get the template directory (where this CLI is located)
  const templateDir = import.meta.dir;

  // Copy template files
  log(`📁 Copying template files...`, colors.dim);

  // Copy all files except hidden files first
  await $`cp -r ${templateDir}/* ${targetDir}/`.quiet();

  // Copy hidden files (dotfiles) separately, ignore errors if they don't exist
  try {
    await $`cp ${templateDir}/.env.example ${targetDir}/.env.example`.quiet();
    await $`cp ${templateDir}/.gitignore ${targetDir}/.gitignore`.quiet();
    await $`cp ${templateDir}/.gitattributes ${targetDir}/.gitattributes`.quiet();
  } catch {
    // Some dotfiles might not exist, that's ok
  }

  // Remove CLI and template setup files
  const filesToRemove = [
    "cli.ts",
    "TEMPLATE.md",
    "TEMPLATE_SETUP_SUMMARY.md",
    "CLI_SUMMARY.md",
    "PUBLISHING.md",
    "template.toml",
    ".github/TEMPLATE_SETUP.md",
  ];

  for (const file of filesToRemove) {
    const filePath = join(targetDir, file);
    if (existsSync(filePath)) {
      await $`rm -rf ${filePath}`.quiet();
    }
  }

  // Update package.json with new name
  log(`📝 Configuring project...`, colors.dim);
  const packageJsonPath = join(targetDir, "package.json");
  const packageJson = await Bun.file(packageJsonPath).json();
  packageJson.name = projectName;
  packageJson.version = "0.1.0";
  delete packageJson.bin; // Remove CLI bin entry from generated projects
  await Bun.write(
    packageJsonPath,
    JSON.stringify(packageJson, null, "\t") + "\n",
  );

  // Initialize git
  log(`🔧 Initializing git repository...`, colors.dim);
  await $`cd ${targetDir} && git init`.quiet();

  // Create .env from example
  log(`🔐 Creating .env file...`, colors.dim);
  await $`cd ${targetDir} && cp .env.example .env`.quiet();

  // Install dependencies
  log(`📦 Installing dependencies...`, colors.dim);
  await $`cd ${targetDir} && bun install`.quiet();

  // Setup database
  log(`🗄️  Setting up database...`, colors.dim);
  await $`cd ${targetDir} && bun run db:push`.quiet();

  // Success!
  log("");
  log("✅ Project created successfully!", colors.green + colors.bold);
  log("");
  log("Next steps:", colors.bold);
  log(`  ${colors.cyan}cd ${projectName}${colors.reset}`);
  log(`  ${colors.cyan}bun dev${colors.reset}`);
  log("");
  log(
    `Open ${colors.cyan}http://localhost:3000${colors.reset} to see your app!`,
    colors.dim,
  );
  log("");
}

main().catch((error) => {
  log(`\n❌ Error: ${error.message}`, colors.red);
  process.exit(1);
});
