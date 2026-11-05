# AMBOSS GPT comparison

Inspected on 2026-11-05. The documented comparison is complete within the sources below. The live response comparison is incomplete because the available browser session required ChatGPT login.

## Evidence and boundaries

**Documented, not independently observed in answers.** The [official AMBOSS GPT support article](https://support.amboss.com/hc/en-us/articles/33872741080081-AMBOSS-GPT) says the GPT searches the AMBOSS library before answering and uses the returned information. Answers link relevant articles for verification and further reading. Article access depends on the reader's AMBOSS account. It can answer in the user's language, with a warning that translation may introduce errors. The page describes email authorization and usage limits. Its current banner announces discontinuation on December 11, 2026; that is a statement on AMBOSS's page, not an independently verified platform-wide policy. We do not inherit its claim of up-to-date content for local archives.

**Observed in normal browser use.** T3 preview opened `https://go.amboss.com/gpt`, which resolved to `https://chatgpt.com/g/g-Jv4qOKRF5-amboss-medical-knowledge`. It then redirected to the ChatGPT login page with the visible heading "Log in or sign up". No question was submitted, no authorization was attempted, and no hidden prompts, credentials, or implementation details were requested. The tab was closed. Preview initially reported no active tab but successfully opened one, so a second browser was unnecessary.

**Related product documentation, not GPT behavior.** The [AI Mode Learning FAQ](https://support.amboss.com/hc/en-us/articles/43601233276689-AI-Mode-Learning-FAQs) describes concept explanations, comparisons, exam reasoning, follow-up oral-exam practice, and links to learning resources. It explicitly contrasts the older GPT's single-search answer with AI Mode's multiple retrieval passes. It also warns that AI can make mistakes and asks users to verify information. These are documented capabilities and limitations of the successor product; they do not establish the older GPT's exact response format or uncertainty policy.

The [official introductory learning page](https://www.amboss.com/us/knowledge/explore-ai-mode-learning) was discoverable through search with a displayed update date of June 18, 2026. Its examples include explaining uploaded slides, identifying key points, quizzing, and following citations. Direct opening failed, so this secondary corroboration was limited to the search extract.

## Behavior to reproduce and extend

| Dimension | Evidence status | MedLibrary choice |
| --- | --- | --- |
| Retrieval | GPT documentation explicitly requires an AMBOSS library lookup before answering. Exact ranking and passage selection are unknown. | Search the requested local libraries, open the actual passages, and retry with synonyms or narrower concepts when coverage is weak. |
| Explanation | GPT's exact style was not observed. The related learning product documents explanations, comparisons, and question reasoning. | Answer directly at clinical-year student level. Explain mechanisms and discriminating findings when useful. Expand on request. |
| Citations | GPT documentation promises relevant article links. Passage-level accuracy was not live-tested. | Cite the retrieved source, real title, local passage locator, and preserved archive/member identity. Include an original URL or date only when present in imported evidence. |
| Follow-up | GPT's follow-up behavior is unknown. Related AI Mode documentation describes oral-exam follow-ups and study next steps. | Maintain the student's question context. Retrieve again when a follow-up introduces a new factual claim. Offer a targeted comparison or short quiz when useful. |
| Uncertainty | The GPT page warns about translation errors. Its behavior when retrieval is empty was not observed. | Name missing evidence, dated snapshots, and meaningful disagreements. Label general model knowledge separately. Do not convert a failed search into a claim of absence. |
| Multiple sources | The documented GPT searches AMBOSS; cross-library synthesis was not established. | Compare actual AMBOSS, UWorld, and UpToDate passages. Distinguish exam conventions from clinical recommendations without inventing agreement. |

These workspace choices are our own design. They do not reconstruct AMBOSS's private prompt or internal architecture. SQLite lexical retrieval, local citation IDs, the three-library workflow, and snapshot warnings are implementation decisions, not observed AMBOSS features.

## Live comparison still to run

If the user later opens an authenticated GPT session, compare these normal prompts without changing account state:

1. Explain why diabetic ketoacidosis can present with a normal or elevated serum potassium despite total-body potassium depletion. Check whether the answer retrieves, explains the mechanism, and links supporting material.
2. Compare SIADH and cerebral salt wasting. Follow up with a request to identify the decisive clinical distinction and the source supporting it.
3. Ask about a deliberately fictional drug, "medlibrary-test-unknown-47", and request evidence. Check whether the GPT admits a retrieval gap rather than fabricating a citation.

Record the visible answers and citation targets, including any retrieval failure or external-service authorization boundary. These probes remain unrun and must not be reported as observed behavior.
