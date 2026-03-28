pluginManagement {
  repositories {
    gradlePluginPortal()
    mavenCentral()
  }

  // The root build is shaped around an internal composite build, but we defer
  // enabling it until Task 2 creates the actual plugin build under gradle/plugins.
  // includeBuild("gradle/plugins")
}

dependencyResolutionManagement {
  repositoriesMode = RepositoriesMode.FAIL_ON_PROJECT_REPOS

  repositories {
    mavenCentral()
  }

  // gradle/libs.versions.toml is auto-imported by Gradle.
}

rootProject.name = "nijigen-video-site-backend"

include("apps:api")
include("modules:common")
