import my.catalog.Libs
import org.gradle.jvm.application.tasks.CreateStartScripts

plugins {
  id("my.jvm-common")
  application
  kotlin("plugin.spring")
  id("org.springframework.boot")
  id("org.graalvm.buildtools.native")
}

application {
  // Keep generated launch scripts at the app root so the packaged layout stays
  // predictable when this grows into a real runtime module.
  executableDir = ""
}

tasks.named<CreateStartScripts>("startScripts") {
  // Use a wildcard classpath so refreshed jars in the lib directory do not
  // require rewriting every explicit versioned jar name in the script.
  classpath = files("lib/*")
}

dependencies {
  implementation(platform(Libs.SpringBootBom))
  annotationProcessor(platform(Libs.SpringBootBom))
}
