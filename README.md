
# Demo Fly Postgres

[Fly](https://fly.io/) is a platform for deploying web apps. This demo shows you how to deploy a website to Fly with a Postgres database.

## Billing

fly.io's pay as you go plan will charge you based on usage, but as of 2024-08-07, they have a secret policy that if your monthly bill is < $5, they'll waive your bill. Most groups will probably qualify for this. If not, I'd expect your bill to be no more than $5, and definitely no more than $10, as long as you select "Development" and not "Production" when deploying. If this is an issue for you, let me know and we can work something out.

## Overview

The easiest way to use this demo is to clone this repo, copy this folder somewhere else, follow _all_ of the below instructions, and then paste your project-specific code as directed into these files.

## Deploying your web and Postgres Fly apps

You'll first need to create an account on the [Fly website](https://fly.io) and add your credit card info.

From the command line, in this folder, run `fly launch` and enter `y` to change settings. This will open a webpage in your browser. Make the following selections:

1) Pick an app name. It has to be unique across all Fly apps currently deployed. You'll use this app name to refer to your Fly web app and it'll be part of the URL you visit to view your deployed site.
	- Make sure this is a valid variable name and don't use any punctuation, as this will make it easier to use it later.
2) Select Fly Automated Postgres as the Postgres provider if it's not already selected.
3) Make your Postgres app name equal to your web app name + `db`. For example, if your Fly web app name was `abc`, name your Fly Postgres app `abcdb`.
4) **Make sure the Postgres configuration is Development, _not_ Production.** This will cost less money.
5) Click confirm settings when you're done.

`fly launch` will then continue running in your terminal (this may take a few minutes). At some point, it'll print out your deployed Postgres cluster's credentials. Save these in a text file somewhere private (don't commit them to your repo) just in case you need them later, as once you close the terminal, you'll never see them again.

`fly launch` will have created a fly.toml and a Dockerfile in your project folder. Commit these to your repo. You shouldn't need to modify these.

## Local changes

You'll need to make these changes so you can run this code locally and set up both your deployed and local databases:

- Copy `env.sample` into a file named `.env`.
	- Keep the original env.sample so people who clone your repo know what credentials they need to put inside .env.
- In `.env`, replace `YOURPOSTGRESUSER` and `YOURPOSTGRESPASSWORD` with your **local** Postgres username and password. Replace `YOURFLYWEBAPPNAME` with the Fly **web** app name you selected when running `fly launch`.
- In `setup.sql`, replace `YOURFLYWEBAPPNAME` with your Fly **web** app name.
- In `package.json`, replace `YOURFLYPOSTGRESAPPNAME` with your Fly **Postgres** app name and `YOURFLYWEBAPPNAME` with your Fly **web** app name.

There's already a `.gitignore` file which ignores `.env` in this folder, so you don't need to create that.

## Setting up your deployed and local Postgres databases

To set up your deployed Postgres database for the deployed Fly web app, run `npm run setup`. This will connect to the deployed database and run the code in setup.sql.

> If this doesn't work, if you're on Windows, try using Git Bash. If that still doesn't work, run `fly postgres connect -a YOURFLYPOSTGRESAPPNAME` (replacing `YOURFLYPOSTGRESAPPNAME` with your Fly **Postgres** app name) and manually copy-paste the code in setup.sql into the terminal.

You'll use your local Postgres database for local testing. First, run `npm i` to install local packages. Then, run `npm run setup:local` to create the database and run setup.sql on it. If you run this again to clear your database and re-insert the dummy data, you'll see a "database already exists" error. Ignore this.

You only need to run these setup scripts a) once at the beginning to create your database and tables and b) whenever you make a schema change or want to delete all existing data and start fresh.

## Running your app locally

To run your app locally, run `npm run start:local`. Visit `http://localhost:3000` (or whatever port you put in your server.js) to view the site.

## Viewing/managing your deployed site

Visit [https://fly.io/](https://fly.io/), click Dashboard, and select your Fly web app:

- The Hostname in the Application Information section is your web app's URL. It'll be `http:s//YOURFLYWEBAPPNAME.fly.dev`. Visit this URL to see your app.
- In the sidebar (which will be on the bottom if your browser window is too small), select Live Logs. This will show you any console.logs printed by your server while you were viewing the Live Logs page (it won't show you historical logs). Visit your site's URL while this page is open to see some logs appear.

To view all console.logs from your server (including historial logs), run `fly logs`. You'll need to quit this program with CTRL-c when you're done with it.

If you make changes to your code, to redeploy, run `fly deploy` (you won't need to run `fly launch` again).

To open a psql terminal to your deployed database for debugging, run `fly postgres connect -a YOURFLYPOSTGRESAPPNAME -d YOURFLYPWEBAPPNAME`, replacing `YOURFLYPOSTGRESAPPNAME` with your Fly **Postgres** app name and `YOURFLYPWEBAPPNAME` with your Fly **web** app name. You can then run SQL queries like you would on your local database.

Fly shuts down your web app machine when it hasn't been used in awhile. This means the first visit to your page can load more slowly. You may also get database connection errors if it takes too long to wake up; refreshing the page after a few seconds usually fixes these.

## Putting your own code in this project

Copy-paste your server code into the indicated section in `app/server.js`. Don't change the code above and below it.

Copy-paste your setup SQL into the indicated section in `setup.sql`. Don't change the code above and below it.

Move your client-side files into the `app/public` folder.

Run `fly deploy` and visit your site's URL to see your site.

## When you're done with the project

To save money, when you're done with this project, you'll want to delete your web and Postgres apps from Fly.

Visit [https://fly.io/](https://fly.io/), click Dashboard, and select your Fly web app. Go to Settings and click Delete app. Go back to your Dashboard and do the same with your Fly Postgres app.
