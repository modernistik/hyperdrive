# Modernistik Hyperdrive
Modern application server for building mobile and cloud applications quickly at scale in a service oriented architecture (SOA/Microservices). Hyperdrive is composed of the [Parse Platform server](http://parseplatform.org/) with additional features that allow for best practice deployments. The default configuration allows for easy deployment using [Heroku](https://www.heroku.com/) or [Amazon Web Services (AWS)](https://aws.amazon.com/).

The additional features include:

* Both [MongoDB](https://www.mongodb.com/) and [PostgreSQL](https://www.postgresql.org/) supported as database adapters.
* [AWS S3](https://aws.amazon.com/s3/), Google Cloud Storage or MongoDB GridFS for file storage.
* Routing of incoming webhooks into cloud functions.
* Support for [Mailgun](https://www.mailgun.com/) and [AWS Simple Email Service](https://aws.amazon.com/ses/) (SES) email adapters.
* Push Notifications through Amazon SNS for both iOS and Android.
* Built-in [Parse Dashboard](https://github.com/parse-community/parse-dashboard)
* Simplified microservice configuration with available ENV API.

# Getting Started
To quickly get started with Hyperdrive, you will first need to install it from the [NPM repository](https://nodejs.org/en/).

```bash
$ npm install -g @modernistik/hyperdrive
```

If you need to install a quick MongoDB database, you can do so with `mongodb-runner`.

```bash
# Install mongodb and start the database service
$ npm install -g mongodb-runner

# Start MongoDB localhost:27017
$ mongodb-runner start
```

Once installed and a database is running, you can then start a default Hyperdrive instance:

```bash
# start instance using MongoDB localhost:27017
# see `hyperdrive -h` for usage
$ hyperdrive -s
```

After the server has started successfully, the API server will be available at http://localhost:1337/parse, and you should be able to access the built-in dashboard
at the url http://localhost:1337/dashboard. If you have any connection errors, make sure the database server is available and you can connect to it.

By default, if no AWS S3 configuration is provided, Hyperdrive will store files directly in the database.

Hyperdrive can mostly be configured by setting environment variables which combine specific Hyperdrive variables with the ones used by Parse Server. To see a list of
variables used by Hyperdrive use the `-h` option or the `--info <optName>` to get details.

```bash
# Get help
$ hyperdrive -h

# Get info on a specific configuration
$ hyperdrive --info databaseURI
# databaseURI : DATABASE_URI
#
#   The database url for either MongoDB or PostgreSQL.
```

## Copyright and License
Copyright (C) 2018 Modernistik LLC (https://www.modernistik.com). Requires agreement for commercial use.
