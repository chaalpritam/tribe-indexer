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
