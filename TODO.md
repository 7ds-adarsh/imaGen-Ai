# TODO: Setup Next-Auth

- [ ] Install @next-auth/mongodb-adapter dependency
- [ ] Export authOptions from app/api/auth/[...nextauth]/route.ts
- [ ] Add SessionProvider to app/layout.tsx
- [ ] Update app/page.tsx to use useSession from next-auth/react instead of getServerSession
- [ ] Ensure environment variables are set (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, NEXTAUTH_SECRET, NEXTAUTH_URL)
- [ ] Test authentication flow
