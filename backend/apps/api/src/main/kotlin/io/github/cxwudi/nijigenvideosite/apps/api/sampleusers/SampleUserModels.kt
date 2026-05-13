package io.github.cxwudi.nijigenvideosite.apps.api.sampleusers

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size
import java.time.OffsetDateTime

/**
 * Sample user row exposed by the temporary CRUD API.
 */
data class SampleUser(
  val id: Long,
  val username: String,
  val displayName: String,
  val createdAt: OffsetDateTime,
)

/**
 * Request body used to create a sample user.
 */
data class CreateSampleUserRequest(
  @field:NotBlank
  @field:Size(max = 64)
  val username: String,

  @field:NotBlank
  @field:Size(max = 120)
  val displayName: String,
)

/**
 * Request body used to replace editable sample user fields.
 */
data class UpdateSampleUserRequest(
  @field:NotBlank
  @field:Size(max = 64)
  val username: String,

  @field:NotBlank
  @field:Size(max = 120)
  val displayName: String,
)
