#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const readline = require("readline");

const envPath = path.resolve(process.cwd(), ".env");

const defaults = {
  serverUrl: "http://localhost:3000",
  clientUrl: "http://localhost:5173",
  llmToken: "your-llm-api-token",
  llmType: "openai",
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const ask = (question, fallback) =>
  new Promise((resolve) => {
    const suffix = fallback ? ` (${fallback})` : "";
    rl.question(`${question}${suffix}: `, (answer) => {
      const value = answer.trim();
      resolve(value || fallback);
    });
  });

async function main() {
  if (fs.existsSync(envPath)) {
    const overwrite = (
      await ask(`.env already exists at ${envPath}. Overwrite? y/N`, "n")
    ).toLowerCase();
    if (overwrite !== "y") {
      console.log("Keeping existing .env, no changes made.");
      return;
    }
  }

  const serverUrl = await ask("Server URL", defaults.serverUrl);
  const clientUrl = await ask("Client URL", defaults.clientUrl);
  const llmToken = await ask("LLM API token", defaults.llmToken);
  const llmType = await ask("LangChain LLM type", defaults.llmType);

  const content = [
    `SERVER_URL=${serverUrl}`,
    `CLIENT_URL=${clientUrl}`,
    `LANGCHAIN_LLM_TYPE=${llmType}`,
    `LLM_API_TOKEN=${llmToken}`,
  ].join("\n");

  fs.writeFileSync(envPath, `${content}\n`);
  console.log(`.env written to ${envPath}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => rl.close());
