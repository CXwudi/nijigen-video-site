plugins {
  // Declaring the Kotlin plugin once at the root avoids the duplicate-load
  // warning when convention plugins start applying it in later tasks.
  alias(libs.plugins.kotlinJvm) apply false
}
