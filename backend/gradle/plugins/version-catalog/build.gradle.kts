import com.github.gmazzo.buildconfig.BuildConfigClassSpec

plugins {
  `embedded-kotlin`
  alias(libs.plugins.buildConfig)
}

buildConfig {
  generateAtSync = false
  useKotlinOutput {
    internalVisibility = false
  }

  forClass(packageName = "my.catalog", className = "Versions") {
    buildConfigIntField("Java", provider { "25" })
  }

  forClass(packageName = "my.catalog", className = "Libs") {
    buildConfigStringField("SpringBootBom", libs.bom.springBoot)
    buildConfigStringField("JunitBom", libs.bom.junit)
    buildConfigStringField("Mockk", libs.dep.mockk)
  }
}

fun BuildConfigClassSpec.buildConfigStringField(name: String, value: Provider<*>) {
  buildConfigField(String::class.java, name, value.map { "$it" })
}

fun BuildConfigClassSpec.buildConfigIntField(name: String, value: Provider<String>) {
  buildConfigField(Int::class.java, name, value.map { it.toInt() })
}
