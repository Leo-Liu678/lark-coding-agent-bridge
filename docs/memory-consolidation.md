# Memory Consolidation (记忆整合)

Memory Consolidation is the bridge's offline memory pipeline (`src/dream/`): after
conversations end, it reads them back and turns what is worth keeping into
long-term memory, topic notes and skills — then keeps that memory tidy by
merging duplicates, revising conflicts and archiving what nobody reads. Every
change lands as a Draft PR (or a push, if configured) and takes effect only once
it is merged.

User-facing setup and commands are in the README ("Memory Consolidation" /
「记忆整合」). This document explains **why it is built this way**, using
Anthropic's engineering post
[*The components of agent memory*](https://www.anthropic.com/research/components-of-agent-memory)
(Nov 2026) as the reference, and tracks the phased plan for closing the gaps.

## Naming

| Term | Meaning here |
|---|---|
| **Memory Consolidation** (记忆整合) | The feature as a whole. The common industry term for turning raw experience into durable, organized memory; Anthropic calls its version *dreaming*. Formerly 课堂精练. |
| `dream` | Internal code name (module, `dream/<batch>` branches, `dreamTuning`). Unchanged, so existing PRs and config keep working. |
| 浅睡 / REM / 深睡 | Stages of one round: recall counts / grouping recurring themes / writing, revising and archiving. |
| 记忆修订 (memory revision) | The deep-sleep step that works off merge / conflict / stale flags on memory entries (`consolidate.ts`). Formerly also called 记忆整合. |
| 外部学习 (external learning) | Learning from other bots' shared libraries (`external.ts`). Formerly 课前学习. |
| `/practice` | The admin command. Unchanged. |

Why "consolidation" rather than the alternatives: *reflection* covers only
extracting conclusions; *sleep-time compute* names only when the work happens;
*dreaming* is a metaphor (and an Anthropic product name). Consolidation names
what the pipeline actually does — encode, strengthen on recurrence, integrate,
revise and forget.

## How the bridge maps to the article

The article describes four layers of agent memory, from bottom to top:
**transcripts** → **memory notes** → **representations** (e.g. a linked wiki) →
**injected context** loaded into every session, with *dreaming* moving and
correcting information between them.

| Layer (article) | In the bridge |
|---|---|
| Transcripts | The agent CLI's own session transcripts (Claude Code JSONL, Codex rollouts), read by exact session handle. Only user requests and final answers are read; tool calls are not. |
| Memory notes | `knowledge/MEMORY.md` (profile-wide), `knowledge/chats/<scope>.md` (per chat), `notes/<scope>/<topic>.md` (topic notes). |
| Representations | Skills (`skills/<name>/SKILL.md`) as procedural memory; topic notes grouped per chat family. No cross-linked wiki yet. |
| Injected context | `<bridge_knowledge>`: profile + chat memory (10,000-char budget), skill index (16,000-char budget), notes index (names only, ≤120), plus per-message `<relevant_notes>` (BM25). Sent in full once per conversation, then as a version stub. |

### Already aligned

- **A small top layer.** Only memory entries and *indexes* are injected; note and
  skill bodies are read on demand. The article: longer instruction files reduce
  adherence, so the injected layer must stay small.
- **Promotion is gated.** Profile-wide memory needs an admin saying it in their
  own message; everything else stays in the originating chat. The article warns
  that a bad note promoted to injected context propagates to every session.
- **Recurrence before writing.** Inferred notes wait in a candidate pool until
  they recur on another day / in another conversation, or their target note is
  read.
- **Forgetting by use.** Notes unread and unchanged for 30 days move to
  `archive/notes/`; the notes index ranks by recent reads.
- **Human review.** Every change is a Draft PR by default; a change touches at
  most 25% of a file's entries.

### Phase 1 (this change)

1. **Renamed** 课堂精练 → 记忆整合 / Memory Consolidation (see *Naming*).
2. **Extraction rules say what memory is for.** The article found that, for
   strong models, explaining the purpose of memory and leaving salience to the
   model works better than fixed rules — and that a rule such as "record only
   failures" removed much of the gain (Opus 5: −0.234 in memory gain). The scope
   prompt now opens with the purpose ("writing a note predicts it will be needed
   again; marking it verified lets a future agent rely on it without
   re-checking") and a single test: *will a future agent ask one question less,
   or avoid one pitfall?*
3. **Verified failure lessons are kept.** The article's learning loop is
   *record the failure → form theories → test → turn the result into a rule*.
   The old rules excluded "failed hypotheses" wholesale; now an unverified guess
   is still dropped, but "tried X, it failed because Y, use Z instead" is kept.
   A failure with no cause or alternative is not.
4. **Exact values are preserved.** Commands, IDs and numbers are kept verbatim.
   In the article, when several agents rewrote one shared table only 41 of 57
   contract facts survived; one page per contract with terms quoted word for
   word kept all 57.

### Next phases (proposed, not implemented)

| Item | Article point | Gap today | Proposal |
|---|---|---|---|
| Single memory entry point | Memory layers + purpose-driven writes | Claude Code's own auto memory runs alongside bridge memory. All bridge runs share one workspace, so one auto-memory store is loaded in every chat, including group chats with guests; it is never consolidated and Codex cannot see it. | Give the agent a scoped write path into bridge memory, migrate existing entries by scope, then set `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1` for bridge-spawned Claude runs. |
| Ledger as working memory | Opus 5.5 kept a small folder of current goal + next steps, rewritten as it played | Task ledgers are used only to resume interrupted runs. | Remember the active ledger per scope and inject its path while the task is open; add a "verified findings / pitfalls" section; feed finished ledgers into consolidation. |
| Verify against transcripts | Dreaming tests notes against the original transcripts (the Mt. Moon fix) | Consolidation sees truncated request/answer excerpts only, no tool results; note entries carry no provenance on disk; revision works on note text alone. | Store provenance (session, turn, date, evidence) with each entry; add a review step that re-checks the most-read and flagged notes against the original transcript segment, tool results included (masked). Checking everything is impractical, so prioritize by reads. |
| Notes as a navigation map | Wiki + search beat search alone (61% vs 53%) and saved ~20k tokens per question | The notes index is names only. | One-line summary per note in the index (with its own budget), `[[topic]]` links, broken-link repair during deep sleep. Only worth it once notes exist. |
| Searchable transcripts | Transcripts are the foundation layer | No scope-aware way for the agent to search past conversations. | A `history search --scope` entry point returning masked excerpts from the current scope only. |

Deferred, with reasons:

- **Re-inject after compaction** (`SessionStart` hook, `compact` matcher): no
  bridge session has compacted so far, and the bridge system prompt survives
  compaction anyway.
- **Demote over-budget memory instead of truncating:** truncation is already
  flagged (`truncated`) and memory revision tidies at 80% of the budget.
- **Trim the system prompt:** about 9,400 characters, cached; low-frequency
  sections are about 3,000 characters.

## Trade-offs to keep in mind

- **Cost:** each round runs one read-only agent turn per scope (up to 20
  sessions / 120,000 characters / 20 minutes by default) on the profile's own
  agent quota; automatic rounds wait for idle hours and quota under 80%.
- **Review load:** an unreviewed PR pauses automatic rounds (`maxOpenPrs`).
- **Data flow:** chat content distilled into notes lands in the knowledge
  repository, which must be private. Updates to an existing skill go back to the
  library that skill came from, which may be a shared team repository. Set
  `dreamTuning.holdSkills: true` to keep every skill proposal local
  (`dream/held-skills/<batch>/`) until the team library may be written to.
- **Accuracy:** until transcript verification exists, "verified" is judged from
  final answers, so review is the main safeguard.
