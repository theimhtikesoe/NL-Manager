export type AuthUser = {
  id: number;
  username: string;
  name: string;
  role: "admin" | "worker";
};

export type TrpcContext = {
  user: AuthUser | null;
};
