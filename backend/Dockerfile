# syntax=docker/dockerfile:1

ARG JDK_VERSION

## Shared Gradle build stage

FROM ghcr.io/bell-sw/hardened-liberica-native-image-kit-container:jdk-${JDK_VERSION}-nik-${JDK_VERSION}-glibc AS gradle-base
ARG JDK_VERSION
ENV JDK_VERSION="${JDK_VERSION}"
WORKDIR /workspace/backend
COPY . /workspace/backend/
RUN chmod 0755 gradlew
ENTRYPOINT ["./gradlew", "--no-daemon"]

## api JVM build stages

FROM gradle-base AS api-jvm-build
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

FROM ghcr.io/bell-sw/hardened-liberica-runtime-container:jre-${JDK_VERSION}-crac-glibc AS api-jvm-runtime
# TODO(new issue, optional): investigate and configure CRAC
WORKDIR /app
COPY --from=api-jvm-build /workspace/dist/app/ /app/
EXPOSE 8080
ENTRYPOINT ["/app/api"]

## api Native image build stages

FROM gradle-base AS api-native-build
RUN --mount=type=cache,target=/root/.gradle \
    ./gradlew --no-daemon :apps:api:nativeCompile
RUN set -eux; \
    binary_path="$(find apps/api/build/native/nativeCompile -maxdepth 1 -type f -perm /111 | head -n 1)"; \
    test -n "$binary_path"; \
    mkdir -p /workspace/dist; \
    cp "$binary_path" /workspace/dist/api

FROM ghcr.io/bell-sw/hardened-base:glibc AS api-native-runtime
WORKDIR /app
COPY --from=api-native-build /workspace/dist/api /app/api
EXPOSE 8080
ENTRYPOINT ["/app/api"]
