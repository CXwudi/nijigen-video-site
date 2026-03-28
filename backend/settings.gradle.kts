pluginManagement {
  repositories {
    gradlePluginPortal()
    mavenCentral()
  }

  includeBuild("gradle/plugins")
}

plugins {
  id("my.root-settings-plugins")
}

dependencyResolutionManagement {
  repositoriesMode = RepositoriesMode.FAIL_ON_PROJECT_REPOS

  repositories {
    mavenCentral()
  }

  // gradle/libs.versions.toml is auto-imported by Gradle.
}

rootProject.name = "nijigen-video-site-backend"

develocity {
  buildScan {
    termsOfUseUrl = "https://gradle.com/help/legal-terms-of-use"
    termsOfUseAgree = "yes"
    publishing.onlyIf {
      System.getenv("CI") != null
    }
  }
}

include("apps:api")
include("modules:common")
