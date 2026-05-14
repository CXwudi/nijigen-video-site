package io.github.cxwudi.nijigenvideosite.apps.api.sampleusers

import java.time.OffsetDateTime
import org.springframework.jdbc.core.RowMapper
import org.springframework.jdbc.core.simple.JdbcClient
import org.springframework.stereotype.Repository

/**
 * JDBC repository for the disposable `sample_users` table.
 */
@Repository
class SampleUserRepository(private val jdbcClient: JdbcClient) {

  /**
   * Inserts a sample user and returns the persisted row.
   */
  fun create(request: CreateSampleUserRequest): SampleUser =
    jdbcClient
      .sql(
        """
        INSERT INTO sample_users (username, email, display_name, bio)
        VALUES (:username, :email, :displayName, :bio)
        RETURNING id, username, email, display_name, bio, created_at
        """.trimIndent(),
      )
      .param("username", request.username)
      .param("email", request.email)
      .param("displayName", request.displayName)
      .param("bio", request.bio)
      .query(sampleUserRowMapper)
      .single()

  /**
   * Finds a sample user by primary key.
   */
  fun findById(id: Long): SampleUser? =
    jdbcClient
      .sql(
        """
        SELECT id, username, email, display_name, bio, created_at
        FROM sample_users
        WHERE id = :id
        """.trimIndent(),
      )
      .param("id", id)
      .query(sampleUserRowMapper)
      .optional()
      .orElse(null)

  /**
   * Lists all sample users in stable insertion order.
   */
  fun findAll(): List<SampleUser> =
    jdbcClient
      .sql(
        """
        SELECT id, username, email, display_name, bio, created_at
        FROM sample_users
        ORDER BY id
        """.trimIndent(),
      )
      .query(sampleUserRowMapper)
      .list()

  /**
   * Replaces editable fields for an existing sample user.
   */
  fun update(id: Long, request: UpdateSampleUserRequest): SampleUser? =
    jdbcClient
      .sql(
        """
        UPDATE sample_users
        SET username = :username,
            email = :email,
            display_name = :displayName,
            bio = :bio
        WHERE id = :id
        RETURNING id, username, email, display_name, bio, created_at
        """.trimIndent(),
      )
      .param("id", id)
      .param("username", request.username)
      .param("email", request.email)
      .param("displayName", request.displayName)
      .param("bio", request.bio)
      .query(sampleUserRowMapper)
      .optional()
      .orElse(null)

  /**
   * Deletes a sample user by primary key.
   */
  fun deleteById(id: Long): Boolean =
    jdbcClient
      .sql(
        """
        DELETE FROM sample_users
        WHERE id = :id
        """.trimIndent(),
      )
      .param("id", id)
      .update() == 1

  private companion object {
    private val sampleUserRowMapper =
      RowMapper { resultSet, _ ->
        SampleUser(
          id = resultSet.getLong("id"),
          username = resultSet.getString("username"),
          email = resultSet.getString("email"),
          displayName = resultSet.getString("display_name"),
          bio = resultSet.getString("bio"),
          createdAt = resultSet.getObject("created_at", OffsetDateTime::class.java),
        )
      }
  }
}
