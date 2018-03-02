const opts = module.exports = {};

// Override options here, ex:
// opts.appName = "My App";
opts.cloud = "./cloud/main.js";

// Hook before the server boots
opts.beforeBoot = function(app) {
  // `app` is an expressjs instance
};

// Hook after the server boots
opts.afterBoot = function(app) {
  // `app` is an expressjs instance
};

/* During development, it is useful to have a .env file to set the following
environment variables:

DATABASE_URI                 =
PARSE_SERVER_APPLICATION_ID  =
PARSE_SERVER_MASTER_KEY      =
PARSE_SERVER_REST_API_KEY    =
PARSE_SERVER_CLIENT_KEY      =
PARSE_SERVER_JAVASCRIPT_KEY  =
PARSE_SERVER_WEBHOOK_KEY     =
AWS_ACCESS_KEY_ID            =
AWS_SECRET_ACCESS_KEY        =
S3_BUCKET                    =
PARSE_SERVER_URL             =

*/
