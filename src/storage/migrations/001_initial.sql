CREATE TABLE IF NOT EXISTS tids (
  tid               BIGINT PRIMARY KEY,
  custody_address   TEXT NOT NULL,
  recovery_address  TEXT NOT NULL,
  registered_at     TIMESTAMPTZ NOT NULL,
  username          TEXT,
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS app_keys (
  tid         BIGINT,
  app_pubkey  TEXT,
  scope       INT,
  created_at  TIMESTAMPTZ,
  expires_at  TIMESTAMPTZ,
  revoked     BOOLEAN DEFAULT FALSE,
  PRIMARY KEY (tid, app_pubkey)
);

CREATE TABLE IF NOT EXISTS social_graph (
  follower_tid   BIGINT,
  following_tid  BIGINT,
  created_at     TIMESTAMPTZ,
  deleted_at     TIMESTAMPTZ,
  PRIMARY KEY (follower_tid, following_tid)
);

CREATE TABLE IF NOT EXISTS tweets (
  hash         TEXT PRIMARY KEY,
  tid          BIGINT NOT NULL,
  parent_hash  TEXT,
  channel_id   TEXT,
  text         TEXT,
  mentions     BIGINT[] DEFAULT '{}',
  embeds       TEXT[] DEFAULT '{}',
  timestamp    TIMESTAMPTZ,
  deleted      BOOLEAN DEFAULT FALSE,
  indexed_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reactions (
  hash         TEXT PRIMARY KEY,
  tid          BIGINT NOT NULL,
  type         INT NOT NULL,
  target_hash  TEXT NOT NULL,
  timestamp    TIMESTAMPTZ,
  deleted      BOOLEAN DEFAULT FALSE,
  indexed_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sync_status (
  source          TEXT PRIMARY KEY,
  last_slot       BIGINT,
  last_timestamp  TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tids_custody ON tids (custody_address);
CREATE INDEX IF NOT EXISTS idx_tids_username ON tids (username) WHERE username IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_social_follower ON social_graph (follower_tid) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_social_following ON social_graph (following_tid) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tweets_tid ON tweets (tid, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_tweets_channel ON tweets (channel_id, timestamp DESC) WHERE channel_id IS NOT NULL;
