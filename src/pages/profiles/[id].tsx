import type { GetStaticPaths, GetStaticProps, GetStaticPropsContext, InferGetStaticPropsType, NextPage } from "next";
import { useSession } from "next-auth/react";
import Error from "next/error";
import Head from "next/head";
import Link from "next/link";
import { VscArrowLeft } from "react-icons/vsc";
import { Button } from "~/components/Button";
import { IconHoverEffect } from "~/components/IconHoverEffect";
import { InfiniteTweetList } from "~/components/InfiniteTweetList";
import { ProfileImage } from "~/components/ProfileImage";
import { ssgHelper } from "~/server/api/ssgHelper";
import { api } from "~/utils/api";

const ProfilePage: NextPage<InferGetStaticPropsType<GetStaticProps>> = ({ id }) => {
  const { data: profile } = api.profile.getById.useQuery({ id });
  const trpcUtils = api.useContext();

  const tweets = api.tweet.infiniteProfileFeed.useInfiniteQuery(
    {userId: id},
    {getNextPageParam: (lastPage) => lastPage.nextCursor}
  );

  const toggleFollow = api.profile.toggleFollow.useMutation({
    onSuccess: ({ addedFollow }) => {
      trpcUtils.profile.getById.setData({id}, oldData => {
        if (oldData == null) return;

        const countModifier = addedFollow ? 1 : -1;

        return {
          ...oldData,
          isFollowing: addedFollow,
          followersCount: oldData.followersCount + countModifier
        }
      })
    }
  })

  if (profile == null || profile.name == null) {
    return (
      <Error statusCode={404} />
    )
  }
  
  return (
    <>
      <Head>
        <title>{`Twitter clone - ${profile.name}`}</title>
      </Head>
      <header className="sticky top-0 z-10 flex items-center border-b bg-white px-4 py-2">
        <Link
          href=".."
          className="mr-2"
        >
          <IconHoverEffect>
            <VscArrowLeft className="h-6 w-6" />
          </IconHoverEffect>
        </Link>
        <ProfileImage
          src={profile.image}
          className="flex-shrink-0"
        />
        <div className="ml-2 flex-grow">
          <h1 className="text-lg font-bold">
            {profile.name}
          </h1>
          <div className="flex gap-2 text-gray-500">
            <span>
              {profile.tweetsCount}{" "}
              {getPlural(profile.tweetsCount, "Tweet", "Tweets")}
            </span>
            <span>
              {profile.followersCount}{" "}
              {getPlural(profile.followersCount, "Follower", "Followers")}
            </span>
            <span>
              {profile.followsCount} Following
            </span>
          </div>
        </div>
        <FollowButton
          isFollowing={profile.isFollowing}
          isLoading={toggleFollow.isLoading}
          userId={id}
          onClick={() => toggleFollow.mutate({ userId: id })}
        />
      </header>
      <main>
        <InfiniteTweetList
          tweets={tweets.data?.pages.flatMap((page) => page.tweets)}
          isError={tweets.isError}
          isLoading={tweets.isLoading}
          hasMore={tweets.hasNextPage}
          fetchNewTweets={tweets.fetchNextPage}
        />
      </main>
    </>
  )
}

function FollowButton({
  userId,
  isFollowing,
  isLoading,
  onClick
}: {
  userId: string,
  isFollowing: boolean,
  isLoading: boolean,
  onClick: () => void
}) {
  const session = useSession();

  if (session.status !== "authenticated" || session.data.user.id === userId) return null;

  return (
    <Button
      onClick={onClick}
      disabled={isLoading}
      gray={isFollowing}
      small
    >
      {isFollowing
        ? "Unfollow"
        : "Follow"
      }
    </Button>
  )
}

const pluralRules = new Intl.PluralRules();

function getPlural(
  number: number,
  singular: string,
  plural: string
) {
  return pluralRules.select(number) === "one"
    ? singular
    : plural 
}

export const getStaticPaths: GetStaticPaths = () => {
  return {
    paths: [],
    fallback: "blocking"
  }
}

export async function getStaticProps(context: GetStaticPropsContext<{id: string}>) {
  const id = context.params?.id;

  if (id == null) {
    return {
      redirect: {
        destination: "/"
      }
    }
  }

  const ssg = ssgHelper();
  await ssg.profile.getById.prefetch({ id });

  return {
    props: {
      trpcState: ssg.dehydrate(),
      id
    }
  }
}

export default ProfilePage;