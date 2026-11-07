# Memory Consolidation — Phase 1

Goal: align the bridge's offline memory pipeline (`src/dream/`, formerly 课堂精练)
with Anthropic's "The components of agent memory"
(https://www.anthropic.com/research/components-of-agent-memory), phase 1 only.

Shipped to `main` at c962478 (rebased onto origin/main a2dfac4 together with `feat/bot-menu-prefix`), pushed to origin, built in the main checkout.

## Milestones

| # | Milestone | Status | Output |
|---|---|---|---|
| M1 | Rename 课堂精练 → 记忆整合 (Memory Consolidation); 课前学习 → 外部学习 | done | 392f3dd — also the old deep-sleep step 记忆整合 → 记忆修订 to avoid the clash |
| M2 | Rewrite the extraction rules (P1-4): state what memory is for, leave salience to the model, keep verified failure lessons | done | c0bb53e + regression test in tests/unit/dream/proposal.test.ts |
| M3 | English design doc `docs/memory-consolidation.md` (article → bridge mapping, phased plan) + README pointers | done | docs commit |
| M4 | `pnpm ci:local` green, commits, report | done (1 pre-existing failure) | 1846/1847 tests pass; tests/process/claude-account-failover.test.ts times out identically on untouched main; typecheck + build green |
| M5 | `dreamTuning.holdSkills`: keep skill proposals local, never touch the team skill library | done | c962478 + integration test |
| M6 | P0-2 config: private repo `Leo-Liu678/leocub-knowledge` created; `dreamTuning.skillLibrary=cilab-skills`, `holdSkills=true` written to config.json | done | backup `config.json.bak-20261107-dream` |

Owner decisions (2026-11-07): knowledge repo under the owner's GitHub; new skills target `cilab-skills`; no PRs to team repos for now (→ holdSkills).

Previously open (needs owner decisions): P0-2 config — private knowledge
repo to bind, `dreamTuning.skillLibrary`, whether Draft PRs to `cilab-skills`
are acceptable.

Not done without owner's go-ahead: merge to main, push, build in the main
checkout (it is on `feat/bot-menu-prefix` with uncommitted work), restart.

## Next step

1. Restart the `claude` profile so the new build (holdSkills) is loaded — owner's call.
2. Owner sends `/knowledge bind https://github.com/Leo-Liu678/leocub-knowledge.git` in the DM.
3. Turn on 记忆整合 in `/config` (leave 自动整理 off), run `/practice run` once, review the first Draft PR.
