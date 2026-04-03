-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id          BIGSERIAL PRIMARY KEY,
  tid         BIGINT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('follow', 'like', 'reply', 'mention')),
  from_tid    BIGINT,
  tweet_hash  TEXT,
  read        BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_tid ON notifications (tid, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications (tid, read) WHERE read = false;

-- User profiles (off-chain metadata)
CREATE TABLE IF NOT EXISTS user_profiles (
  tid         BIGINT PRIMARY KEY,
  display_name TEXT,
  bio         TEXT,
  avatar_url  TEXT,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Bookmarks
CREATE TABLE IF NOT EXISTS bookmarks (
  tid         BIGINT NOT NULL,
  tweet_hash  TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (tid, tweet_hash)
);

CREATE INDEX IF NOT EXISTS idx_bookmarks_tid ON bookmarks (tid, created_at DESC);
