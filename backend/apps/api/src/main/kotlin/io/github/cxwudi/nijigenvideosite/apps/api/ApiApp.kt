package io.github.cxwudi.nijigenvideosite.apps.api

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication

/**
 * Main Spring Boot application for the HTTP API runtime.
 */
@SpringBootApplication
class ApiApp

/**
 * Starts the API application.
 */
fun main(args: Array<String>) {
  runApplication<ApiApp>(*args)
}
