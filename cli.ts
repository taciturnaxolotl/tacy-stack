#!/usr/bin/env bun
/**
 * Tacy Stack CLI
 * Interactive project scaffolder
 */

import { $ } from "bun";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import * as p from "@clack/prompts";
import { setTimeout } from "node:timers/promises";

async function main() {
	console.clear();
	
	p.intro("🥞 Tacy Stack Generator");
	
	// Get project name
	const projectName = await p.text({
		message: "What is your project name?",
		placeholder: "my-app",
		validate(value) {
			if (!value) return "Project name is required";
			if (!/^[a-z0-9-_]+$/i.test(value)) {
				return "Project name can only contain letters, numbers, hyphens, and underscores";
			}
			const targetDir = join(process.cwd(), value);
			if (existsSync(targetDir)) {
				return `Directory "${value}" already exists!`;
			}
		},
	});
	
	if (p.isCancel(projectName)) {
		p.cancel("Operation cancelled");
		process.exit(0);
	}
	
	const targetDir = join(process.cwd(), projectName as string);
	const templateDir = import.meta.dir;
	
	const s = p.spinner();
	
	try {
		// Create directory
		s.start("Creating project directory");
		mkdirSync(targetDir, { recursive: true });
		await setTimeout(200);
		s.stop("Created project directory");
		
		// Copy template files
		s.start("Copying template files");
		await $`cp -r ${templateDir}/* ${targetDir}/`.quiet();
		
		// Copy dotfiles
		try {
			await $`cp ${templateDir}/.env.example ${targetDir}/.env.example`.quiet();
			await $`cp ${templateDir}/.gitignore ${targetDir}/.gitignore`.quiet();
			await $`cp ${templateDir}/.gitattributes ${targetDir}/.gitattributes`.quiet();
		} catch {
			// Some dotfiles might not exist
		}
		await setTimeout(200);
		s.stop("Copied template files");
		
		// Remove CLI and template files
		s.start("Cleaning up template files");
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
		await setTimeout(200);
		s.stop("Cleaned up template files");
		
		// Update package.json
		s.start("Configuring package.json");
		const packageJsonPath = join(targetDir, "package.json");
		const packageJson = await Bun.file(packageJsonPath).json();
		packageJson.name = projectName;
		packageJson.version = "0.1.0";
		delete packageJson.bin;
		// Remove @clack/prompts from dependencies since it's only for the CLI
		if (packageJson.dependencies?.["@clack/prompts"]) {
			delete packageJson.dependencies["@clack/prompts"];
		}
		await Bun.write(packageJsonPath, JSON.stringify(packageJson, null, "\t") + "\n");
		await setTimeout(200);
		s.stop("Configured package.json");
		
		// Initialize git
		s.start("Initializing git repository");
		await $`cd ${targetDir} && git init`.quiet();
		await setTimeout(200);
		s.stop("Initialized git repository");
		
		// Create .env
		s.start("Creating .env file");
		await $`cd ${targetDir} && cp .env.example .env`.quiet();
		await setTimeout(200);
		s.stop("Created .env file");
		
		// Install dependencies
		s.start("Installing dependencies");
		await $`cd ${targetDir} && bun install`.quiet();
		s.stop("Installed dependencies");
		
		// Setup database
		s.start("Setting up database");
		await $`cd ${targetDir} && bun run db:push`.quiet();
		s.stop("Set up database");
		
	} catch (error) {
		s.stop("Failed");
		p.cancel(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
		process.exit(1);
	}
	
	p.outro("🎉 Project created successfully!");
	
	p.note(
		`cd ${projectName}\nbun dev`,
		"Next steps"
	);
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
