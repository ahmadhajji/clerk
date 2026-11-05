# Natural-question validation, 2026-11-05

The first delivery's DKA test explicitly requested three-source comparison, citations, and a missing-evidence check. It demonstrated the guided workflow. It did not establish that an ordinary question would trigger the same defaults, and it did not test original image display.

This update strengthens the permanent project defaults and adds working original-image/table tools. `AGENTS.md` defines the automatic behavior; the existing `medlibrary` skill handles evidence, and the new `medlibrary-visuals` skill handles useful presentation and source visuals. The user supplies the medical question without naming libraries, skills, citations, or output formats.

## Fresh T3 trials

All trials used the project's existing Codex provider, `gpt-6.1-sol`, in new root threads with no build conversation. The entire initial prompt for each trial is quoted below.

| Initial prompt | Observed behavior |
| --- | --- |
| "I always mix up nephritic and nephrotic syndrome." | Loaded both project skills; searched all three libraries; opened supporting passages; verified four passages; discovered source tables; produced a comparison diagram and a concise explanation citing all three local sources. |
| "How do I recognise plaque psoriasis?" | Loaded both skills; searched all three libraries; opened and verified evidence; retrieved an original UpToDate photograph; displayed it inline with provenance without being asked. Also consulted separately cited external clinical references. |
| "How would I recognise pityriasis rosea?" | Loaded both skills; searched all three libraries; opened and verified evidence; retrieved original AMBOSS and UWorld figures; previewed those actual local images in a returned PNG before displaying the pair with provenance; used absolute local citation targets. Also cited external clinical references separately. |

The first two trials exposed follow-through issues. The renal answer shortened some final citation targets to relative paths, and the psoriasis record did not show a pixel-inspection call before its photograph was described. The permanent skills were tightened to preserve exact absolute targets and require actual pixel inspection through an image viewer or the PNG returned by T3 preview. The third trial demonstrated preview-before-display and absolute citations. This is bounded observed behavior, not a guarantee about every future answer.

The renal trial's comparison was rendered through T3 `html_preview` and `html_render`; it was not merely described in text. The pityriasis trial likewise rendered two actual original figures, with image files and source receipts under `private/media/`. The source figures were not AI-generated.

Continue the trial threads if useful:

- Renal comparison: <t3-thread://v2/7ab3485c-a8c4-4859-be49-65dc39ac74ea/mcp:launch:50b3b92c7d16f49f21104f2e577dd17efe90443e0bb33b3f7ca8eb18ea407f93>
- Plaque psoriasis: <t3-thread://v2/7ab3485c-a8c4-4859-be49-65dc39ac74ea/mcp:launch:5abbd5eb4062a427d98abe76e24589fd236c2ad1d9b3c095982737265db882d6>
- Pityriasis rosea: <t3-thread://v2/7ab3485c-a8c4-4859-be49-65dc39ac74ea/mcp:launch:9e566101b40ea0302496260683b3d83a9ac7218be0066f7fd1abab83b51fba3e>

Private activity receipts are retained in `private/evidence/natural-question-activity.json` and `private/evidence/natural-rosea-activity.json`. These preserve the prompts, executed retrieval/verification/media commands, and visual-tool calls; long timeline items may be truncated and can be reopened in T3. The validation record distinguishes those bounded receipts from complete source articles.

## Tool validation

`pnpm check` passes strict TypeScript and 16 behavior tests. New media tests cover all three source formats, exact original bytes, private source-provenance receipts, stable image paths, section association, missing and ambiguous locators, SVG/active-format refusal, changed source HTML refusal, readable source tables, expanded merged cells, and relative images inside standalone HTML ZIP members. A bounded source review found the standalone-HTML relative-path defect; it was fixed and covered by regression before delivery.

Real original image bytes from AMBOSS and UWorld ZIP members and an UpToDate embedded graphic row independently matched the exported files exactly. `private/evidence/real-media-verification.json` retains hashes and source identities. `pnpm verify:real` still passes the original text retrieval, source filtering, citation-line, missing-evidence, and source hash checks after the code changes.

No reingestion, embedding service, global configuration, or vntrcl operation was needed. All new imports are selected originals written under this workspace's ignored owner-only private folder. Text indexing still excludes image pixels; on-demand opening and model inspection are separate from an OCR index or corpus-wide image search. Audio/video remains unsupported.

## AMBOSS comparison boundary

The AMBOSS-inspired behavior remains grounded in official documentation: retrieve library content before answering and link supporting articles. Live AMBOSS GPT answers were blocked by login in the earlier investigation. Its exact style, ranking, hidden instructions, private implementation, and visual behavior were not established. REA inspected a copied library ZIP, not GPT internals. Three-source comparison, passage verification, proactive source visuals, and these project skills are MedLibrary design choices.
