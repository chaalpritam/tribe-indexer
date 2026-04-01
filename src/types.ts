export interface SolanaLogEvent {
  signature: string;
  slot: number;
  logs: string[];
}

export interface IndexedUser {
  fid: string;
  custodyAddress: string;
  recoveryAddress: string;
  registeredAt: Date;
  username: string | null;
}

export interface IndexedFollowEvent {
  followerFid: string;
  followingFid: string;
  createdAt: Date;
}
