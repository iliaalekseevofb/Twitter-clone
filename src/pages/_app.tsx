import { type AppType } from "next/app";
import { type Session } from "next-auth";
import { SessionProvider } from "next-auth/react";

import { api } from "~/utils/api";

import "~/styles/globals.css";
import Head from "next/head";
import { SideNav } from "~/components/SideNav";

const MyApp: AppType<{ session: Session | null }> = ({
  Component,
  pageProps: { session, ...pageProps },
}) => {
  return (
    <SessionProvider session={session}>
      <Head>
        <title>Twitter clone - Share your tweets easily</title>
        <meta
          name="description"
          content="This is a Twitter clone by iliaalekseevofb"
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="max-w-6xl flex items-start mx-auto sm:pr-4">
        <SideNav/>
        <div className="min-h-screen flex-grow border-x">
          <Component {...pageProps} />
        </div>
      </div>
    </SessionProvider>
  );
};

export default api.withTRPC(MyApp);
