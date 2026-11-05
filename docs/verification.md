# Verification, 2026-11-05

The working workspace is `/home/ahmad/GitHub/medlibrary`, registered in T3 as **MedLibrary**. The project defaults to the existing authenticated Codex provider, `gpt-6.1-sol`, and local root threads. The repository is private at `https://github.com/ahmadhajji/medlibrary`. The imported content is excluded from Git.

Start or continue here: <t3-thread://v2/7ab3485c-a8c4-4859-be49-65dc39ac74ea/mcp:launch:cff6d35b7586def99a247c2db9dc68f613334635e77b89ec95bcb845d1b924dd>.

## Coverage

| Library | Article/topic rows indexed | Additional text records indexed | Failed items | Opaque ZIP media excluded |
| --- | ---: | ---: | ---: | ---: |
| AMBOSS | 1,390 | 0 | 0 | 7,893 images |
| UWorld | 1,176 | 1,652 HTML table/graphic members | 0 | 4,001 image/audio/video members |
| UpToDate | 22,214 | 39,785 graphic/table HTML rows | 0 | Image pixels embedded in graphic rows are not interpreted |

There are 540,100 searchable passages across 66,217 text records. Counts describe this archive import, not the publishers' full or current libraries. Graphic HTML may contain only captions or labels; indexing its text does not establish image interpretation. The UpToDate database also contains embedded image payloads, which the importer does not select or index.

All three source scans completed. The index is about 1.7 GiB; the entire private import is about 7.9 GiB including the three copied archives and canonical extracted databases. A sampled active ingestion process used about 194 MiB RSS; this is a sample, not a measured peak. No model or embedding calls occur during ingestion.

## Tests and receipts

- `pnpm check` passes strict TypeScript checking and ten automated behavior tests. Tests create real temporary ZIPs and SQLite databases. They cover all source adapters, heading/date/URL parsing, table text, no invented metadata, source filters, bounded missing evidence, resumability and idempotency, changed-document invalidation, FTS cleanup, actual citation line accuracy, immutable citation files across context changes, source-hash mismatch detection, oversized HTML failure reporting, missing mandatory source-schema refusal without deleting prior articles, read-only source connections, and ZIP traversal refusal.
- Full real ingestion completed with zero failed rows or members. A real UWorld reingestion preserved all document counts and passage identities. Synthetic tests rerun all three libraries without duplicates.
- `pnpm verify:real` exercised real source-filtered and combined searches, opened evidence and checked the actual citation lines, verified an article from each source against its copied database, verified readable UpToDate graphic and UWorld HTML members, and confirmed no hit for the fictional drug query. `private/evidence/real-retrieval.json` retains the results. The initial per-source search/open/verify samples took 20 to 132 ms inside the warmed process; these are samples, not a general latency guarantee.
- `pnpm med audit` returned SQLite integrity `ok` and matched the recorded SHA-256 for all copied ZIPs. `private/evidence/audit.json` retains the result.
- A fresh T3 thread, with no build conversation history, completed a natural DKA potassium explanation across all three local sources. It loaded `.agents/skills/medlibrary/SKILL.md`, searched, opened supporting passages, verified five passages against source records, and cited actual local files. It identified the source qualification around acidosis rather than inventing complete agreement. It preserved ambiguous AMBOSS dates and unknown UWorld dates and named the snapshot limitation.
- The same fresh thread used exact-name, phrase, and focused variant queries for a fictional drug. It reported efficacy as unsupported by the searches, without equating no matches with inefficacy or exhaustive absence. It reported that `medlibrary` was present in its startup skill catalog. The activity record independently shows the skill file being read and the retrieval workflow being executed. `private/evidence/fresh-t3-thread.json` retains the thread's final answer and initial activity receipts. The validation thread is ready for continued chat.

Two citation bugs found during testing were corrected before completion: multiline preceding context now produces the correct selected line, and citation files are addressed by their full content hash so a later context choice preserves earlier links. Regression tests cover both.

## Protected repository

The protected repository was verified at `/home/ahmad/GitHub/vntrcl/vntrcl-app`, at detached HEAD `2b6bcee8bf9eef72a84c410f790db10837bf6942`. Before/after checks found unchanged HEAD, detached-branch state, Git configuration hash, and complete Git status output. All 1,321 tracked regular files retained their SHA-256 hashes. The three original library ZIPs matched their copied ZIPs by SHA-256 after the work. Existing untracked files were left in place; nothing was reverted or cleaned. No application commands, dependency installation, extraction, indexing, service changes, database operations, or worker operations ran inside vntrcl. The receipts are `private/evidence/vntrcl-before.json` and `private/evidence/vntrcl-after.json`.

## Limitations and durable follow-up

The installed REA skill was found, read fully, and used for static inspection of the copied UpToDate ZIP. The session was closed. Its evidence and limits are documented in `docs/operations.md`.

The live AMBOSS GPT comparison remains incomplete. Normal browser navigation reached ChatGPT login, so no representative GPT answers were tested. Official documented behavior was studied and is distinguished from workspace design assumptions in `docs/amboss-comparison.md`. Future live comparison prompts are recorded there. No hidden prompts, private implementation details, credentials, or account changes were requested.

Lexical retrieval needs synonyms and narrower queries for some concepts. The initial delivery indexed text and did not open source images. The natural-chat update adds on-demand original image/table retrieval and model inspection before display; it does not add an OCR index or audio/video transcription. This is a working local snapshot assistant, not a claim of current clinical recommendations, complete source coverage, or universal answer accuracy. The original fresh-thread test explicitly requested three-source comparison and citations, so it establishes a guided workflow rather than proving unprompted defaults. See `docs/natural-chat-validation.md` for the separate natural-question tests.

Imported material and indexes stay local. Passages opened in T3 are included in the conversation processed by the authenticated provider. No additional authentication, service account, paid backend, web app, or global agent behavior was introduced.
