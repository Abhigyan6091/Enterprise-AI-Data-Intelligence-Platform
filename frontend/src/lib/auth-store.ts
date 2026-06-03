export interface StoredUser {
  id: string
  name: string
  email: string
  password: string
  created_at: number
}

const users = new Map<string, StoredUser>()

export function getUsers(): Map<string, StoredUser> {
  return users
}

export function findUserByEmail(email: string): StoredUser | undefined {
  return users.get(email.toLowerCase())
}

export function addUser(user: StoredUser): void {
  users.set(user.email, user)
}
