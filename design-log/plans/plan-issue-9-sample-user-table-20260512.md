# Sample User Table Implementation Plan

> **For agentic workers:** Use the harness's preferred task-tracking and
> delegation tools when available. Steps use checkbox (`- [ ]`) syntax for
> tracking.

**Goal:** Add a small CRUD API for a backend `sample_users` table and test
that API data changes are rolled back after each test, while enabling Spring
Boot virtual threads for the API runtime.

**Source of Truth:** GitHub issue `#9` plus the user's explicit requests to add
sample user-table backend behavior, use `JdbcClient`, name code around
`SampleUser`, use a `sample_users` table, enable Spring Boot virtual threads,
and test that modified data is reverted.

**Scope:** Includes repository/controller/model code for sample user CRUD,
integration tests using the real Spring/JDBC stack, and a CI wiring check.
Excludes authentication integration, Keycloak user syncing, production user
profile design, frontend changes, and broad backend architecture refactors.

**Approach:** Use the current `spring-boot-starter-jdbc` stack, specifically Spring
`JdbcClient`, and a small disposable `sample_users` table instead of introducing
JPA. Because the project is still at a very early stage and this sample table is
expected to be removed later, update the existing V1 baseline migration directly
instead of adding a new migration. Add small model, repository, and controller
classes under the API module's package root, then verify through
Spring MVC integration tests that run inside the existing Compose-backed backend
test flow. Keep the test data rollback explicit with transactional tests plus
post-transaction cleanup assertions. Enable Spring Boot virtual threads with
`spring.threads.virtual.enabled: true` in the API application configuration,
which is the documented Spring Boot 4 property for Java 21+ applications.

**Verification:** Run the focused API test task through the backend Compose
wrapper used by CI: `mise //backend/docker:run --rm api :apps:api:test`. Also
confirm `git status` only contains intended source/test/CI changes. Commit after
each completed task so the implementation lands as small reviewable steps.

---

## Branch Workflow

Create a dedicated task branch before touching implementation files. Suggested
branch name: `issue-9-sample-user-table`. If that branch name already exists,
choose the nearest repo-consistent variant and record it in the execution
summary.

## Commit Cadence

Commit after every completed task in this plan. Each commit should contain only
that task's focused changes plus any small correction strictly required to keep
the repository coherent at that checkpoint. Use the repository commit workflow
and keep commit messages scoped to the task outcome.

### Task 0: Create The Task Branch

#### 0.1 Intent

Start issue `#9` on an isolated Git branch before schema, config, or code
changes begin.

#### 0.2 Files

- No source files are changed by this task.

#### 0.3 Dependencies

None

- [ ] **Step 1:** Check the current Git branch and worktree status.
- [ ] **Step 2:** Create and switch to `issue-9-sample-user-table`, or the
      closest repo-consistent available variant if that branch already exists.
- [ ] **Step 3:** Confirm later task commits will land on the new task branch.

#### 0.4 Verification

- Run: `git branch --show-current`
- Expect: the task branch is active before implementation starts.
- Commit: No commit; branch creation itself has no file changes.

### Task 1: Define The Disposable Sample Table

#### 1.1 Intent

Update the early-stage Flyway baseline so the API has a clearly temporary
`sample_users` table to exercise CRUD flows without implying the final user
domain model.

#### 1.2 Files

- Modify:
  `infra/flyway/sql/baseline/V1__baseline.sql`

#### 1.3 Dependencies

Task 0

- [ ] **Step 1:** Replace the generic `users` sample schema with
      `sample_users`.
- [ ] **Step 2:** Keep the sample table intentionally small: `id`, `username`,
      `display_name`, and `created_at`.
- [ ] **Step 3:** Preserve the existing uniqueness constraint on `username` and
      timestamp default unless implementation reveals a concrete issue.

#### 1.4 Verification

- Run: `git diff -- infra/flyway/sql/baseline/V1__baseline.sql`
- Expect: the baseline migration now defines only the disposable
  `sample_users` table for this CRUD example.
- Commit: Save the baseline schema rename/update checkpoint.

### Task 2: Enable Spring Boot Virtual Threads

#### 2.1 Intent

Enable Spring Boot's virtual-thread mode for the API runtime with the documented
single configuration property.

#### 2.2 Files

- Modify:
  `backend/apps/api/src/main/resources/application.yaml`

#### 2.3 Dependencies

Task 1

- [ ] **Step 1:** Add `spring.threads.virtual.enabled: true` to the API's main
      application configuration.
- [ ] **Step 2:** Keep the YAML nested under the existing `spring:` block and
      avoid unrelated configuration churn.

#### 2.4 Verification

- Run: `git diff -- backend/apps/api/src/main/resources/application.yaml`
- Expect: the diff is the one-line Spring Boot virtual-thread setting plus only
  the YAML structure needed to place it.
- Commit: Save the virtual-thread configuration checkpoint.

### Task 3: Implement SampleUser CRUD

#### 3.1 Intent

Expose simple REST endpoints backed by the `sample_users` database table.

#### 3.2 Files

- Create:
  `backend/apps/api/src/main/kotlin/io/github/cxwudi/nijigenvideosite/apps/api/sampleusers/SampleUserModels.kt`
- Create:
  `backend/apps/api/src/main/kotlin/io/github/cxwudi/nijigenvideosite/apps/api/sampleusers/SampleUserRepository.kt`
- Create:
  `backend/apps/api/src/main/kotlin/io/github/cxwudi/nijigenvideosite/apps/api/sampleusers/SampleUserController.kt`

#### 3.3 Dependencies

Tasks 1-2

- [ ] **Step 1:** Model the columns from `sample_users`: `id`, `username`,
      `display_name`, and `created_at`.
- [ ] **Step 2:** Implement `JdbcClient` repository methods for create,
      find by id, list, update, and delete.
- [ ] **Step 3:** Implement REST endpoints:
      `POST /sample-users`, `GET /sample-users`, `GET /sample-users/{id}`,
      `PUT /sample-users/{id}`, and `DELETE /sample-users/{id}`.
- [ ] **Step 4:** Return sensible HTTP statuses: `201 Created`, `200 OK`,
      `204 No Content`, `400 Bad Request` for validation failures, and
      `404 Not Found` for missing IDs.
- [ ] **Step 5:** Keep validation intentionally minimal with `@NotBlank` and
      small `@Size` limits on request DTOs.

#### 3.4 Verification

- Run: `cd backend && ./gradlew :apps:api:compileKotlin`
- Expect: production Kotlin code compiles without new dependencies.
- Commit: Save the SampleUser CRUD implementation checkpoint.

#### 3.5 Notes

- Update `V1__baseline.sql` directly for `sample_users`; this is acceptable
  here because the table is intentionally disposable and the project is still
  very early stage.
- Prefer not to repurpose production-looking `users` naming for this sample CRUD
  issue.
- Prefer `JdbcClient` because the backend already has Spring JDBC and no JPA
  dependency.

### Task 4: Add Rollback-Safe Integration Tests

#### 4.1 Intent

Add enough tests to prove CRUD behavior while ensuring rows created or modified
by tests are reverted after each test.

#### 4.2 Files

- Create:
  `backend/apps/api/src/test/kotlin/io/github/cxwudi/nijigenvideosite/apps/api/sampleusers/SampleUserControllerIntegrationTests.kt`
- Reuse if needed:
  `backend/apps/api/src/test/resources/application-test.yaml`

#### 4.3 Dependencies

Task 3

- [ ] **Step 1:** Use `@SpringBootTest`, `@AutoConfigureMockMvc`,
      `@ActiveProfiles("test")`, and `@Transactional` so MockMvc requests share
      the test transaction and are rolled back.
- [ ] **Step 2:** Use a unique sample username prefix per test run to avoid colliding
      with local developer data.
- [ ] **Step 3:** Add a create/read/list test that verifies a created sample user can
      be fetched and appears in the list.
- [ ] **Step 4:** Add an update/delete test that verifies editable fields change
      and the deleted sample user returns `404` afterward.
- [ ] **Step 5:** Add a small validation or not-found test if it stays cheap and
      does not make the test suite noisy.
- [ ] **Step 6:** Add an `@AfterTransaction` assertion that no rows matching the
      test-run username prefix remain after rollback.

#### 4.4 Verification

- Run: `mise //backend/docker:run --rm api :apps:api:test`
- Expect: all API tests pass against the Compose PostgreSQL service and the
  rollback assertion proves test data did not persist.
- Commit: Save the rollback-safe SampleUser integration tests checkpoint.

#### 4.5 Notes

- Transaction rollback does not reset PostgreSQL sequences, and that is okay;
  the important part is that test rows and updates are gone.
- Tests should not assert exact global user count because a developer's local
  database may contain unrelated rows.

### Task 5: Confirm CI Already Runs The New Tests

#### 5.1 Intent

Make sure the GitHub Actions backend check will execute the new tests without
unnecessary CI churn.

#### 5.2 Files

- Review:
  `.github/workflows/backend-check.yml`
- Modify only if needed:
  `.github/workflows/backend-check.yml`

#### 5.3 Dependencies

Task 4

- [ ] **Step 1:** Confirm backend path filters include the changed backend test
      files.
- [ ] **Step 2:** Confirm the workflow still runs
      `mise //backend/docker:run --rm api :apps:api:test` after starting
      Compose dependencies and Flyway.
- [ ] **Step 3:** Avoid workflow edits if the current CI command already covers
      the new tests.

#### 5.4 Verification

- Run: `mise //backend/docker:config-check`
- Run: `mise //backend/docker:run --rm api :apps:api:test`
- Expect: the same command CI uses passes locally.
- Commit: Save CI workflow changes only if Task 5 requires an actual workflow
  edit; if no files change, record that no Task 5 commit is needed.

### Task 6: Final Review

#### 6.1 Intent

Keep the final change easy to review and aligned with the issue.

#### 6.2 Files

- Review all changed files from `git status --short`

#### 6.3 Dependencies

Tasks 0-5

- [ ] **Step 1:** Review `git diff` for accidental generated files or unrelated
      formatting churn.
- [ ] **Step 2:** Confirm all new public classes/functions have KDoc.
- [ ] **Step 3:** Summarize any deliberate non-changes, especially if CI did not
      need a workflow edit.

#### 6.4 Verification

- Run: `git status --short`
- Expect: only intended source/test files, and possibly CI if Task 5 found a
  real gap.
- Commit: Save final review-only fixes only if Task 6 produces file changes; do
  not create an empty commit.

## References
<!-- list of references, such as files, urls, or other resources -->

<!-- markdownlint-disable MD013 -->

| Resouce | Description | Other Notes if any |
| --- | --- | --- |
| [GitHub issue #9](https://github.com/CXwudi/nijigen-video-site/issues/9) | Source issue: add CRUD for a user table, tests, and CI coverage. | Must Read |
| [Spring Boot virtual threads docs](https://docs.spring.io/spring-boot/reference/features/spring-application.html) | Official Spring Boot 4 reference for `spring.threads.virtual.enabled=true`. | Important |
| ![a file](../../infra/flyway/sql/baseline/V1__baseline.sql) | Existing Flyway baseline to modify for the disposable `sample_users` table. | Must Read |
| ![a file](../../backend/apps/api/build.gradle.kts) | API module dependencies; confirms Spring JDBC/WebMVC/test stack. | Important |
| ![a file](../../backend/apps/api/src/main/kotlin/io/github/cxwudi/nijigenvideosite/apps/api/ApiApp.kt) | API Spring Boot application package root and conventions. | Important |
| ![a file](../../backend/apps/api/src/test/kotlin/io/github/cxwudi/nijigenvideosite/apps/api/ApiAppTests.kt) | Existing bootstrap test style for the API module. | |
| ![a file](../../.github/workflows/backend-check.yml) | Backend CI workflow that should run the new tests. | Important |
| ![a file](../../backend/docker/mise.toml) | Local/CI backend Compose task definitions used to run API tests. | Important |

<!-- markdownlint-enable MD013 -->
