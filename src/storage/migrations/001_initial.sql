CREATE TABLE IF NOT EXISTS fids (
  fid               BIGINT PRIMARY KEY,
  custody_address   TEXT NOT NULL,
  recovery_address  TEXT NOT NULL,
  registered_at     TIMESTAMPTZ NOT NULL,
  username          TEXT,
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS app_keys (
  fid         BIGINT,
  app_pubkey  TEXT,
  scope       INT,
  created_at  TIMESTAMPTZ,
  expires_at  TIMESTAMPTZ,
  revoked     BOOLEAN DEFAULT FALSE,
  PRIMARY KEY (fid, app_pubkey)
);

CREATE TABLE IF NOT EXISTS social_graph (
  follower_fid   BIGINT,
  following_fid  BIGINT,
  created_at     TIMESTAMPTZ,
  deleted_at     TIMESTAMPTZ,
  PRIMARY KEY (follower_fid, following_fid)
);

CREATE TABLE IF NOT EXISTS casts (
  hash         TEXT PRIMARY KEY,
  fid          BIGINT NOT NULL,
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
  fid          BIGINT NOT NULL,
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
CREATE INDEX IF NOT EXISTS idx_fids_custody ON fids (custody_address);
CREATE INDEX IF NOT EXISTS idx_fids_username ON fids (username) WHERE username IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_social_follower ON social_graph (follower_fid) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_social_following ON social_graph (following_fid) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_casts_fid ON casts (fid, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_casts_channel ON casts (channel_id, timestamp DESC) WHERE channel_id IS NOT NULL;
