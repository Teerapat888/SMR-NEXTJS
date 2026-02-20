import { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: 'admin' | 'nurse' | 'triage'
    } & DefaultSession['user']
  }

  interface User {
    role: 'admin' | 'nurse' | 'triage'
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: 'admin' | 'nurse' | 'triage'
    userId: string
  }
}
