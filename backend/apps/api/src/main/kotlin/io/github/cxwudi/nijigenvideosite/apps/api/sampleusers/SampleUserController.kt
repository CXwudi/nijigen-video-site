package io.github.cxwudi.nijigenvideosite.apps.api.sampleusers

import jakarta.validation.Valid
import java.net.URI
import org.springframework.dao.DuplicateKeyException
import org.springframework.http.HttpStatus
import org.springframework.http.ProblemDetail
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.server.ResponseStatusException

/**
 * REST controller for the temporary sample-user CRUD API.
 */
@RestController
@RequestMapping("/sample-users")
class SampleUserController(private val repository: SampleUserRepository) {

  /**
   * Creates a sample user and returns its canonical API location.
   */
  @PostMapping
  fun create(@Valid @RequestBody request: CreateSampleUserRequest): ResponseEntity<SampleUser> {
    val sampleUser = repository.create(request)

    return ResponseEntity
      .created(URI.create("/sample-users/${sampleUser.id}"))
      .body(sampleUser)
  }

  /**
   * Lists all sample users.
   */
  @GetMapping
  fun list(): List<SampleUser> = repository.findAll()

  /**
   * Returns one sample user by id.
   */
  @GetMapping("/{id}")
  fun findById(@PathVariable id: Long): SampleUser =
    repository.findById(id) ?: throw notFound(id)

  /**
   * Replaces editable fields for one sample user.
   */
  @PutMapping("/{id}")
  fun update(
    @PathVariable id: Long,
    @Valid @RequestBody request: UpdateSampleUserRequest,
  ): SampleUser =
    repository.update(id, request) ?: throw notFound(id)

  /**
   * Deletes one sample user.
   */
  @DeleteMapping("/{id}")
  fun delete(@PathVariable id: Long): ResponseEntity<Void> {
    if (!repository.deleteById(id)) {
      throw notFound(id)
    }

    return ResponseEntity.noContent().build()
  }

  /**
   * Converts duplicate usernames into a client-correctable response.
   */
  @ExceptionHandler(DuplicateKeyException::class)
  @ResponseStatus(HttpStatus.BAD_REQUEST)
  fun handleDuplicateUsername(): ProblemDetail =
    ProblemDetail.forStatusAndDetail(
      HttpStatus.BAD_REQUEST,
      "A sample user with that username already exists.",
    )

  private fun notFound(id: Long): ResponseStatusException =
    ResponseStatusException(HttpStatus.NOT_FOUND, "Sample user $id was not found.")
}
