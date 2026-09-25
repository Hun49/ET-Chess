export interface User {
  id: string;
  displayName: string;
  createdAt: Date;
}

export interface Report {
  id: string;
  reporterId: string;
  reason: string;
  createdAt: Date;
}
