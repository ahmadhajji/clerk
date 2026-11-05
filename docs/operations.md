# Operations and provenance

## Workspace and source custody

This workspace is `/home/ahmad/GitHub/medlibrary`, separate from the verified protected repository `/home/ahmad/GitHub/vntrcl/vntrcl-app`. The three ZIPs were copied from that repository's `Medical libraries/` folder into `private/archives/`. Retrieval and repeat ingestion use only these copies. There is no runtime dependency on vntrcl.

All imports, extracted SQLite databases and WAL sidecars, indexes, generated passage files, logs, and custody receipts live under owner-only `private/`. `.gitignore` excludes them. No existing services or workers were changed. The selected T3 provider uses the owner's existing authentication; no paid service or API credential was added.

The initial host inspection found Node 22.22.2, pnpm 11.25.0, Python 3, unzip, pdftotext, gh, and REA on HomeLab. Disk had 64 GB free; RAM had about 2.2 GiB available with swap in use. Ingestion processes one database row or bounded HTML member at a time. SQLite uses a 16 MiB index cache and a 4 MiB source cache, with memory mapping disabled. No embeddings are used.

## Commands

```sh
pnpm install --frozen-lockfile
pnpm check
pnpm med stats
pnpm med search "SIADH volume" --source all
pnpm med open 'PASSAGE_ID' --context 1
pnpm med verify 'PASSAGE_ID'
pnpm med media 'PASSAGE_ID' --kind image --scope section --limit 3
pnpm med audit
```

Node's built-in SQLite module is experimental in Node 22 and emits a warning. The lockfile pins the TypeScript tooling and HTML/ZIP parsers. esbuild's installation script is allowed only in this workspace's `pnpm-workspace.yaml`. No global agent or MCP settings are needed.

## Ingestion

```sh
pnpm med ingest
pnpm med ingest --source uworld
```

Keep a single ingestion writer. Do not start ingestion during a medical chat. An interrupted ingestion can be rerun. Each document and its FTS passages commit in one transaction. A repeated document with matching HTML hash, archive hash, and parser version is reused. Changed documents replace their passages. Passage IDs include a content hash, so old IDs cannot silently resolve to different document text. Source completion is recorded only after database rows and ZIP members have been inventoried. Stale documents are pruned only after that complete scan. Search can see a partially updated source during ingestion; check `stats.archives[].completed` before accepting a newly built or replaced snapshot.

For a new archive, place it in `private/archives/` using the expected name. A different database member path or schema requires an explicit adapter change in `src/archives.ts` or `src/library.ts` and tests. The importer checks the fixed `Docs` and optional `Graphics` tables and selects known columns. It does not load SQLite extensions or execute source HTML. Unknown schemas fail visibly. Extraction preserves only allowlisted databases and sidecars in a hash-specific directory; arbitrary ZIP paths never become filesystem destinations. Absolute paths, traversal, symlinks, encryption, excessive HTML size, and excessive database size are refused. The ZIP reader validates entry sizes; archives are hashed and inventory identity is retained.

Supported content is HTML in database article rows, readable `Graphics.imageHtml` rows, and standalone HTML ZIP members. The parser removes scripts/styles/head metadata text, preserves headings, table cell separators, and image alt text. Chunks carry section names, anchors when present, and 500 characters of overlap within sections; opening adds neighboring passages across section boundaries. Tables may still need adjacent context. Image pixels, audio, video, databases' prebuilt search indexes, and base64 image payloads are not indexed. The index's `members` and `documents` tables record per-item status and reasons. `stats` reports grouped unsupported items and individual failures.

Article provenance includes source, real document title, database table and primary key or HTML member, archive/member identity, archive SHA-256, full HTML SHA-256, original document path, explicit canonical/og:url when present, section/anchor, and available labeled update/publication dates verbatim. No article URL is inferred from an ID, slug, media URL, bibliography, or filename. Placeholder dates are discarded; ambiguous date ordering remains unnormalized. Archive labels such as `amboss-2025` and `March-2026` remain provenance, not asserted article dates.

Search is SQLite FTS5 with Porter stemming and weighted titles/sections. It is lexical, so abbreviations and synonyms may require additional queries. A search across all libraries returns a bounded set from each library. A citation file is a selected passage plus neighbors, not a full-article export. `verify` re-parses the source and compares the document hash, passage text, section, and anchor. `audit` rehashes archive bytes and runs SQLite integrity checks.

## Natural questions and source visuals

`AGENTS.md` now explicitly makes retrieval, verification, internal source comparison, citations, and useful visual selection the assistant's default work. The user can ask an ordinary medical question without naming libraries or output formats. `.agents/skills/medlibrary/SKILL.md` carries the evidence procedure; `.agents/skills/medlibrary-visuals/SKILL.md` carries the visual procedure. Both are discoverable project-local skills, with no global behavior changes.

The `media` command reads the exact copied source document behind a passage, checks its HTML hash, and discovers its image references, linked UpToDate graphic rows, and inline tables. It resolves AMBOSS and UWorld relative references to actual ZIP members, decodes UpToDate embedded graphic bytes, and writes only selected originals into owner-only `private/media/`. No reindex or bulk image extraction is required. Missing or ambiguous members and unsupported active formats remain unavailable. The command makes no network calls and never executes source JavaScript. Image file extensions come from actual JPEG, PNG, GIF, or WebP signatures, rather than trusting a misleading filename.

Use `--scope section` first, then `--scope document` if the relevant figure is elsewhere in the same article. `--kind image`, `--kind table`, or `--kind all` limits candidates. The default limit is three, with a maximum of five. Output preserves the figure's real title or locator, caption when present, section, source document hash, archive hash, exact member or graphic-row identity, image SHA-256, and a local provenance citation. Extracted files and provenance receipts are content-addressed to preserve earlier references. The assistant inspects an image before including its exact Markdown embed in T3.

Source tables are selectable Markdown excerpts capped at 20 rows, 12 columns, and about 7,000 characters. Merged cells are expanded with labels preserved and reported; excerpts report truncation. The assistant can also build a small cited comparison table from verified passages. These are two distinct forms of evidence: an extracted source table and an original synthesis. Pixel content remains outside the text index. No OCR index or audio/video transcription is provided.

## Research record

The full installed REA skill was read at `/home/ahmad/.agents/skills/reverse-engineer-anything/SKILL.md`, version 37. REA opened the copied UpToDate ZIP and inspected its artifact graph without executing content. Evidence `ev_1e9483b28be728a1ce73e5679211248d0989bb80378c3268318e7cfecf41f194` and manifest `agm_8594b67169a12ab01a7481b105f1a4d57e2b05ce5881bca59c3e7e08ef4396b1` established the ZIP and contained database identities. The complete inline record is retained in `private/evidence/rea-inspection.json`. REA covers central-directory entries and static package identity; it does not establish medical accuracy or runtime behavior. The session was closed. Normal SQLite inspection established source schemas.

Project skills use `.agents/skills/`, following [official Codex skills documentation](https://developers.openai.com/api/reference/cli). Fresh T3 thread validation checks actual discovery and use. See `docs/verification.md` for the result.
