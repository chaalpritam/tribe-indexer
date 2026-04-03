export interface SolanaLogEvent {
  signature: string;
  slot: number;
  logs: string[];
}

export interface IndexedUser {
  tid: string;
  custodyAddress: string;
  recoveryAddress: string;
  registeredAt: Date;
  username: string | null;
}

export interface IndexedFollowEvent {
  followerTid: string;
  followingTid: string;
  createdAt: Date;
}
