# Twitter clone by Ilia Alekseev

Twitter clone is a web-application built with Next.js, NextAuth.js, Prisma, tRPC, and TailwindCSS. This application uses Planetscale as it's main and only Database.

## Features

This application allows anybody to sign in with Discord, and then create tweets, like tweets of other users, research profile pages, and keep track of followers and followings. But if user is not logged in, he can only see the tweets of other people.

Moreover, I implemented infinite scroll functionality, so only certain amount of tweets will be loaded at first page load. But as you scroll down, older tweets will be loaded as well.

## Deployment

Since it's the Next.js application, I decided to deploy it on Vercel. Link: [Deploy](https://twitter-clone-iliaalekseev.vercel.app/).
