# Set up Clerk

You do not need to write code. The easiest route is to open the folder in an AI app and let the agent do the setup. This guide explains what you need, what to click, and how to tell when it worked.

## What you need

- A computer with room for the archives and search index. The maintainer's three-library import used about 7.9 GiB; leave extra space for installation and temporary files. Your archive sizes may differ.
- An AI agent with access to local files and command execution. ChatGPT desktop's Codex mode is the tutorial route. Another capable local agent can do the same setup.
- About 2.7 GiB of download capacity for the three provided medical libraries. Your agent obtains them from this repository's library release.
- Internet access to install the app and software dependencies and to use a hosted AI model.

No extra model API key, embedding service, or database account is required by Clerk. Your chosen AI app provides model access under its own terms and limits.

## 1. Download and extract

1. Open [the repository](https://github.com/ahmadhajji/clerk).
2. Click the green **Code** button, then **Download ZIP**. You can also use the [direct ZIP link](https://github.com/ahmadhajji/clerk/archive/refs/heads/main.zip).
3. On a Mac, double-click the downloaded ZIP. On Windows, right-click it and choose **Extract All**.
4. Move the extracted folder to a permanent location, such as Documents. Do not work inside the ZIP.
5. Open the folder. You should see `README.md`, `AGENTS.md`, `package.json`, `src`, and `docs`. Hidden folders such as `.agents` must stay in place even if your file browser does not show them.

The extracted folder is usually named `clerk-main`. You can rename it to `Clerk` if you prefer.

## 2. Open the folder in your AI app

For ChatGPT desktop:

1. Install and open the [ChatGPT desktop app](https://learn.chatgpt.com/docs/quickstart), then sign in.
2. Select **Codex** from the ChatGPT dropdown. It gives the agent the local command tools this project needs.
3. Add or open a local project and select your extracted folder. The correct folder contains `AGENTS.md` and `package.json`.
4. If you have already created a project, open its menu, choose **Edit project → Add folder**, and select this folder. Make it the primary folder.
5. Start a chat in that project. Keep the task local so it can reach your archives.

A regular ChatGPT project with uploaded documents does not give the agent direct access to this folder or its command-line tools. [Official local-project instructions](https://learn.chatgpt.com/docs/projects#use-local-projects-for-folders-and-codebases), checked November 6, 2026. Labels and availability can vary with the app version and account.

For another agent, open this folder as its working directory. If it does not automatically read `AGENTS.md` or discover `.agents/skills/`, the setup message below tells it what to read. Plain chat or file-upload modes without command execution cannot run Clerk.

## 3. Ask the agent to set it up

Copy this whole message into the chat:

```text
Set up Clerk in this folder for me. Read AGENTS.md and docs/agent-install.md,
then follow the setup guide. Check the required tools and download the
provided medical libraries. Keep downloaded and generated files private.
Verify that search and source citations work before telling me it is ready.
Explain any steps I need to do in plain English.
```

The agent checks Node.js and pnpm, installs the project's dependencies, downloads the provided libraries, and builds a search index. If you need to install a system tool yourself, it should give you the relevant steps for your computer.

## The medical libraries are included

The three archive files are attached to the repository's [library release](https://github.com/ahmadhajji/clerk/releases/tag/library-snapshots-v1). You do not have to obtain them elsewhere. The source-code ZIP contains the instructions and retrieval tool; setup downloads the large archive files separately with `pnpm med download`. It does not scrape or log in to the publishers' websites.

The command puts them in `private/archives/`, verifies each file's byte size and SHA-256 hash, and reuses a matching existing file. Interrupted or corrupt downloads do not become installed archives. A different existing archive is preserved and reported rather than silently overwritten.

If you prefer to download them yourself, use the release assets with these filenames and put them, still zipped, in `private/archives/`. You can also use compatible archives you already have, but that is optional. Do not extract the library ZIPs by hand.

| Library | Filename inside `private/archives/` | Required database member inside that ZIP |
| --- | --- | --- |
| AMBOSS | `amboss-library.zip` | `amboss-library/amboss-2025.db` |
| UWorld | `uworld-library.zip` | `uworld-library/uworldstep1library-March-2026.db` |
| UpToDate | `uptodate.zip` | `uptodate/uptodate-medical-library.db` |

The databases must also match the supported tables and columns. Merely renaming an unrelated ZIP will not make it compatible. The agent should inspect [the adapters](../src/archives.ts) and [operations guide](operations.md) if the layout differs, then report the mismatch rather than modifying the importer during installation.

All three libraries are the default. To save download space, you can choose one supported library with `pnpm med download --source amboss`, `--source uworld`, or `--source uptodate`, then import only that source. The agent should report the reduced coverage.

Keep the downloaded ZIPs in place; source verification and image retrieval still need them. Do not attach extracted source images, citation text, or additional archive copies to issues or PRs.

### Private repository downloads

While this repository is private, the release files require authorized GitHub access. An anonymous download may report HTTP 404 even when you can see the release while signed in. Your agent can use an already authenticated GitHub CLI:

```sh
gh release download library-snapshots-v1 --repo ahmadhajji/clerk --pattern '*.zip' --dir private/archives
pnpm med download
```

The second command verifies the downloaded copies against the pinned identities without downloading them again. Do not use `--clobber` or replace existing files to bypass a mismatch. If your account lacks repository access, setup is not ready; ask the owner for access. A public repository with a published public library release can use the ordinary download command without GitHub authentication.

## 4. Let setup finish

The agent builds a local text search index. The first import can take a while and needs disk space. Do not start several imports at once. The agent should wait for the selected sources to finish and report any failed items.

Before saying "ready," it should demonstrate that it can:

1. Find a relevant passage in each library you supplied.
2. Open it and provide a working local source citation.
3. Verify that the passage matches the original archive content.

The test validates retrieval, not the medical accuracy of every future answer. Tests use synthetic fixtures; your own archive checks are a separate step.

## 5. Start studying

Ask:

> I always mix up nephritic and nephrotic syndrome.

The agent should retrieve from your installed libraries and explain the difference with citations. You do not need to name the skills. A source photo or comparison table should appear when useful and available, subject to your app's display capabilities.

For your next topic, start a new chat in the same project. Keep the folder and `private/` contents in place. Deleting or replacing the folder can remove your local libraries and index.

## Manual installation

Skip this section if the agent is doing setup. These are shell commands for macOS or Linux, run from the extracted folder. The end-to-end maintainer trials ran on Linux with Node.js **22.22.2** and pnpm **11.25.0**. Native Windows installation has not been validated; use an agent to handle Windows paths and commands, or use a configured WSL2 environment with the Linux steps.

1. Install Node.js 22.22.2 from [Node.js](https://nodejs.org/en/download) or use your existing Node 22 environment with built-in `node:sqlite` support. Pinning the tested version avoids uncertainty about older Node releases.
2. Install the pinned pnpm version if it is absent:

   ```sh
   npm install --global pnpm@11.25.0
   ```

3. Open a terminal in the extracted project folder and install dependencies:

   ```sh
   node --version
   pnpm --version
   pnpm install --frozen-lockfile
   pnpm check
   mkdir -p private/archives
   chmod 700 private private/archives
   ```

4. Download the provided libraries, then import them:

   ```sh
   pnpm med download
   pnpm med ingest
   pnpm med stats
   pnpm med audit
   ```

   To use only one library, add the same `--source amboss`, `--source uworld`, or `--source uptodate` to both the download and ingest commands. If you already have different compatible archives, skip the pinned download and import your own copies explicitly. Run one import at a time. Keep the archives and extracted databases after indexing: verification and image retrieval still need them.

5. In `stats`, check that each selected archive has a non-null `completed` value and indexed passages. Read the `failures` array. In `audit`, expect SQLite integrity `ok` and `matches: true` for each imported archive. Investigate failures rather than treating a completed scan as full coverage.
6. Try a search, then use an actual returned passage ID in the next two commands:

   ```sh
   pnpm med search "nephrotic" --source all --limit 1
   pnpm med open 'PASTE_RETURNED_PASSAGE_ID' --context 1
   pnpm med verify 'PASTE_RETURNED_PASSAGE_ID'
   ```

   Check that `verify` returns `verified: true` and that the citation file opens at the returned line. Keep the returned absolute path intact. If a search has no results, try another term from that library; no hit is not proof that a topic is absent.

7. Open this folder in your agent and ask it to read `AGENTS.md`. If its skills are not discovered automatically, explicitly ask it to read `.agents/skills/medlibrary/SKILL.md` and `.agents/skills/medlibrary-visuals/SKILL.md`. No global skill installation or MCP registration is required.

## If something goes wrong

| What you see | What to do |
| --- | --- |
| The agent cannot find `AGENTS.md` | Open the extracted project folder itself, not its parent or the ZIP. |
| The agent cannot run commands | Switch to a local agent mode with a terminal, such as Codex in ChatGPT desktop. |
| `pnpm` or `node` is not found | Ask the agent to check installation and restart the app after installing the tools. |
| `node:sqlite` is unavailable | Use the tested Node version. An older Node installation may still be first on the command path. |
| `Index missing. Run pnpm med ingest first.` | Finish library download and the selected import during setup. Do not repeatedly ingest during medical chats. |
| An archive is missing | Run `pnpm med download` during setup, or check the name and location of an optional manual copy. |
| A release download reports HTTP 404 | Check [private repository access](#private-repository-downloads). Do not report setup as ready without the files. |
| An existing file differs from the pinned release | Keep it intact. Use it as a custom compatible snapshot, or explicitly move it aside before downloading the provided version. |
| `Missing SQLite member` or a schema error | The archive does not match the supported layout. Do not just rename it. |
| The answer has no citations | Ask the agent to read `AGENTS.md` and follow the medical evidence skill. Confirm that setup passed. |
| An image does not appear | The asset may be missing, unsupported, or not displayed by your app. Ask for the available evidence and a text explanation. |
| A citation does not open | It belongs to the computer where retrieval ran. Keep the full local path and check that the file still exists. |

For help, share the command and a redacted error through [GitHub Issues](https://github.com/ahmadhajji/clerk/issues). Do not attach private archive content, citation text, source photographs, credentials, or patient information.
