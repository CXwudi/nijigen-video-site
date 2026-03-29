plugins {
  id("my.lib")
}

dependencies {
  implementation(platform(libs.bom.springBoot))
}
