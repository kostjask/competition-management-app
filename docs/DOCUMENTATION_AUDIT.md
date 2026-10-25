# Documentation audit — 2026-10-25

Scope: all 40 original repository Markdown files, including agent profiles,
untracked UI specifications and concurrent scope-integrity documentation. Reviewed
claims against manifests/scripts, route composition, shared schemas, controllers,
auth/config/error/storage code and frontend routes. No application behavior,
database, deployment or release gate was changed by this audit.

## Findings and changes

| Finding | Resolution |
| --- | --- |
| Agents were required to load a 91 KB plan containing history, audits and future implementation details | Short checkpoint plus task-specific roadmap files; one location for task checkboxes and milestone gates |
| Repeated API behavior and long test narratives made unrelated resources expensive to read | API index links to 11 resource contracts; TESTING and coverage JSON own commands/evidence |
| Product journeys repeated screen/flow requirements | Short outcome guide; detailed F01–F10 and grouped S01–S17 specifications preserved in separate files |
| Setup/storage/env guides implied working SMTP/cloud providers, conditional credential checks, configured CORS/rate limits and guaranteed cleanup/backups | Replaced with source-verified active/unused settings, local storage behavior and explicit pending tasks |
| Controller examples used removed imports/mounts, invented fields, raw Prisma responses, unsafe mocks and nonexistent test tooling | One concise conventions guide links to working code; obsolete example filenames remain compatibility pointers |
| Error guide omitted semantic feedback and repeated obsolete Express assumptions | Updated global envelope, reason/issue rendering and current handler behavior |
| Role/database guides described pre-fix scope foreign keys as current | Aligned with ADR-008 technical implementation, preserving mandatory deployment provenance review |
| Auth guide omitted implemented success messageId fields; ADR statuses still said Phase 1 pending | Reconciled current schema/status; historical decision context stays explicitly historical |
| Specialist agent profiles duplicated repository policy and assumed tools/agents or automatic latest upgrades | Refer to root instructions, pinned versions and actual environment delegation policy |
| Dated reports could be mistaken for current next actions or fresh test results | Added historical banners; preserved underlying evidence and rollout cautions |

## Original-file coverage

| Files / group | Disposition |
| --- | --- |
| AGENTS, DEVELOPMENT_PLAN, root README | Condensed entry path; detailed tasks extracted without changing technical status |
| ROLE_ARCHITECTURE; web ROLE_SYSTEM | Condensed role boundaries/current gaps |
| STORAGE_SETUP, STORAGE_IMPLEMENTATION | Compatibility pointers to new STORAGE guide |
| Web README; web API README | Replaced Vite template; retained concise API-client conventions |
| .github/agents/DEV_backend and DEV_frontend | Condensed specialist instructions |
| API | Split by resource; existing resource anchors retained |
| CONTROLLERS, CONTROLLERS_MIGRATION, CONTROLLERS_PATTERNS | One maintained guide and compatibility pointers |
| ENVIRONMENT_CONFIGURATION, ENV_IMPROVEMENTS_SUMMARY, SETUP_GUIDE | Source-verified configuration plus pointers to canonical setup |
| ERROR_HANDLING, ERROR_HANDLING_EXAMPLES | One maintained guide and compatibility pointer |
| DATABASE_REVIEW; REGISTRATION_API; USER_JOURNEYS | Reconciled scope status; shortened duplicated workflow/product guidance |
| UI_UX; USER_FLOWS; DESIGN_SYSTEM | Split screens/flows intact; retained detailed component requirements/proposed tokens |
| LOCALIZATION; TESTING | Retained canonical feedback/test details; added documentation-only validation commands |
| ADR-001/002/005/006/007/008 | Decisions preserved; stale implementation status/context corrected where needed; ADR-008 unchanged |
| BASELINE_CHANGE_REVIEW, BASELINE_VALIDATION, MIGRATION_VALIDATION, DEPENDENCY_UPDATES, DEVELOPMENT_HISTORY, SCOPE_INTEGRITY_VALIDATION | Historical evidence retained and labeled; incoming migration/deployment cautions preserved |

New ARCHITECTURE, DOMAIN and SECURITY guides summarize current boundaries and link
to detailed owners. They do not approve pending lifecycle/scoring/privacy policy.
[Documentation map](README.md) routes work to the minimum relevant files. Old
filenames remain valid; no original document was deleted.

The two `.github/agents` profiles are locally updated but already Git-ignored;
they will not appear in a normal Git diff. Ignore rules were preserved.

## Reading-cost measurement

Measured UTF-8 bytes, not tokenizer output or agent execution time. Splitting a
file reduces task-specific reading, not its total text; the overall reduction
comes from removing duplication/stale examples. Counts include historical reports
and all new Markdown, including this audit. See the final measurement below.

| Reading scope | Before | After | Reduction |
| --- | ---: | ---: | ---: |
| Root entry files (AGENTS + plan + README) | 106,660 bytes | 15,006 bytes | 85.9% |
| Development checkpoint alone | 91,302 bytes | 7,086 bytes | 92.2% |
| All Markdown | 503,854 bytes / 40 files | 389,685 bytes / 81 files | 22.7% |

More small files allow selective reading. The root checkpoint no longer requires
loading future-phase details, API resources or historical test narratives.


## Validation and limits

- `node --check scripts/check-docs.cjs`: syntax check.
- `node scripts/check-docs.cjs`: all local Markdown links/anchors, UTF-8, fences
  and trailing whitespace; external sites are intentionally outside this check.
- Negative fixture: a deliberately missing file/heading produces a failing check;
  the temporary fixture is removed afterward.
- Preservation audit: all 96 original named task IDs retain their completion
  states exactly once; original flow/screen requirement bodies are preserved.
  SHA-256 comparisons confirm every pre-existing non-Markdown file is unchanged,
  including existing uncommitted API/schema/test/migration work.
- Final diff review and `git diff --check`.

These checks cover this documentation/tooling change. Application build/typecheck/
lint/tests, Prisma, database and browser suites were not rerun; their behavior and
contracts were not changed. Earlier validation reports retain their original scope
and dates. The Markdown checker supports repository link/heading conventions,
not a full Markdown parser or semantic correctness proof.

Remaining work: generated OpenAPI, deployment/runbook documentation, accepted
ADR-003/004 and ongoing feature-specific documentation. No external release or
deployed-data audit is claimed. The next implementation task remains
**P2-IDENTITY-TOKENS**; first UI task remains P2-UI-FOUNDATION.
