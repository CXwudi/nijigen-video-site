# syntax=docker/dockerfile:1

FROM scratch AS backend-source
COPY backend/ /workspace/backend/

## JVM build stages

FROM eclipse-temurin:25-jdk AS jvm-base
WORKDIR /workspace/backend
COPY --from=backend-source /workspace/backend /workspace/backend
RUN chmod 0755 gradlew

FROM jvm-base AS jvm-gradle
ENTRYPOINT ["./gradlew", "--no-daemon"]
CMD [":apps:api:run"]

FROM jvm-base AS jvm-dev
EXPOSE 8080 5005
ENTRYPOINT ["bash", "-lc"]
CMD ["./gradlew --no-daemon :apps:api:installDist && exec apps/api/build/install/api/api"]

FROM jvm-base AS jvm-build
RUN --mount=type=cache,target=/root/.gradle \
    ./gradlew --no-daemon :apps:api:distZip
RUN set -eux; \
    dist_zip="$(find apps/api/build/distributions -maxdepth 1 -type f -name '*.zip' | head -n 1)"; \
    test -n "$dist_zip"; \
    mkdir -p /workspace/dist/unpacked; \
    mkdir -p /workspace/dist/app; \
    cd /workspace/dist/unpacked; \
    jar xf "/workspace/backend/$dist_zip"; \
    dist_dir="$(find . -maxdepth 1 -mindepth 1 -type d | head -n 1)"; \
    test -n "$dist_dir"; \
    cp -R "$dist_dir"/. /workspace/dist/app/

FROM eclipse-temurin:25-jre AS jvm-runtime
WORKDIR /app
COPY --from=jvm-build /workspace/dist/app/ /app/
EXPOSE 8080
ENTRYPOINT ["/app/api"]

## Native image build stages

FROM ghcr.io/graalvm/native-image-community:25 AS native-build
WORKDIR /workspace/backend
COPY --from=backend-source /workspace/backend /workspace/backend
RUN chmod 0755 gradlew
ENTRYPOINT ["./gradlew", "--no-daemon"]
CMD [":apps:api:nativeCompile"]

FROM native-build AS native-compile
RUN --mount=type=cache,target=/root/.gradle \
    ./gradlew --no-daemon :apps:api:nativeCompile
RUN set -eux; \
    binary_path="$(find apps/api/build/native/nativeCompile -maxdepth 1 -type f -perm /111 | head -n 1)"; \
    test -n "$binary_path"; \
    mkdir -p /workspace/dist; \
    cp "$binary_path" /workspace/dist/api

FROM debian:bookworm-slim AS native-runtime
WORKDIR /app

# The native executable is smaller than a JVM runtime, but it still expects a
# glibc-based userspace and CA certificates for normal service behavior.
RUN apt-get update \
    && apt-get install --yes --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY --from=native-compile /workspace/dist/api /app/api
EXPOSE 8080
ENTRYPOINT ["/app/api"]
