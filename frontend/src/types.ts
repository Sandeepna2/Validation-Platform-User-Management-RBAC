export type TokenResponse = { access_token: string; token_type: string };

export type Me = {
  id: number;
  name: string;
  email: string;
  permissions: string[];
  role_name: string | null;
};

export type UserRow = {
  id: number;
  name: string;
  email: string;
  is_active: boolean;
  role_id: number | null;
  role_name: string | null;
  created_at: string;
};

export type RoleDetail = {
  id: number;
  name: string;
  description: string | null;
  permissions: { id: number; code: string; description: string | null }[];
};

export type ProjectRow = {
  id: number;
  name: string;
  vehicle_platform: string;
  odd_type: string;
  status: string;
  review_status: string;
  created_by_id: number;
  created_at: string;
  updated_at: string;
};
