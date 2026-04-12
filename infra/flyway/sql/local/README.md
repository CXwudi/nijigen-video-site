# Local Flyway Migrations

Place optional local-only Flyway migrations in this directory.

The `compose.local.yml` override adds this location on top of the shared
baseline migrations, so anything here should stay safe for local development
only and must not become a hidden CI dependency.
