# Manual installation

Use this guide if you want to run the commands yourself. The [quick start](../README.md#quick-start) lets your agent obtain the project and libraries for you.

First [download the project ZIP](https://github.com/ahmadhajji/clerk/archive/refs/heads/main.zip), extract it, and open a terminal in the extracted folder.

## Install and verify

These are shell commands for macOS or Linux, run from the extracted folder. The end-to-end maintainer trials ran on Linux with Node.js **22.22.2** and pnpm **11.25.0**. Native Windows installation has not been validated; use an agent to handle Windows paths and commands, or use a configured WSL2 environment with the Linux steps.

1. Install Node.js 22.22.2 from [Node.js](https://nodejs.org/en/download) or use your existing Node 22 environment with built-in `node:sqlite` support. Pinning the tested version avoids uncertainty about older Node releases. Also install Python 3 if `python3 --version` is unavailable; the included tests use it to create small synthetic ZIP files. Medical retrieval itself runs in Node.
2. Install the pinned pnpm version if it is absent:

   ```sh
   npm install --global pnpm@11.25.0
   ```

3. Open a terminal in the extracted project folder and install dependencies:

   ```sh
   node --version
   pnpm --version
   python3 --version
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

## Archive formats and optional custom sources


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

The project ZIP and provided library downloads are public. You do not need a GitHub account, GitHub CLI, or download token. The setup message gives your agent permission to fetch them directly.

## If something goes wrong

| What you see | What to do |
| --- | --- |
| The agent cannot find `AGENTS.md` | Open the extracted project folder itself, not its parent or the ZIP. |
| The agent cannot run commands | Switch to a local agent mode with a terminal, such as Codex in ChatGPT desktop. |
| `pnpm` or `node` is not found | Ask the agent to check installation and restart the app after installing the tools. |
| `node:sqlite` is unavailable | Use the tested Node version. An older Node installation may still be first on the command path. |
| A test reports that `python3` is missing | Install Python 3 and confirm `python3 --version` works, then rerun `pnpm check`. |
| `Index missing. Run pnpm med ingest first.` | Finish library download and the selected import during setup. Do not repeatedly ingest during medical chats. |
| An archive is missing | Run `pnpm med download` during setup, or check the name and location of an optional manual copy. |
| A release download reports HTTP 404 | Check that the [library release](https://github.com/ahmadhajji/clerk/releases/tag/library-snapshots-v1) and the named file are available. The provided files need no login. Report a missing file to the owner and do not call setup ready. |
| An existing file differs from the pinned release | Keep it intact. Use it as a custom compatible snapshot, or explicitly move it aside before downloading the provided version. |
| `Missing SQLite member` or a schema error | The archive does not match the supported layout. Do not just rename it. |
| The answer has no citations | Ask the agent to read `AGENTS.md` and follow the medical evidence skill. Confirm that setup passed. |
| An image does not appear | The asset may be missing, unsupported, or not displayed by your app. Ask for the available evidence and a text explanation. |
| A citation does not open | It belongs to the computer where retrieval ran. Keep the full local path and check that the file still exists. |

For help, share the command and a redacted error through [GitHub Issues](https://github.com/ahmadhajji/clerk/issues). Do not attach private archive content, citation text, source photographs, credentials, or patient information.
