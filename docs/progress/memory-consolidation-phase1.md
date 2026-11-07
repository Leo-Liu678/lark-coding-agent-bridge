# Memory Consolidation — Phase 1

Goal: align the bridge's offline memory pipeline (`src/dream/`, formerly 课堂精练)
with Anthropic's "The components of agent memory"
(https://www.anthropic.com/research/components-of-agent-memory), phase 1 only.

Worktree: `/home/leo/Work/codebase/.worktrees/bridge-memory-consolidation`
Branch: `feat/memory-consolidation` (from `main` f078fba)

## Milestones

| # | Milestone | Status | Output |
|---|---|---|---|
| M1 | Rename 课堂精练 → 记忆整合 (Memory Consolidation); 课前学习 → 外部学习 | done | 392f3dd — also the old deep-sleep step 记忆整合 → 记忆修订 to avoid the clash |
| M2 | Rewrite the extraction rules (P1-4): state what memory is for, leave salience to the model, keep verified failure lessons | done | c0bb53e + regression test in tests/unit/dream/proposal.test.ts |
| M3 | English design doc `docs/memory-consolidation.md` (article → bridge mapping, phased plan) + README pointers | done | docs commit |
| M4 | `pnpm ci:local` green, commits, report | done (1 pre-existing failure) | 1846/1847 tests pass; tests/process/claude-account-failover.test.ts times out identically on untouched main; typecheck + build green |

Not in phase 1 code (needs owner decisions): P0-2 config — private knowledge
repo to bind, `dreamTuning.skillLibrary`, whether Draft PRs to `cilab-skills`
are acceptable.

Not done without owner's go-ahead: merge to main, push, build in the main
checkout (it is on `feat/bot-menu-prefix` with uncommitted work), restart.

## Next step

Waiting for the owner: (1) merge to main / push / build / restart — main checkout is on `feat/bot-menu-prefix` with uncommitted work; (2) P0-2 config decisions.
