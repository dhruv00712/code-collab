// import NextAuth from 'next-auth';
// import Google from 'next-auth/providers/google';
// import { MongoDBAdapter } from '@auth/mongodb-adapter';
// import clientPromise from '@/lib/clientPromise';

// export const { handlers, auth, signIn, signOut } = NextAuth({
//     providers: [
//         Google({
//             clientId: process.env.GOOGLE_CLIENT_ID!,
//             clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
//         }),
//     ],
//     adapter: MongoDBAdapter(clientPromise),
//     secret: process.env.NEXTAUTH_SECRET,
//     session: { strategy: 'jwt' },
//     callbacks: {
//         async jwt({ token, account, user }) {
//             if (account) token.accessToken = account.access_token;
//             if (user) {
//                 token.id = user.id;
//                 token.name = user.name;
//             }
//             return token;
//         },
//         async session({ session, token }) {
//             if (session.user) {
//                 session.user.id = token.id as string;
//                 session.user.name = token.name as string;
//             }
//             return session;
//         },
//         async redirect({ baseUrl }) {
//             return `${baseUrl}/home`;
//         },
//     },
// });
import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { MongoDBAdapter } from '@auth/mongodb-adapter';
import clientPromise from '@/lib/clientPromise';

export const { handlers, auth, signIn, signOut } = NextAuth({
    providers: [
        Google({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            authorization: {
                params: {
                    prompt: 'select_account', // ✅ Fixes Google identity error
                },
            },
        }),
    ],
    adapter: MongoDBAdapter(clientPromise),
    secret: process.env.NEXTAUTH_SECRET,
    session: {
        strategy: 'database', // ✅ Was 'jwt' — this was the main bug
        maxAge: 30 * 24 * 60 * 60,
    },
    callbacks: {
        async session({ session, user }) { // ✅ 'user' instead of 'token'
            if (session.user) {
                session.user.id = user.id;
            }
            return session;
        },
        async redirect({ url, baseUrl }) {
            // Always land on /home after sign-in.
            // Sign-out redirect is handled client-side (redirect: false + router.push).
            if (url.startsWith(baseUrl)) return `${baseUrl}/home`;
            if (url.startsWith('/')) return `${baseUrl}${url}`;
            return `${baseUrl}/home`;
        },
    },
});