# MedLibrary

A personal medical assistant workspace for T3. Open the **MedLibrary** project, start a thread with its default Codex provider, and ask a medical question. There is no website, embedding service, or additional API credential.

Example prompts:

- Why can potassium be high in DKA if the patient is losing potassium?
- I always confuse nephritic and nephrotic syndrome.
- Why do red cells look different in iron deficiency and thalassemia?
- How do I tell SIADH from cerebral salt wasting?

You do not need to name the libraries, request citations, or ask for a table or image. The project-local `medlibrary` skill searches all three sources, opens and verifies relevant passages, and compares their evidence before answering. It produces a focused explanation with citations and meaningful source differences. An explicit request such as "use UWorld only" narrows the source scope.

The `medlibrary-visuals` skill chooses compact comparison tables or useful original source images automatically. It discovers visuals associated with retrieved passages, checks the source association and caption, and inspects images before displaying them inline with provenance. Citation links open private local files with source title, section, dates when available, archive identity, and neighboring context.

Local archives are dated snapshots. UpToDate's name does not establish current clinical guidance. Unknown metadata stays unknown. Text retrieval remains lexical. Original supported images are opened on demand; there is no corpus-wide image search, OCR, audio/video transcription, or guarantee that every source image is available. Imported content stays out of Git. Passages and images read in T3 go to the existing authenticated provider as part of the conversation.

The first validation explicitly requested source comparison and citations. It established that the workflow could run, not that an ordinary natural question would trigger every default. Natural-question validation is recorded separately in the verification notes when completed.

See [operations](docs/operations.md), [AMBOSS comparison](docs/amboss-comparison.md), and [verification](docs/verification.md) for coverage, limitations, and reproducibility.
