import NextAuth, { NextAuthOptions, Session, Account } from "next-auth";
import { JWT } from "next-auth/jwt";
import GoogleProvider from "next-auth/providers/google";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import clientPromise from "@/lib/clientPromise";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
  ],
  adapter: MongoDBAdapter(clientPromise),
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  callbacks: {
  async jwt({ token, account, user }) {
    if (account) {
      token.accessToken = account.access_token;
    }
    if (user) {
      token.id = (user as any).id || (user as any)._id;
    }
    return token;
  },
  async session({ session, token }) {
    (session as any).accessToken = token.accessToken;
    (session as any).user.id = token.id; // ✅ attach MongoDB userId to session
    return session;
  },
  async redirect({ url, baseUrl }) {
    return `${baseUrl}/home`;
  },
},
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };    


