# MedLibrary

A personal medical assistant workspace for T3. Open the **MedLibrary** project, start a thread with its default Codex provider, and ask a medical question. There is no website, embedding service, or additional API credential.

Example prompts:

- Why can serum potassium be high in DKA despite total-body potassium depletion? Compare the local sources and cite the passages.
- Compare SIADH and cerebral salt wasting. Show what the sources say about volume status.
- Explain nephrotic syndrome using UWorld only, then quiz me with a short original vignette.
- What can these snapshots establish about this treatment, and what needs current guidance?

The project-local `medlibrary` skill searches and opens actual passages before the assistant answers. Citation links open private local text files with source title, section, dates when available, archive identity, and neighboring context. The assistant can verify each passage against the copied source database.

Local archives are dated snapshots. UpToDate's name does not establish current clinical guidance. Unknown metadata stays unknown. Images, video, audio, and image-only graphics are not interpreted; readable graphic/table text is searchable. Imported content stays out of Git. Passage text read in T3 goes to the existing authenticated provider as part of the conversation.

See [operations](docs/operations.md), [AMBOSS comparison](docs/amboss-comparison.md), and [verification](docs/verification.md) for coverage, limitations, and reproducibility.
