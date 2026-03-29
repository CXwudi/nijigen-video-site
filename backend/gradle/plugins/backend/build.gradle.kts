plugins {
  `kotlin-dsl`
}

dependencies {
  implementation(project(":version-catalog"))
  implementation(libs.pluginDep.kotlin)
  implementation(libs.pluginDep.springBoot)
  implementation(libs.pluginDep.graalvmNative)
}
