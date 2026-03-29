package io.github.cxwudi.nijigenvideosite.apps.api

import org.junit.jupiter.api.Test
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.test.context.ActiveProfiles

/**
 * Verifies that the API application context can be created.
 */
@SpringBootTest
@ActiveProfiles("test")
class ApiAppTests {

  /**
   * Loads the Spring application context.
   */
  @Test
  fun contextLoads() {
  }
}
