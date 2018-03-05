// Copyright (C) 2016 Modernistik LLC. All Rights Reserved.
// Author: Anthony Persaud
const _ = require('lodash');
const parsers = require('./parsers');
const crypto = require('crypto');
const url = require('url');
const randomGenKey = crypto.randomBytes(10).toString('hex');
const DefaultRedisURL = "redis://localhost:6379";
const DefaultMongoDB = 'mongodb://localhost:27017/parse';

const ServerDefaults = {
  appName: {
    env: "PARSE_SERVER_APP_NAME",
    default: defaultAppName,
    help: "The Application name."
  },
  appId: {
    env: "PARSE_SERVER_APPLICATION_ID",
    default: crypto.randomBytes(10).toString('hex'),
    help: "The Parse Application ID"
  },
  masterKey: {
    env: "PARSE_SERVER_MASTER_KEY",
    default: crypto.randomBytes(12).toString('hex'),
    help: "The Parse Master Key"
  },
  restAPIKey: {
    env: "PARSE_SERVER_REST_API_KEY",
    default: randomGenKey,
    help: "The key for REST clients to use."
  },
  clientKey: {
    env: "PARSE_SERVER_CLIENT_KEY",
    default: randomGenKey,
    help: "The key for mobile clients to use."
  },
  javascriptKey: {
    env: "PARSE_SERVER_JAVASCRIPT_KEY",
    default: randomGenKey,
    help: "The key for web clients to use."
  },
  webhookKey: {
    env: "PARSE_SERVER_WEBHOOK_KEY",
    help: "The key to use when authenticating cloud code webhook requests.",
    default: randomGenKey
  },
  parseMount: {
    env: "PARSE_SERVER_MOUNT_PATH",
    default: "/parse",
    filter: parsers.mountPathOptionalParser,
    help: "The mount path for the Parse Server."
  },
  serverHost: {
    env: "SERVER_HOSTNAME",
    default: defaultServerHost,
    help: "The public server hostname (ex. myapp.server.com)."
  },
  serverURL: {
    env: "PARSE_SERVER_URL",
    help: "The publicly accessible server url for the api mount point (ex. http://localhost:1337/parse)"
  },
  databaseURI: {
    env: "DATABASE_URI",
    default: defaultDatabaseURI,
    help: "The database url for either MongoDB or PostgreSQL."
  },
  cloud: {
    env: "PARSE_SERVER_CLOUD",
    filter: parsers.appendPath,
    help: "The relative path for the cloudcode main.js file. (ex. ./cloud/main.js)"
  },
  publicServerURL: {
    env: "PARSE_PUBLIC_SERVER_URL",
    default: defaultPublicServerURL,
    help: "The publicly accessible URL for this Parse server. Required for passowrd reset."
  },
  startLiveQueryServer: {
    env: "PARSE_SERVER_START_LIVE_QUERY_SERVER",
    default: false,
    help: "Enables the live query server."
  },
  cluster: {
    env: "PARSE_SERVER_CLUSTER",
    filter: parsers.numberOrBoolParser('cluster'),
    default: true,
    help: "Run with cluster, optionally set the number of processes default to os.cpus().length"
  },
  // Dashboard
  dashboardMount: {
    env: "DASHBOARD_MOUNT",
    default: "/dashboard",
    filter: parsers.mountPathOptionalParser,
    help: "The mount path to access the dashboard. Set to '-' to disable."
  },
  dashboardUser: {
    env: "DASHBOARD_USER",
    default: "admin",
    help: "The username to login to the dashboard."
  },
  dashboardPassword: {
    env: "DASHBOARD_PASSWORD",
    default: "admin",
    help: "The password to login to the dashboard."
  },
  incomingMount: {
    env: "INCOMING_MOUNT",
    default: "/incoming",
    filter: parsers.mountPathOptionalParser,
    help: "The mount location for incoming webhooks to be routed as cloud code functions. Set to '-' to disable."
  },
  configKey: {
    env: "CONFIG_KEY",
    help: "A special psuedorandom key to be used to exposing the server configuration through mountPath '/CONFIG_KEY'. Set to '-' to disable."
  },
  // Server Config
  port: {
    env: "PORT",
    filter: parsers.numberParser('port'),
    default: "1337",
    help: "The port the server should listen on."
  },
  redisURL: {
    env: "REDIS_URL",
    help: "The redis server URL to enable caching and possible job queues."
  },
  verbose: {
    env: "VERBOSE",
    filter: parsers.booleanParser,
    default: false,
    help: "Whether to increase verbosity on Parse Server."
  },
  mailgunAPIKey: {
    env: "MAILGUN_API_KEY",
    help: "Your Mailgun API key."
  },
  mailgunDomain: {
    env: "MAILGUN_DOMAIN",
    help: "The domain setup in Mailgun."
  },
  // AWS Config
  accessKeyId: {
    env: "AWS_ACCESS_KEY_ID",
    help: "Set the AWS access key for the IAM Role that supports the services."
  },
  secretAccessKey: {
    env: "AWS_SECRET_ACCESS_KEY",
    help: "Set the AWS secret key for the IAM Role that supports the services."
  },
  awsRegion: {
    env: "AWS_REGION",
    default: "us-east-1",
    help: "The AWS region where the services are hosted."
  },
  s3Bucket: {
    env: "S3_BUCKET",
    help: "The name of the S3 bucket to store Parse files."
  },
  s3BucketPrefix: {
    env: "S3_BUCKET_PREFIX",
    help: "The prefix to where the files will be stored and located. If defined, it should end with a slash."
  },
  s3BaseURL: {
    env: "S3_BASE_URL",
    filter: parsers.removeTrailingSlash,
    help: "Define the S3 base URL for accessing files. While normally this is an S3 URL, it can be a CloudFront defined URL."
  },
  s3DirectAccess: {
    env: "S3_DIRECT_ACCESS",
    filter: parsers.booleanParser,
    help: "Whether file access should bypass the server.",
    default: false
  },
  s3ServerSideEncryption: {
    env: "S3_SERVER_SIDE_ENCRYPTION",
    help: "ex. AES256|aws:kms"
  },
  s3GlobalCacheControl: {
    env: "S3_GLOBAL_CACHE_CONTROL",
    help: "Set the default cache policy for files on S3.",
    default: "public, max-age=31536000"
  },
  snsAPNS: {
    env: "AWS_SNS_APNS",
    help: "The AWS SNS ARN to be used for sending push notifications to Apple devices."
  },
  snsFCM: {
    env: "AWS_SNS_FCM",
    help: "The AWS SNS ARN to be usd for sending push notifications to Android devices."
  },
  iosBundleId: {
    env: "IOS_BUNDLE_ID",
    help: "The iOS bundle identifier for the iOS version of the mobile app."
  },
  facebookAppIds: {
    env: "FACEBOOK_APP_IDS", // array, comman delimited
    filter: parsers.arrayParser,
    help: "To enable Facebook authentication, set a list of comma delimited Facebook App Ids."
  },
  staticFilesPath: {
    env: "STATIC_FILES_PATH",
    help: "Whether Parse Server should serve static files contained in the `/public` directory."
  },
  systemEmailAddress: {
    env: "SYSTEM_EMAIL_ADDRESS",
    help: "The email that will be used when sending email for verifications and password reset (ex. no-reply@example.com)."
  },
  publishEnvKeys: {
    env: "PUBLISH_ENV_KEYS",
    filter: parsers.arrayParser,
    help: "A list of additional ENV variables to publish in the config API (comma separated).",
    default: []
  }
};

module.exports = {
  definitions: ServerDefaults,
  defaults: function() {
    return parseEnvironmentDefaults(ServerDefaults);
  }
};

/// Parses the definition
function parseEnvironmentDefaults(definitions) {
  transformEnvs();

  return Object.keys(definitions).reduce((memo, key) => {

    const def = definitions[key];
    let val = memo[key];
    // if env defined, try getting value from ENV
    if (_.isNil(val) && def.hasOwnProperty('env')) {
      val = process.env[def.env];
    }
    // if it is still nil, then see if we have a default
    if (_.isNil(val) && def.hasOwnProperty('default')) {

      if (_.isFunction(def.default)) {
        val = def.default();
      } else {
        val = def.default;
      }
    }

    if (false == _.isEmpty(val) && def.hasOwnProperty('filter')) {
      val = def.filter(val);
    }
    // If after all that, we have no value, delete the key.
    if (_.isNil(val)) {
      delete memo[key];
    } else {
      memo[key] = val;
    }

    return memo;
  }, {});
}


function transformEnvs() {
  let env = process.env;

  if(env.REDIS_URL == "default"){
    env.REDIS_URL = DefaultRedisURL;
  }

  env.DATABASE_URI = _.defaultTo(env.DATABASE_URI, env.MONGODB_URI || env.DATABASE_URL || env.PARSE_SERVER_DATABASE_URI);

}

function defaultDatabaseURI() {
  return process.env.MONGODB_URI || process.env.DATABASE_URL || process.env.PARSE_SERVER_DATABASE_URI || DefaultMongoDB;
}

function defaultPublicServerURL() {
  return process.env.PARSE_SERVER_URL;
}

function defaultAppName() {
  return process.env.HEROKU_APP_NAME || "Hyperdrive";
}

function defaultServerHost() {
  // easy support for heroku
  const herokuAppName = process.env.HEROKU_APP_NAME;
  if(herokuAppName) {
    return `${herokuAppName}.herokuapp.com`;
  }
  return undefined;
}
