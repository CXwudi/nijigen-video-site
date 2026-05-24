# ADL-007: Rethinking Messaging Broker — Pulsar vs RocketMQ

- **Status:** Draft
- **Date:** 2026-05-23
- **Supersedes:** [ADL-002 (Messaging Broker Choice)](002-messaging-broker-choice.md)
- **Facts verified via:** Web search (Exa), 2026-05-23

## Context

[ADL-002](002-messaging-broker-choice.md) chose Apache Pulsar. The two reasons
recorded were:

1. AutoMQ did not support Kafka 4.0 Share Groups (the Gemini Deep Research
   report's #1 pick was ruled out).
2. Pulsar's complex setup could be mitigated by AI coding agents and existing
   Docker Compose guides.

Now, before any broker integration has been wired in (the
`spring-boot-starter-pulsar` dependency is still commented out), the question is
being revisited with a sharper focus: **between Apache Pulsar and Apache
RocketMQ, which compute-storage separated broker fits this project?**

An important constraint has changed since the original ADL: the development
machine has **64 GB RAM**, so memory pressure from multi-JVM setups is not
a practical concern.

This document was verified with web search on 2026-05-23. Claims about product
status, version compatibility, and feature support are sourced from official
documentation, GitHub repositories, and vendor announcements.

## The Project's Actual Needs

| Dimension | What the project needs |
|---|---|
| **Scale** | Solo practice project. No production traffic. |
| **Workload 1 — Danmaku** | Pub/sub fan-out for synchronized bullet chat across WebSocket connections. Strict ordering required. |
| **Workload 2 — Worker** | Competing consumers for async tasks (retries, cleanup, eventual media processing). Needs retry/DLQ semantics. |
| **Deployment target** | Docker Compose for local dev. Kubernetes later. |
| **Team size** | 1 person. |
| **Tech stack** | Spring Boot 4.x, Java 25, Kotlin, Gradle. |
| **Current state** | `apps/worker` doesn't exist yet. No broker integration wired. |
| **Dev machine** | 64 GB RAM. Memory is not a constraint. |
| **Goal** | Learn compute-storage separated architecture through hands-on practice. |

## Prerequisite: Clarifying Kafka 4.0 "Broadcasting"

There's a common misconception worth correcting: Kafka has **always** supported
broadcasting (fan-out) — just spin up multiple consumer groups reading the same
topic. What Kafka 4.0 added via **KIP-932 Share Groups** is the **opposite**:
true queue semantics with competing consumers and individual message
acknowledgments, breaking free from the "1 consumer thread per partition"
limitation.

So a broker that only supports Kafka 3.x (like AutoMQ or WarpStream today) can
handle danmaku broadcast fine, but makes the worker/queue pattern painful —
requiring partition-based workarounds or custom retry/DLQ in application code.

## Complete Landscape: Compute-Storage Separated Messaging Brokers

Before narrowing to Pulsar vs RocketMQ, here is the full landscape of brokers
with meaningful compute-storage separation as of May 2026.

### Summary Matrix

| Broker | Storage Backend | API | KIP-932 / Queue Semantics | Local Dev Weight | Production Readiness |
|---|---|---|---|---|---|
| **Apache Pulsar** | BookKeeper | Native Pulsar | ✅ Native (Shared subs) | Heavy (3 JVMs) | ✅ Mature |
| **AutoMQ** | S3 (EBS WAL) | Kafka 3.7.x | ❌ No Share Groups | Light (1 + MinIO) | ✅ Production |
| **WarpStream** | S3 (zero local disk) | Kafka ~3.x subset | ❌ No Share Groups | Light (1 binary) | ✅ Production (Confluent) |
| **Redpanda Cloud Topics** | S3 + local Raft log | Kafka-compatible | ❌ Issue #26434 open | Light (1 binary) | ✅ GA (v26.1, Mar 2026) |
| **StreamNative Ursa for Kafka** | S3 (Ursa engine) | Kafka 4.2+ | ✅ Yes (it IS Kafka 4.2) | Moderate (brokers + S3) | ⚠️ Brand new (Apr 2026) |
| **Apache RocketMQ 5.x** | Local disk (S3 tiered exp.) | Native RocketMQ | ✅ Native (retry/DLQ) | Light (2 containers) | ✅ Mature |
| **Pravega** | Custom + S3 tiered | Custom | ✅ Native | Heavy | Niche |

### Detailed Breakdown

#### Apache Pulsar

- **Architecture**: 3-layer — Pulsar Brokers (stateless compute), Apache
  BookKeeper (durable storage), Apache ZooKeeper (metadata coordination).
- **Storage separation**: True and mature. Brokers are stateless. BookKeeper
  handles replication. Tiered storage can offload cold segments to S3.
- **API**: Native Pulsar protocol, not Kafka-compatible.
- **Queue semantics**: Native via Shared, Failover, Key_Shared subscription
  modes. Handles both pub/sub and competing consumers without workarounds.
- **Local dev**: Docker Compose needs 3 containers (ZooKeeper, BookKeeper,
  Broker). Or use `bin/pulsar standalone` for a single process. RAM: 4-6 GB at
  idle (irrelevant with 64 GB host). Startup: 30-60 seconds cold.
- **Spring Boot**: `spring-boot-starter-pulsar` (official, maintained).
- **Community**: Large, English-friendly, Apache-governed.
- **Verdict**: The canonical compute-storage separated broker. Battle-tested at
  Bilibili, Yahoo, Tencent, Verizon scale. The operational weight is real but
  manageable with 64 GB RAM and Docker.

#### AutoMQ

- **Architecture**: Fork of Apache Kafka that replaces the local-disk storage
  layer with S3. A small EBS volume or local file serves as a Write-Ahead Log
  (WAL); data is asynchronously flushed to S3/MinIO. Brokers are stateless.
- **Storage separation**: True. Brokers can scale independently. S3 is the
  durable store.
- **API**: Kafka 3.7.x protocol. The AutoMQ wiki (Apr 2025) documents Kafka 4.0
  features but **AutoMQ v1.0.x is adapted to Kafka 3.7.x**, and v1.1.x
  (upcoming) does not indicate 4.0 support. **KIP-932 Share Groups are not
  supported.**
- **Queue semantics**: ❌ No Share Groups. Worker queue pattern needs
  partition-based workarounds (one consumer per partition) or a separate queue
  system.
- **Local dev**: Light. AutoMQ broker + MinIO container. Starts fast, RAM
  modest.
- **Spring Boot**: Spring Kafka (first-party, best-in-class).
- **Verdict**: Excellent architecture but the lack of Kafka 4.0 Share Groups is
  a real gap for the worker workload. This was the #1 recommendation from the
  Gemini report and was only rejected for this specific reason.

#### WarpStream

- **Architecture**: Diskless, stateless Agent binary. Data streams directly from
  producers to S3 with zero local disk. Metadata stored in WarpStream's cloud
  control plane. Acquired by Confluent (2024), open-source available.
- **Storage separation**: The most extreme form — no local disk at all.
- **API**: Kafka protocol-compatible, but a **subset**. Supports Produce, Fetch,
  consumer groups, transactions. **Does not support KIP-932 Share Groups.**
- **Queue semantics**: ❌ No Share Groups. Standard consumer groups only.
- **Local dev**: Light. Agent binary + S3/MinIO. Requires a connection to the
  cloud metadata store (or BYOC metadata).
- **Spring Boot**: Spring Kafka client works.
- **Verdict**: Impressive architecture and cost savings, but the cloud metadata
  dependency and lack of Share Groups are concerns. As a Confluent-owned
  product, the open-source future is uncertain.

#### Redpanda Cloud Topics (v26.1, GA March 2026)

- **Architecture**: C++ implementation, Kafka API-compatible. Cloud Topics is
  a new feature that stores data payloads directly in S3 while keeping metadata
  (Raft log) and hot data on local disk. Per-topic: you can mix standard
  (disk-based) and Cloud (S3-backed) topics in one cluster.
- **Storage separation**: True for Cloud Topics. Data in S3, metadata in local
  Raft log. Not fully stateless brokers — metadata is still local.
- **API**: Kafka API-compatible (specific version not pinned, but **KIP-932 is
  NOT supported** — [GitHub issue #26434](https://github.com/redpanda-data/redpanda/issues/26434)
  is open, and the Redpanda team stated they'll wait for KIP-932 to reach GA in
  upstream Kafka before implementing).
- **Queue semantics**: ❌ No Share Groups yet. Redpanda also needs KIP-848
  (next-gen consumer groups) which is tracked in issue #29223.
- **Local dev**: Very light. Single binary, no JVM. Starts in milliseconds.
- **Spring Boot**: Spring Kafka client works (Kafka API-compatible).
- **Verdict**: Promising for the future. Cloud Topics GA is a milestone, but the
  lack of KIP-932 means the worker workload still needs workarounds. Worth
  watching.

#### StreamNative Ursa for Kafka (Lakestream, April 2026) 🆕

- **Architecture**: A **fork of Apache Kafka 4.2+** that adds an S3-backed
  storage engine (Ursa) as an alternative to local disk. Not a proxy or
  compatibility layer — it runs the actual Kafka code. Per-topic profiles:
  latency-optimized (local disk) or cost-optimized (S3). Uses Oxia for metadata
  (replacing ZooKeeper/KRaft for storage metadata).
- **Storage separation**: True for cost-optimized topics. Data in S3, WAL in
  S3, compacted to Parquet. Brokers are leaderless (any broker can serve any
  partition). **This is the only option that gives BOTH Kafka 4.x Share Groups
  AND S3 storage separation.**
- **API**: Full Kafka 4.2+ protocol. Includes KIP-932 Share Groups, KIP-848
  next-gen consumer groups, and all Kafka 4.x features.
- **Queue semantics**: ✅ Yes — it IS Kafka 4.2.
- **Local dev**: Moderate. Multiple broker JVMs + object storage (MinIO/S3).
- **Spring Boot**: Spring Kafka 4.x (first-party).
- **Verdict**: Theoretically the best of both worlds — S3-backed, fully Kafka
  4.2 compatible with Share Groups. **But**: released April 2026 (one month
  ago). StreamNative is the primary vendor. The open-source licensing and
  community governance model of the Kafka fork are unclear. Extremely bleeding
  edge for a solo practice project.

#### Apache RocketMQ 5.x

- **Architecture**: Two-layer — lightweight NameServer (metadata) + Broker
  (storage and compute). Storage is local disk (CommitLog + ConsumeQueue).
  RocketMQ 5.x introduced a proxy mode that separates client connections from
  brokers, and an **experimental S3 tiered storage backend** ([PR #6495](https://github.com/apache/rocketmq/pull/6495),
  merged/closed). But the default and battle-tested deployment is still
  local-disk brokers.
- **Storage separation**: **Not truly separated.** Proxy mode provides some
  decoupling, S3 tiered storage is experimental, but the primary architecture
  binds storage to broker nodes. A community project `automq-for-rocketmq` aims
  to bring full S3 backing to RocketMQ, but it's not production-ready.
- **API**: Native RocketMQ protocol.
- **Queue semantics**: ✅ Excellent native support. Retry with backoff, DLQ,
  scheduled/delayed messages, transactional messages — all broker-level.
- **Local dev**: Very light. 2 containers (NameServer + Broker). Under 1 GB RAM.
  Starts in 10-20 seconds.
- **Spring Boot**: `rocketmq-spring-boot-starter` v2.3.0 (community-maintained,
  mature).
- **Verdict**: Best operational ergonomics for a solo developer. Handles both
  workloads perfectly. Java-native. But **does not deliver true compute-storage
  separation** — if that's the primary learning goal, RocketMQ doesn't satisfy
  it.

### What About Pravega?

Pravega (Dell/EMC) is a storage-compute separated streaming system with its own
storage layer. It uses a custom API, has a niche community, and is not suitable
for a practice project aiming to learn widely-applicable skills.

## Head-to-Head: Pulsar vs RocketMQ (Updated)

With the 64 GB RAM constraint change:

| Dimension | Apache Pulsar | Apache RocketMQ |
|---|---|---|
| **Compute-storage separation** | ✅ True, mature (BookKeeper) | ❌ Partial (proxy mode, experimental S3) |
| **RAM usage (local dev)** | 4-6 GB (fine w/ 64 GB host) | < 1 GB |
| **Startup time** | 30-60s | 10-20s |
| **Container count** | 3 (or 1 in standalone) | 2 |
| **Danmaku pub/sub** | ✅ Excellent | ✅ Excellent |
| **Worker queue semantics** | ✅ Excellent | ✅ Excellent |
| **Spring Boot integration** | Good (official starter) | Good (community starter) |
| **Java native** | Multi-JVM (all Java) | Multi-JVM (all Java) |
| **Community / docs** | Large, English | Large, Chinese-heavy |
| **Learning value** | BookKeeper, tiered storage, multi-tenancy | CommitLog, zero-copy, business messaging |
| **K8s scale-out** | ✅ Fast (stateless brokers) | ❌ Slow (data rebalancing) |
| **Architectural purity for goal** | ✅ Yes | ❌ No |

## Analysis

### The Original Recommendation vs New Reality

The first draft of this ADL recommended RocketMQ, primarily on operational
grounds: Pulsar's 3-JVM footprint was deemed too heavy for a solo developer.

The 64 GB RAM changes that calculus. Pulsar's memory consumption is no longer a
practical problem. The remaining friction points (startup time, configuration
complexity, 3 containers) are real but manageable — and arguably are **part of
the learning experience** for someone who wants to understand compute-storage
separated architectures.

### What Pulsar Gives You That RocketMQ Doesn't

1. **Hands-on experience with a production compute-storage separated system.**
   You'll configure, debug, and understand BookKeeper segments, ledger
   management, and tiered storage — skills that transfer to understanding how
   newer systems (Ursa, WarpStream, Cloud Topics) work under the hood.

2. **A closer architectural match to the danmaku domain.** Bilibili, the
   real-world inspiration for a danmaku video site, uses Pulsar at massive
   scale. The architecture patterns you learn will map directly to real
   industry practice.

3. **Future Kubernetes readiness.** When you move to K8s, Pulsar's stateless
   brokers scale instantly without data rebalancing. RocketMQ will require
   StatefulSet management and rebalancing.

### What RocketMQ Still Does Better

1. **Faster iteration.** 10-20s startup vs 30-60s. Over hundreds of dev
   sessions, this adds up.

2. **Simpler mental model.** Two components (NameServer + Broker) vs three
   (ZooKeeper + BookKeeper + Broker). Easier to reason about during debugging.

3. **Better worker queue experience.** RocketMQ's native retry/DLQ/scheduled
   messages are more polished than Pulsar's equivalents. Less application code
   to write for the `apps/worker` module.

### The Ursa for Kafka Wildcard

StreamNative's Ursa for Kafka (April 2026) is theoretically perfect: S3 storage
+ full Kafka 4.2 protocol including Share Groups. But it's one month old, the
governance model is unclear, and adopting a vendor fork as the backbone of a
practice project is risky. It's worth monitoring, not adopting today.

## Recommendation: Apache Pulsar (Revised)

With the 64 GB RAM constraint change, **Apache Pulsar** is the right choice.

The original recommendation of RocketMQ was correct under the assumption of
constrained local resources. With that constraint removed, the trade-off flips:
Pulsar delivers the compute-storage separation you explicitly want to learn,
handles both workloads natively, and maps directly to the danmaku domain
(Bilibili). The operational overhead is real but acceptable — and the learning
from managing a 3-tier architecture is itself valuable.

### Revised Rationale

1. **You explicitly want to learn compute-storage separation.** Pulsar is the
   only mature, open-source, non-vendor-controlled broker that delivers this
   today. RocketMQ does not.

2. **64 GB RAM eliminates the main practical objection.** The "3 JVM tax" is no
   longer a daily pain point.

3. **Both brokers are equally good for your workloads.** No functional gap.
   This means the decision turns on the architectural property you care about,
   and Pulsar wins there.

4. **Bilibili uses Pulsar.** For a danmaku video site, this is meaningful.
   The architectural patterns are proven in your domain.

5. **ADL-002 already chose Pulsar.** Reverting to the original choice avoids
   churn, and the original rationale (mitigate setup complexity with AI, use
   Docker Compose guides) was actually fine — it was the RAM concern that was
   the hidden objection. With that resolved, ADL-002's choice stands.

### Mitigations for Pulsar's Friction Points

| Concern | Mitigation |
|---|---|
| 3 containers to manage | Define them once in `infra/compose/` as reusable service bases, same pattern as existing postgres/redis/flyway |
| 30-60s startup | Accept it. It's a coffee break, not a workflow killer |
| ZooKeeper knowledge required | AI agents + official docs handle the config. Learning ZooKeeper is valuable anyway |
| Debugging complexity | Use `docker compose logs -f <service>` per component. The isolation actually helps debugging |
| Future K8s migration | Pulsar has official Helm charts and operators. Easier than RocketMQ on K8s |

## Next Steps

1. **Keep** Apache Pulsar in `backend/docs/tech-stack.md`.
2. Add Pulsar (ZooKeeper + BookKeeper + Broker, or standalone) to
   `infra/compose/` as shared service bases.
3. Uncomment `spring-boot-starter-pulsar` in `build.gradle.kts` when ready to
   integrate.
4. Monitor:
   - [AutoMQ issue #2950](https://github.com/AutoMQ/automq/issues/2950) — if
     Kafka 4.0 support lands, re-evaluate.
   - [Redpanda issue #26434](https://github.com/redpanda-data/redpanda/issues/26434)
     — KIP-932 for Redpanda.
   - StreamNative Ursa for Kafka — if it stabilizes and proves community
     governance, it could be the ideal long-term target.

## References

- [ADL-001: Project Structure Baseline](001-project-structure-baseline.md)
- [ADL-002: Messaging Broker Choice (original)](002-messaging-broker-choice.md)
- [Apache Pulsar 4.1.x Docs](https://pulsar.apache.org/docs/4.1.x/)
- [Apache RocketMQ 5.x Docs](https://rocketmq.apache.org/docs/)
- [AutoMQ Compatibility with Apache Kafka](https://github.com/AutoMQ/automq/wiki/Compatibility-with-Apache-Kafka) — confirms AutoMQ v1.0.x adapted to Kafka 3.7.x
- [AutoMQ Apache Kafka 4.0 Wiki](https://github.com/AutoMQ/automq/wiki/Apache-Kafka-4.0:-KRaft,-New-Features,-and-Migration) — documents Kafka 4.0 features but does not claim support
- [WarpStream Protocol and Feature Support](https://docs.warpstream.com/warpstream/kafka/reference/protocol-and-feature-support) — no Share Groups
- [Redpanda issue #26434: Support KIP-932](https://github.com/redpanda-data/redpanda/issues/26434) — open, waiting for upstream KIP-932 GA
- [Redpanda Cloud Topics Architecture](https://www.redpanda.com/blog/cloud-topics-architecture) — GA in v26.1 (March 2026)
- [StreamNative Ursa for Kafka Deep Dive](https://streamnative.io/blog/ursa-for-kafka-deep-dive-the-kafka-problem-and-ursas-storage-leaderless-architecture) — Kafka 4.2+ fork with S3 storage (April 2026)
- [RocketMQ PR #6495: S3 backend in TieredStorage](https://github.com/apache/rocketmq/pull/6495) — experimental S3 support
- [RocketMQ 5.0 Stateless Proxy Mode](https://www.alibabacloud.com/blog/rocketmq-5-0-exploration-and-practice-of-stateless-proxy-mode_599584)
