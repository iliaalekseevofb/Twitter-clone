import { type Prisma } from "@prisma/client";
import { type inferAsyncReturnType } from "@trpc/server";
import { z } from "zod";

import {
  type createTRPCContext,
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";

export const tweetRouter = createTRPCRouter({
  // Infinite profile feed
  infiniteProfileFeed: publicProcedure.input(
    z.object({
      userId: z.string(),
      limit: z.number().optional(),
      cursor: z.object({ id: z.string(), createdAt: z.date() }).optional() 
    })
  ).query(async ({ input: { limit = 10, userId, cursor }, ctx }) => {  
    return await getInfiniteTweets({
      whereClause: { userId },
      limit: limit,
      ctx: ctx,
      cursor: cursor
    });
  }),

  // Infinite feed
  infiniteFeed: publicProcedure.input(
    z.object({
      onlyFollowing: z.boolean().optional(),
      limit: z.number().optional(),
      cursor: z.object({ id: z.string(), createdAt: z.date() }).optional() 
    })
  ).query(async ({ input: { limit = 10, onlyFollowing=false, cursor }, ctx }) => {
    const currentUserId = ctx.session?.user.id;
    
    return await getInfiniteTweets({
      whereClause: 
        currentUserId == null || !onlyFollowing
          ? undefined 
          : {
            user: {
              followers: { some: { id: currentUserId } }
            }
          },
      limit: limit,
      ctx: ctx,
      cursor: cursor
    });
  }),

  // Create tweet
  create: protectedProcedure
    .input(z.object({ content: z.string() }))
    .mutation(async ({ input: { content }, ctx }) => {
      const tweet = await ctx.prisma.tweet.create({
        data: {
          content,
          userId: ctx.session.user.id
        }
      })

      return tweet;
    }),

  // Toggle like
  toggleLike: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input: { id }, ctx }) => {
      const data = { tweetId: id, userId: ctx.session.user.id }

      const existingLike = await ctx.prisma.like.findUnique({
        where: { userId_tweetId: data }
      })

      if (existingLike == null) {
        await ctx.prisma.like.create({ data });

        return { addedLike: true }
      } else {
        await ctx.prisma.like.delete({ where: { userId_tweetId: data } });

        return { addedLike: false }
      }
    })
});

// Common tweets getting function
async function getInfiniteTweets({
  whereClause,
  ctx,
  limit,
  cursor
}: {
  whereClause?: Prisma.TweetWhereInput,
  ctx: inferAsyncReturnType<typeof createTRPCContext>,
  limit: number,
  cursor: {
    id: string,
    createdAt: Date,
  } | undefined
}) {
  const currentUserId = ctx.session?.user.id

  const data = await ctx.prisma.tweet.findMany({
    take: limit + 1,
    cursor: cursor ? { createdAt_id: cursor } : undefined,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    where: whereClause,
    select: {
      id: true,
      content: true,
      createdAt: true,
      _count: { select: { likes: true } },
      likes: currentUserId == null ? false : { where: { userId: currentUserId } } ,
      user: {
        select: { name: true, id: true, image: true }
      }
    }
  })

  let nextCursor: typeof cursor | undefined;

  if (data.length > limit ) {
    const nextItem = data.pop();
    
    if (nextItem != null) {
      nextCursor = { id: nextItem.id, createdAt: nextItem?.createdAt }
    }
  }

  return { tweets: data.map(tweet => {
    return {
      id: tweet.id,
      content: tweet.content,
      createdAt: tweet.createdAt,
      likeCount: tweet._count.likes,
      likedByMe: tweet.likes?.length > 0,
      user: tweet.user
    }
  }), nextCursor }
}
