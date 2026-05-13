package io.github.cxwudi.nijigenvideosite.apps.api.sampleusers

import java.util.UUID
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.http.MediaType
import org.springframework.jdbc.core.simple.JdbcClient
import org.springframework.test.annotation.Rollback
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.context.transaction.AfterTransaction
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import org.springframework.transaction.annotation.Transactional
import tools.jackson.databind.ObjectMapper
import tools.jackson.module.kotlin.readValue

/**
 * Verifies the sample-user API against the real Spring MVC and JDBC stack.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
@Rollback
class SampleUserControllerIntegrationTests @Autowired constructor(
  private val mockMvc: MockMvc,
  private val objectMapper: ObjectMapper,
  private val jdbcClient: JdbcClient,
) {
  private val usernamePrefix = "sut-${UUID.randomUUID().toString().take(8)}-"

  /**
   * Verifies that a created sample user can be fetched directly and listed.
   */
  @Test
  fun createReadAndListSampleUser() {
    val username = nextUsername("create-read-list")
    val created = postSampleUser(
      CreateSampleUserRequest(
        username = username,
        email = nextEmail("create-read-list"),
        displayName = "Create Read List",
        bio = "Created during a rollback-safe integration test.",
      ),
    )

    mockMvc
      .perform(get("/sample-users/{id}", created.id))
      .andExpect(status().isOk)
      .andExpect(jsonPath("\$.id").value(created.id))
      .andExpect(jsonPath("\$.username").value(username))
      .andExpect(jsonPath("\$.email").value(nextEmail("create-read-list")))
      .andExpect(jsonPath("\$.displayName").value("Create Read List"))
      .andExpect(jsonPath("\$.bio").value("Created during a rollback-safe integration test."))

    val listResult = mockMvc
      .perform(get("/sample-users"))
      .andExpect(status().isOk)
      .andReturn()

    val listedUsers = objectMapper.readValue<List<SampleUser>>(
      listResult.response.contentAsString,
    )

    assertTrue(
      listedUsers.any { sampleUser ->
        sampleUser.id == created.id && sampleUser.username == username
      },
      "Expected the created sample user to be present in the list response.",
    )
  }

  /**
   * Verifies that editable sample-user fields can be updated before deletion.
   */
  @Test
  fun updateAndDeleteSampleUser() {
    val created = postSampleUser(
      CreateSampleUserRequest(
        username = nextUsername("update-delete"),
        email = nextEmail("update-delete"),
        displayName = "Before Update",
        bio = null,
      ),
    )

    val updatedUsername = nextUsername("updated")
    val updatedEmail = nextEmail("updated")
    val updateResult = mockMvc
      .perform(
        put("/sample-users/{id}", created.id)
          .contentType(MediaType.APPLICATION_JSON)
          .content(
            objectMapper.writeValueAsString(
              UpdateSampleUserRequest(
                username = updatedUsername,
                email = updatedEmail,
                displayName = "After Update",
                bio = "Updated bio",
              ),
            ),
          ),
      )
      .andExpect(status().isOk)
      .andExpect(jsonPath("\$.id").value(created.id))
      .andExpect(jsonPath("\$.username").value(updatedUsername))
      .andExpect(jsonPath("\$.email").value(updatedEmail))
      .andExpect(jsonPath("\$.displayName").value("After Update"))
      .andExpect(jsonPath("\$.bio").value("Updated bio"))
      .andReturn()

    val updated = objectMapper.readValue<SampleUser>(
      updateResult.response.contentAsString,
    )

    assertEquals(created.id, updated.id)
    assertEquals(updatedUsername, updated.username)
    assertEquals(updatedEmail, updated.email)
    assertEquals("After Update", updated.displayName)
    assertEquals("Updated bio", updated.bio)

    mockMvc
      .perform(delete("/sample-users/{id}", created.id))
      .andExpect(status().isNoContent)

    mockMvc
      .perform(get("/sample-users/{id}", created.id))
      .andExpect(status().isNotFound)
  }

  /**
   * Verifies request validation turns invalid input into a client error.
   */
  @Test
  fun rejectBlankUsername() {
    mockMvc
      .perform(
        post("/sample-users")
          .contentType(MediaType.APPLICATION_JSON)
          .content(
            objectMapper.writeValueAsString(
              CreateSampleUserRequest(
                username = " ",
                email = nextEmail("invalid"),
                displayName = "Invalid User",
              ),
            ),
          ),
      )
      .andExpect(status().isBadRequest)
  }

  /**
   * Verifies transaction rollback removes rows created by each test.
   */
  @AfterTransaction
  fun sampleUsersCreatedByTestsAreRolledBack() {
    val remainingTestRows = jdbcClient
      .sql(
        """
        SELECT COUNT(*)
        FROM sample_users
        WHERE username LIKE :usernamePrefix
        """.trimIndent(),
      )
      .param("usernamePrefix", "$usernamePrefix%")
      .query(Long::class.java)
      .single()

    assertEquals(
      0L,
      remainingTestRows,
      "Expected test-created sample users to be removed by transaction rollback.",
    )
  }

  /**
   * Creates a sample user through the public API.
   */
  private fun postSampleUser(request: CreateSampleUserRequest): SampleUser {
    val result = mockMvc
      .perform(
        post("/sample-users")
          .contentType(MediaType.APPLICATION_JSON)
          .content(objectMapper.writeValueAsString(request)),
      )
      .andExpect(status().isCreated)
      .andExpect(jsonPath("\$.username").value(request.username))
      .andExpect(jsonPath("\$.email").value(request.email))
      .andExpect(jsonPath("\$.displayName").value(request.displayName))
      .andReturn()

    return objectMapper.readValue(result.response.contentAsString)
  }

  /**
   * Builds a unique username for this test class execution.
   */
  private fun nextUsername(suffix: String): String = "$usernamePrefix$suffix"

  /**
   * Builds a unique email for this test class execution.
   */
  private fun nextEmail(suffix: String): String = "$usernamePrefix$suffix@example.com"
}
