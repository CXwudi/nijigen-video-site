dependencyResolutionManagement {
  repositories {
    gradlePluginPortal()
    mavenCentral()
  }

  versionCatalogs {
    create("libs") {
      from(files("../libs.versions.toml"))

      providers.environmentVariable("JDK_VERSION")
        .orNull
        ?.let { version("java", it) }
    }
  }
}

rootProject.name = "backend-gradle-plugins"

fileTree(".").matching {
  include("*/build.gradle.kts")
  include("*/build.gradle")
}.files
  .map { it.parentFile.name }
  .sorted()
  .forEach { include(it) }
