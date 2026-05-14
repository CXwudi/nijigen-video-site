CREATE TABLE sample_users (
  id BIGSERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE CHECK (char_length(username) <= 64),
  email TEXT NOT NULL UNIQUE CHECK (char_length(email) <= 255),
  display_name TEXT NOT NULL CHECK (char_length(display_name) <= 120),
  bio TEXT CHECK (bio IS NULL OR char_length(bio) <= 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
