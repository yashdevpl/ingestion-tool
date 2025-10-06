export interface IUserDetails {
  exp: number;
  iat: number;
  auth_time: number;
  jti: string;
  iss: string;
  aud: string;
  sub: string;
  typ: string;
  azp: string;
  nonce: string;
  session_state: string;
  acr: string;
  "allowed-origins": string[];
  realm_access: {
    roles: string[];
  };
  resource_access: {
    account: {
      roles: string[];
    };
  };
  scope: string;
  sid: string;
  email_verified: boolean;
  address: Record<string, unknown>;
  gender: string;
  preferred_username: string;
  given_name: string;
  sys_groups: string[];
  "date-of-birth": string; // ISO date string
  district:
    | {
        id: string;
        name: string;
      }
    | string; // some servers return stringified JSON
  name: string;
  station:
    | {
        id: string;
        name: string;
      }
    | string;
  badge_id: string;
  "contact-no-1": string;
  "contact-no-2": string;
  designation:
    | {
        id: string;
        name: string;
      }
    | string;
  department:
    | {
        id: string;
        name: string;
      }
    | string;
  family_name: string;
  email: string;
}
