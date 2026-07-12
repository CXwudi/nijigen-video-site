# Issue 22 Repository Safety Implementation Plan

**Goal:** Harden repository automation and frontend dependency installation against supply-chain attacks while keeping the controls practical for one maintainer.

**Source of Truth:** [GitHub issue #22](https://github.com/CXwudi/nijigen-video-site/issues/22), the user's decisions in the planning conversation, and the current repository workflows, Renovate configuration, pnpm workspace policy, SonarQube Cloud integration, and GitHub repository settings.

**Scope:** Includes immutable GitHub Action references, zizmor analysis, PR/main cache isolation, Renovate grouping and scheduling, an explicit strict 24-hour pnpm release age, and GitHub repository rules. It excludes CodeQL, CODEOWNERS, new container/tooling Renovate groups, release/publishing controls, and Gradle dependency verification.

**Approach:** Pin every GitHub Action to a full commit SHA and let Renovate preserve readable version comments and update the digests. Add a required zizmor PR check, retain caches while separating PR-produced entries from `main`, align frontend/backend/CI Renovate groups on the existing twice-monthly schedule, and enable repository settings only after the corresponding committed controls are green. Give the repository owner a PR-only emergency bypass without permitting direct pushes to `main`.

**Verification:** Validate workflow syntax and zizmor findings locally, validate Renovate and pnpm configuration, exercise PR and `main` cache behavior in GitHub Actions, confirm SonarQube Cloud continues reporting without gating merges, and inspect the live Actions policy and default-branch ruleset after rollout.

---

## Key Design Decisions

- Every `uses:` reference must use a full commit SHA, including actions owned by `actions/*` and `github/*`. Retain a trailing version comment such as `# v6.0.2` so Renovate can identify and update the release line.
- Enable GitHub's repository-level SHA-pinning policy after all committed workflows are SHA-pinned. This setting is the non-bypassable enforcement layer; zizmor provides broader workflow analysis.
- Run zizmor on every pull request and push to `main`, not only when workflow files change, so its required status check is always present.
- Run `zizmorcore/zizmor-action` with an exact zizmor version, `advanced-security: false`, and `annotations: true`. Findings should fail the workflow directly; do not upload SARIF through `github/codeql-action`, because CodeQL is intentionally outside this plan.
- Keep CI caches enabled for PRs. Ordinary `pull_request` cache entries remain merge-ref scoped; use explicit PR/main BuildKit scopes so the intended boundary is visible and future trigger changes cannot silently collapse it.
- Keep the current Renovate schedule `* * 1-7,14-21 * 4` in `America/Toronto` as one shared top-level policy. It runs in the first and third Thursday windows each month, which is the repository's concrete interpretation of biweekly.
- Split dependency PRs into frontend, backend, and GitHub Actions groups. Do not add a container/tooling group; matching dependencies outside the three groups keep Renovate's normal individual-update behavior.
- Preserve the current minor/patch automerge policy for every group, including GitHub Actions. Major updates and same-version digest refreshes continue to require manual review. Eligible version updates remain subject to the shared one-day release age and required checks.
- Make pnpm's 24-hour release age explicit and strict. Keep `allowBuilds` limited to the currently approved lifecycle-script packages.
- Keep SonarQube Cloud as the general code-quality and security analyzer. Add zizmor for GitHub Actions-specific analysis and do not enable CodeQL.
- Preserve SonarQube Cloud as a non-blocking informational check. PR #33 demonstrates the current behavior: it merged while `SonarCloud Code Analysis` was failing. Only zizmor becomes a required security check in this plan.
- Keep the default branch usable by a single maintainer: require a PR but zero approving reviews. Give only the repository owner `For pull requests only` bypass permission so an emergency PR can bypass rules without enabling direct pushes to `main`. Do not introduce mandatory CODEOWNERS review.

## File and Setting Impact Map

- `.github/workflows/backend-check.yml`: SHA-pin actions, disable checkout credential persistence, and retain merge-ref-scoped mise and Gradle caches.
- `.github/workflows/docs-link-check.yml`: SHA-pin actions, disable checkout credential persistence, and retain the mise cache.
- `.github/workflows/frontend-check.yml`: SHA-pin all actions, re-enable the mise cache, and give BuildKit separate PR/main cache scopes.
- `.github/workflows/actions-security-check.yml`: add the always-running zizmor check without CodeQL/SARIF integration.
- `.github/zizmor.yml`: record the explicit all-actions hash-pin policy and any narrowly justified finding suppressions.
- `.github/renovate.json5`: enable Action digest pinning, split dependency groups, and retain the shared schedule, release age, and runtime exclusions.
- `frontend/pnpm-workspace.yaml`: explicitly enforce the strict 24-hour install cooldown while retaining the lifecycle-script allowlist.
- GitHub Actions settings: require SHA-pinned actions while retaining read-only default workflow permissions and disallowing Actions from approving PRs.
- GitHub default-branch ruleset: require pull requests and the stable zizmor check while retaining deletion and non-fast-forward protections; leave SonarQube Cloud non-blocking and grant only the repository owner PR-only bypass permission.

## Task Steps

When executing the plan:

- mark `[ ]` boxes as completed `[x]` when an item is completed
- after each task, do a code review by spawning another subagent, and fix any valuable feedback
- before moving to the next task, commit the changes

### Task 1: Pin Actions and Add the zizmor Gate

#### 1.1 Intent

Make every workflow dependency immutable and add a stable, specialized security check for workflow changes.

#### 1.2 Files

- Modify: `.github/workflows/backend-check.yml`
- Modify: `.github/workflows/docs-link-check.yml`
- Modify: `.github/workflows/frontend-check.yml`
- Create: `.github/workflows/actions-security-check.yml`
- Create: `.github/zizmor.yml`

#### 1.3 Dependencies

None.

- [x] **Step 1:** Resolve every current Action tag to a full commit SHA from the upstream repository and replace all tagged `uses:` references. Add the corresponding release tag as an inline comment, including already-pinned frontend actions that currently lack comments.
- [x] **Step 2:** Add `persist-credentials: false` to checkout steps in the backend and documentation workflows; retain the existing frontend setting.
- [x] **Step 3:** Keep explicit least-privilege job permissions. Use `contents: read` only where checkout or online analysis needs it, and do not add `id-token: write`, repository write permissions, or secrets to the zizmor job.
- [x] **Step 4:** Add `.github/zizmor.yml` with an explicit `"*": hash-pin` `unpinned-uses` policy. Add no broad audit disablement; suppress a finding only at the narrowest file/line boundary and document why it is a false positive.
- [x] **Step 5:** Add `actions-security-check.yml` on every `pull_request`, push to `main`, and manual dispatch. Pin checkout and `zizmorcore/zizmor-action` by full SHA, set `persist-credentials: false`, use the checked-in config, set `version: 1.26.1`, and explicitly set `advanced-security: false` plus `annotations: true` so findings fail the job without CodeQL/SARIF upload.
- [x] **Step 6:** Run zizmor against all current workflows, remediate actionable findings, and avoid weakening the configuration merely to make the initial check pass.

#### 1.4 Verification

- Run: `rg -n --pcre2 "uses:\\s*['\"]?[^'\"\\s]+@(?![0-9a-f]{40}(?:['\"\\s#]|$))" .github/workflows`
- Expect: no repository or Docker Action `uses:` reference remains on a branch, tag, or short SHA.
- Run: `mise x actionlint@1.7.12 -- actionlint .github/workflows/*.yml`
- Expect: all workflow files pass syntax and expression validation.
- Run: `uvx zizmor==1.26.1 --config .github/zizmor.yml .github/workflows`
- Expect: no unsuppressed zizmor findings remain.
- Run the new workflow on a PR that does not change `.github/**`.
- Expect: the zizmor job still runs and reports a stable successful status-check name.

#### 1.5 Notes

- Verify each SHA belongs to the canonical action repository rather than a fork.
- Do not enable the repository SHA policy in this task. Enabling it before the pinned workflows reach `main` can break existing runs.
- Renovate recognizes `zizmorcore/zizmor-action` and its `version` input. Keep the Action SHA and exact scanner version in the same CI group so both advance under the shared cooldown and schedule.
- The zizmor action internally supports SARIF upload, but `advanced-security: false` keeps that path disabled and avoids adding CodeQL to this repository.

### Task 2: Preserve Caches Across the PR Trust Boundary

#### 2.1 Intent

Retain CI performance without allowing PR-produced cache entries to become trusted `main` entries.

#### 2.2 Files

- Modify: `.github/workflows/frontend-check.yml`
- Review: `.github/workflows/backend-check.yml`
- Review: `.github/workflows/docs-link-check.yml`

#### 2.3 Dependencies

Task 1.

- [x] **Step 1:** Re-enable the frontend mise cache. Remove the comment that treats an ordinary `pull_request` cache as if it could overwrite the default-branch cache.
- [x] **Step 2:** Derive a BuildKit cache scope from trusted event fields: `frontend-web-main` for pushes to `main`, `frontend-web-pr-<number>` for pull requests, and `frontend-web-manual-<sanitized-branch>` for manual runs.
- [x] **Step 3:** Save BuildKit cache output only to the derived scope. For PR and manual builds, restore their isolated scope first and the read-only `frontend-web-main` scope as a fallback; for `main`, restore and save the main scope.
- [x] **Step 4:** Retain mise and Gradle caching in backend/docs workflows. Document in workflow comments only where useful that GitHub's native cache service applies merge-ref isolation to `pull_request` entries.
- [x] **Step 5:** Audit triggers and confirm that no workflow running untrusted repository code uses `pull_request_target`, `workflow_run`, `issue_comment`, or another privileged trigger. If such a trigger becomes necessary later, require a separate security design before sharing caches or checking out PR code.

#### 2.4 Verification

- Run: `mise x actionlint@1.7.12 -- actionlint .github/workflows/*.yml`
- Expect: conditional scope expressions and cache inputs are valid.
- Open a test PR, derive its number with `pr_number="$(gh pr view --json number --jq .number)"`, and inspect `gh cache list --ref "refs/pull/${pr_number}/merge"` after the frontend workflow completes.
- Expect: PR cache entries exist under the PR merge ref and use the `frontend-web-pr-<number>` BuildKit scope.
- Run or inspect a subsequent push to `main` with `gh cache list --ref refs/heads/main`.
- Expect: the trusted run uses `frontend-web-main` and does not restore a PR-produced scope.
- Re-run the same PR workflow.
- Expect: it can restore its own PR scope, demonstrating that PR cache writes were preserved rather than disabled.

#### 2.5 Notes

- A PR may read a base-branch cache, so cached data must never contain secrets. The security boundary required here is preventing low-trust cache writes from becoming inputs to trusted `main` runs.
- Keep the ordinary `pull_request` trigger. Do not attempt to recreate cache isolation solely through string naming while using a privileged event.

### Task 3: Align Renovate and pnpm Supply-Chain Policies

#### 3.1 Intent

Make immutable Action references maintainable, reduce dependency PR coupling, and apply one explicit 24-hour cooldown from proposal through installation.

#### 3.2 Files

- Modify: `.github/renovate.json5`
- Modify: `frontend/pnpm-workspace.yaml`

#### 3.3 Dependencies

Task 1.

- [x] **Step 1:** Add Renovate's `helpers:pinGitHubActionDigests` preset so tagged Actions are converted to SHA references with version comments and existing pinned Actions remain updateable.
- [x] **Step 2:** Remove the `all dependencies` package rule. Add distinct groups for the npm manager (`frontend dependencies`), Gradle and Gradle Wrapper managers (`backend dependencies`), and the GitHub Actions manager (`CI actions`).
- [x] **Step 3:** Let all three groups inherit the same top-level first/third-Thursday schedule, `America/Toronto` timezone, one-day `minimumReleaseAge`, and `internalChecksFilter: 'strict'`. Do not add group-specific schedules.
- [x] **Step 4:** Preserve `:automergeMinor` and `:automergeBranch`, including for CI Actions. Do not add blanket major-version or digest automerge; required checks and the one-day release age must pass before eligible version updates merge.
- [x] **Step 5:** Retain the existing manual JDK, Node.js, and pnpm runtime-version rules. Do not add a container/tooling group; unrelated detected dependencies remain ungrouped.
- [x] **Step 6:** Add `minimumReleaseAge: 1440`, `minimumReleaseAgeStrict: true`, and `minimumReleaseAgeIgnoreMissingTime: false` to `frontend/pnpm-workspace.yaml`. Keep the `allowBuilds` entries for `esbuild` and `lightningcss` unchanged.
- [ ] **Step 7:** Let Renovate open or refresh its pin-digest PR and verify that each Action receives a full SHA plus a parseable release comment before enabling server-side SHA enforcement.

#### 3.4 Verification

- Run: `mise x npm:renovate@43.259.2 -- renovate-config-validator .github/renovate.json5`
- Expect: the Renovate configuration is valid and the three group rules use supported manager names.
- Run a Renovate dry run or inspect the Dependency Dashboard.
- Expect: frontend, backend, and CI dependencies are proposed in separate groups on the same schedule; container/tooling updates are not forced into a new group.
- Run: `cd frontend && pnpm config get minimumReleaseAge && pnpm config get minimumReleaseAgeStrict && pnpm config get minimumReleaseAgeIgnoreMissingTime`
- Expect: `1440`, `true`, and `false` respectively.
- Run: `cd frontend && pnpm install --frozen-lockfile`
- Expect: the committed lockfile installs successfully under the strict policy and lifecycle scripts remain restricted to the existing allowlist.

#### 3.5 Notes

- The existing cron expression is twice monthly rather than an exact rolling 14-day interval. Preserve it because the decision is to give every group the same current dates and frequency.
- Renovate's release age controls when it proposes/merges an update; pnpm's release age independently controls what developers and CI may resolve or install.
- Renovate does not consistently apply `minimumReleaseAge` to digest-only updates. Exact release comments let normal Action releases be classified as version updates; a same-version digest change can indicate a retargeted tag and intentionally remains manual.

### Task 4: Enforce the Policy in GitHub Settings

#### 4.1 Intent

Make the committed controls mandatory on `main` without introducing a second-maintainer approval requirement.

#### 4.2 Files

- Modify externally: GitHub repository Actions policy
- Modify externally: GitHub `Default Rule` ruleset

#### 4.3 Dependencies

Tasks 1 through 3 merged to `main`, with a successful zizmor check and SonarQube Cloud still reporting its informational result.

- [x] **Step 1:** Confirm all workflows on `main`, including the new zizmor workflow, use full 40-character Action SHAs.
- [x] **Step 2:** Enable `sha_pinning_required` in the repository Actions policy. Keep default workflow permissions read-only and keep the ability for Actions to approve pull requests disabled.
- [x] **Step 3:** Export the complete existing `Default Rule` ruleset JSON as rollback evidence before editing it. Prefer the GitHub UI to add required pull requests with zero approving reviews and the repository owner with `For pull requests only` bypass mode. If using the REST API, construct and review a writable update-schema payload containing only accepted fields while preserving `name`, `target`, `enforcement`, `conditions`, every existing rule, and every existing bypass actor; do not submit the GET response because it contains read-only fields. Compare the post-update ruleset with the export to ensure no existing protection was removed.
- [x] **Step 4:** Require only the stable zizmor job. Keep `SonarCloud Code Analysis` informational, matching current behavior, and do not require path-filtered backend/frontend checks until they have an always-present aggregator because skipped required checks can block unrelated PRs.
- [x] **Step 5:** Open a small verification PR and prove that a failing zizmor check blocks an ordinary merge, a failing SonarQube Cloud check does not block merging, and a PR with the required zizmor check green can be merged by the sole maintainer without another approval. Confirm that the repository owner can explicitly bypass rules from the PR when handling an emergency.

#### 4.4 Verification

- Run: `gh api repos/CXwudi/nijigen-video-site/actions/permissions`
- Expect: Actions are enabled and `sha_pinning_required` is `true`.
- Run: `gh api repos/CXwudi/nijigen-video-site/actions/permissions/workflow`
- Expect: `default_workflow_permissions` is `read` and `can_approve_pull_request_reviews` is `false`.
- Run: `gh api repos/CXwudi/nijigen-video-site/rulesets/8850102 > /tmp/issue-22-ruleset-after.json`
- Expect: the active default-branch ruleset retains deletion/non-fast-forward rules, requires pull requests with zero approvals, requires only the stable zizmor check, and grants only the repository owner `pull_request` bypass mode; SonarQube Cloud is absent from required status checks.
- Attempt to add an Action tag in a test branch and run the workflow.
- Expect: repository policy rejects the unpinned Action, and zizmor also reports the violation.
- Inspect the effective ruleset JSON, ruleset insights, and verification PR merge box without attempting a direct push to `main`.
- Expect: the pull-request rule is active, the administrator bypass actor has `bypass_mode: pull_request`, no actor has `bypass_mode: always`, normal merges require zizmor, SonarQube Cloud remains informational, no approval from a nonexistent second maintainer is required, and the administrator is offered an explicit PR-only bypass path.

#### 4.5 Notes

- Repository settings are intentionally last: the policy should enforce a known-green configuration, not prevent the migration that creates it.
- If GitHub changes a generated status-check name, update the ruleset only after confirming the replacement check appears consistently on ordinary PRs.

### Task 5: Complete Integrated Verification and Record the Outcome

#### 5.1 Intent

Confirm the controls work together and leave issue #22 with evidence that future maintainers can audit.

#### 5.2 Files

- Modify: `design-log/plans/plan-issue-22-repo-safety-20260711.md`
- Modify externally: GitHub issue #22

#### 5.3 Dependencies

Tasks 1 through 4.

- [ ] **Step 1:** Run all local workflow, zizmor, Renovate, pnpm, and documentation-link validations from prior tasks.
- [ ] **Step 2:** Confirm the verification PR receives successful required zizmor and all path-relevant application checks, while SonarQube Cloud reports a result without becoming a merge requirement.
- [ ] **Step 3:** Validate and review the resolved Renovate policy: the GitHub Actions manager must inherit SHA pinning, the shared schedule, strict one-day release age, and minor/patch automerge, while digest and major updates remain manual. Record the next natural CI Action automerge as follow-up evidence rather than requiring an eligible upstream release to complete issue #22.
- [ ] **Step 4:** Mark completed plan items, record any intentional deviations in the implementation PR, and update issue #22 with links to the merged PR and live ruleset.

#### 5.4 Verification

- Run: `mise //:docs-link-check`
- Expect: repository-local documentation and design-log links pass.
- Run: `git diff --check`
- Expect: no whitespace errors are present.
- Run: `verification_pr="$(gh pr view --json number --jq .number)" && gh pr checks "${verification_pr}"`
- Expect: all required and path-relevant checks pass.
- Run: `gh issue view 22 --comments`
- Expect: the issue contains the implementation evidence and no unresolved in-scope control remains.

#### 5.5 Notes

- Do not close issue #22 merely because the files merged. Close it only after the live GitHub settings and one real PR path have been verified.
- Historical design-log files remain immutable after merge except for completion marks, grammatical fixes, and link maintenance allowed by repository policy.

## Risks and Guardrails

- Renovate bootstrap: bare SHAs without version comments are not updateable by default. Every pin must retain a valid release comment, and the digest-pinning preset should land before server-side enforcement.
- Scanner bootstrap: the zizmor Action and its scanner are separate dependencies. Pin the Action by SHA and the scanner with an exact `version` input; Renovate's community-action extraction must detect both before enabling automerge.
- Required-check stability: a path-filtered workflow may be absent on unrelated PRs. Require only checks that run on every PR unless an always-present aggregator is introduced later.
- SonarQube behavior drift: SonarQube Cloud currently reports findings without blocking merges. Do not add it to required status checks unless a later explicit decision changes that policy.
- Cache assumptions: explicit scope names supplement GitHub's merge-ref security boundary; they do not replace it. A future switch to a privileged trigger requires a new review.
- zizmor configuration tampering: a PR can edit repository configuration, so GitHub's external SHA requirement remains the authoritative pinning enforcement. Review changes to `.github/zizmor.yml` as security-sensitive code.
- Scanner overlap: SonarQube Cloud already analyzes source and GitHub Actions. zizmor is retained because it specializes in workflow attack patterns and pinning; CodeQL remains excluded to avoid redundant findings and maintenance.
- Solo-maintainer lockout: requiring an approving review or an intermittently present check can make `main` unmergeable. Keep approvals at zero, verify status names before enforcing them, and retain the administrator's PR-only emergency bypass without granting direct-push bypass.
- Schedule terminology: the existing first/third-Thursday cron has occasional gaps longer than 14 days. Changing to an exact cadence is outside this plan; the requirement here is identical dates and frequency for all three groups.

## References

| Resource | Description | Other Notes if any |
| --- | --- | --- |
| [GitHub issue #22](https://github.com/CXwudi/nijigen-video-site/issues/22) | Requests a reasonable, one-developer-maintainable repository and frontend supply-chain security baseline. | Must Read |
| [GitHub PR #33](https://github.com/CXwudi/nijigen-video-site/pull/33) | Merged while `SonarCloud Code Analysis` was failing, providing evidence that SonarQube Cloud is currently non-blocking. | Important |
| [TanStack npm supply-chain compromise postmortem](https://tanstack.com/blog/npm-supply-chain-compromise-postmortem) | Describes the privileged PR, cache poisoning, and token-theft attack chain motivating the issue. | Must Read |
| [TanStack hardening follow-up](https://tanstack.com/blog/incident-followup) | Identifies SHA pinning, cache controls, zizmor, and workflow ownership as follow-up controls. | Important |
| [Backend workflow](../../.github/workflows/backend-check.yml) | Contains mutable Action tags and enabled mise/Gradle caches. | Must Read |
| [Documentation workflow](../../.github/workflows/docs-link-check.yml) | Contains mutable Action tags and an enabled mise cache. | Important |
| [Frontend workflow](../../.github/workflows/frontend-check.yml) | Contains partial SHA pinning, disabled mise caching, and the shared BuildKit cache scope. | Must Read |
| [Renovate configuration](../../.github/renovate.json5) | Defines the shared schedule, one-day release age, broad dependency group, and current automerge behavior. | Must Read |
| [pnpm workspace policy](../../frontend/pnpm-workspace.yaml) | Restricts dependency lifecycle scripts and will own the explicit strict install cooldown. | Must Read |
| [GitHub secure-use reference](https://docs.github.com/en/actions/reference/security/secure-use) | Recommends full-length Action SHAs, least privilege, and safe handling of privileged triggers. | Must Read |
| [GitHub dependency caching reference](https://docs.github.com/en/actions/reference/workflows-and-actions/dependency-caching) | Defines merge-ref cache isolation, low-trust cache behavior, and secure cache practices. | Must Read |
| [GitHub Actions repository settings](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-github-actions-settings-for-a-repository) | Documents repository Action policies and default token permissions. | Important |
| [GitHub rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets) | Documents default-branch pull-request and required-check enforcement. | Important |
| [GitHub Actions permissions REST API](https://docs.github.com/en/rest/actions/permissions) | Documents reading and safely updating repository Actions policy. | Important |
| [GitHub rules REST API](https://docs.github.com/en/rest/repos/rules) | Documents complete ruleset retrieval and replacement payloads. | Important |
| [zizmor Action](https://github.com/zizmorcore/zizmor-action) | Documents the pinned Action, direct-failure mode, annotations, and optional SARIF integration. | Must Read |
| [zizmor Action inputs](https://github.com/zizmorcore/zizmor-action#inputs) | Defines the exact scanner version, Advanced Security, annotations, and configuration inputs used by the workflow. | Must Read |
| [zizmor `unpinned-uses` audit](https://docs.zizmor.sh/audits/#unpinned-uses) | Defines the default all-actions hash-pin policy and configuration semantics. | Important |
| [Renovate GitHub Actions manager](https://docs.renovatebot.com/modules/manager/github-actions/) | Documents Action digest pinning, version comments, and SHA updates. | Must Read |
| [Renovate scheduling](https://docs.renovatebot.com/key-concepts/scheduling/) | Documents shared top-level and package-rule schedules. | Important |
| [Renovate minimum release age](https://docs.renovatebot.com/configuration-options/#minimumreleaseage) | Defines proposal and automerge delay behavior. | Important |
| [pnpm settings](https://pnpm.io/settings#minimumreleaseage) | Defines explicit release-age strictness, missing-time behavior, and lifecycle-script policy. | Must Read |
| [SonarQube Cloud GitHub Actions analysis](https://docs.sonarsource.com/sonarqube-cloud/advanced-setup/languages/github-actions) | Confirms the existing scanner analyzes workflows, supporting the decision not to add CodeQL. | Important |
