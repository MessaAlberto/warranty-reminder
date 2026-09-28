/** The minimum trusted identity retained in the encrypted application session. */
export interface AuthenticatedUser {
  email: string;
  name: string;
  picture?: string;
  initials: string;
}

export type GoogleAuthenticationResult =
  | { status: "authenticated"; user: AuthenticatedUser }
  | { status: "access_denied" }
  | { status: "invalid_callback" };
