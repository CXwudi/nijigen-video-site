# syntax=docker/dockerfile:1

## Shared Gradle build stage

FROM ghcr.io/bell-sw/hardened-liberica-native-image-kit-container:jdk-25-nik-25-glibc AS gradle-base
WORKDIR /workspace/backend
COPY backend/ /workspace/backend/
RUN chmod 0755 gradlew
ENTRYPOINT ["./gradlew", "--no-daemon"]

## JVM build stages

FROM gradle-base AS jvm-build
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

FROM ghcr.io/bell-sw/hardened-liberica-runtime-container:jre-25-glibc AS jvm-runtime
WORKDIR /app
COPY --from=jvm-build /workspace/dist/app/ /app/
EXPOSE 8080
ENTRYPOINT ["/app/api"]

## Native image build stages

FROM gradle-base AS native-build
RUN --mount=type=cache,target=/root/.gradle \
    ./gradlew --no-daemon :apps:api:nativeCompile
RUN set -eux; \
    binary_path="$(find apps/api/build/native/nativeCompile -maxdepth 1 -type f -perm /111 | head -n 1)"; \
    test -n "$binary_path"; \
    mkdir -p /workspace/dist; \
    cp "$binary_path" /workspace/dist/api

FROM ghcr.io/bell-sw/hardened-base:glibc AS native-runtime
WORKDIR /app
COPY --from=native-build /workspace/dist/api /app/api
EXPOSE 8080
ENTRYPOINT ["/app/api"]
