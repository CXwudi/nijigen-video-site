import my.catalog.Libs
import my.catalog.Versions

plugins {
  java
  kotlin("jvm")
}

java {
  toolchain {
    languageVersion.set(JavaLanguageVersion.of(Versions.Java))
    nativeImageCapable = true
  }
}

tasks.withType<JavaCompile>().configureEach {
  options.apply {
    encoding = "UTF-8"
    compilerArgs.add("-parameters")
    isFork = true
  }
}

kotlin {
  compilerOptions {
    javaParameters = true
    freeCompilerArgs.set(freeCompilerArgs.get() + listOf("-Xjsr305=strict"))
  }
}

tasks.withType<Test>().configureEach {
  useJUnitPlatform()
}

dependencies {
  testImplementation(platform(Libs.JunitBom))
  testImplementation(Libs.JunitJupiter)
  testImplementation(Libs.Mockk)
}
