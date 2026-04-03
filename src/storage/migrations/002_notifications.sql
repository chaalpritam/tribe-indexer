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

-- Encrypted DMs
CREATE TABLE IF NOT EXISTS dm_keys (
  tid             BIGINT PRIMARY KEY,
  x25519_pubkey   TEXT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dm_conversations (
  id          BIGSERIAL PRIMARY KEY,
  tid_a       BIGINT NOT NULL,
  tid_b       BIGINT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tid_a, tid_b)
);

CREATE TABLE IF NOT EXISTS dm_messages (
  id              BIGSERIAL PRIMARY KEY,
  conversation_id BIGINT NOT NULL REFERENCES dm_conversations(id),
  sender_tid      BIGINT NOT NULL,
  encrypted_text  TEXT NOT NULL,
  nonce           TEXT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dm_conversations_a ON dm_conversations (tid_a);
CREATE INDEX IF NOT EXISTS idx_dm_conversations_b ON dm_conversations (tid_b);
CREATE INDEX IF NOT EXISTS idx_dm_messages_conv ON dm_messages (conversation_id, created_at DESC);
