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

-- Retweets
CREATE TABLE IF NOT EXISTS retweets (
  tid         BIGINT NOT NULL,
  tweet_hash  TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (tid, tweet_hash)
);

CREATE INDEX IF NOT EXISTS idx_retweets_tid ON retweets (tid, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_retweets_hash ON retweets (tweet_hash);

-- Lists
CREATE TABLE IF NOT EXISTS lists (
  id          BIGSERIAL PRIMARY KEY,
  owner_tid   BIGINT NOT NULL,
  name        TEXT NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS list_members (
  list_id     BIGINT NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
  member_tid  BIGINT NOT NULL,
  added_at    TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (list_id, member_tid)
);

CREATE INDEX IF NOT EXISTS idx_lists_owner ON lists (owner_tid);
CREATE INDEX IF NOT EXISTS idx_list_members_list ON list_members (list_id);
