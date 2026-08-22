export interface SafeUserSource {
  _id: { toString(): string };
  name: string;
  email: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}

export function toSafeUser(user: SafeUserSource) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
