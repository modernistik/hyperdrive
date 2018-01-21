const _ = require('lodash');
const bodyParser = require("body-parser");
const url = require('url');
const path = require('path');
const express = require('express');
const Parse = require('parse/node'); // In a node.js environment
const ParseServer = require('parse-server').ParseServer;
const ParseServerVersion = require('parse-server/package.json').version;
const HyperdriveVersion = require('../package.json').version;
const AWS = require('aws-sdk');
const ServerOpts = require('./definitions');
const DefaultRedisURL = "redis://localhost:6379";
const colors = require('colors');

function warn(msg) {
  console.log(`[WARN] ${msg}`.yellow);
}

// returns the express app.
class Hyperdrive {

  constructor(opts) {
    // load items from definitions.
    this._started = false;
    this.parseServerVersion = ParseServerVersion;
    this.config = ServerOpts.defaults();
    this.app = express();
    this.redisURL = null;
    this.awsConfig = null;
    if (_.isObject(opts)) {
      Object.assign(this.config, opts);
    }
    this._postProcessOptions()

  }

  _postProcessOptions() {
    let config = this.config;
    // if server url is not defined, we can create one.
    if( _.isEmpty(config.serverURL) ){
      // if we have a server host, then build the url.
      let baseServerURL = `http://localhost:${config.port}`;

      if(config.serverHost) {
        baseServerURL = `https://${config.serverHost}`;
      } // otherwise, use localhost
      console.log(config.parseMount);
      config.serverURL = `${baseServerURL}${config.parseMount}`;
    }

    this.serverURL = url.parse(config.serverURL);

    if (config.redisURL == "default"){
      config.redisURL = DefaultRedisURL;
    }

    if (_.isEmpty(config.appName)) {
      config.appName = this.serverURL.hostname;
    }

    if (_.isEmpty(config.systemEmailAddress)) {
      config.systemEmailAddress = `no-reply@${this.serverURL.hostname}`
    }

  }

  start() {
    let config = this.config;

    if (this._started) {
      warn("This instance has already been configured!");
      return;
    }

    if (!config.appId || config.appId.length < 5) {
      warn('Application Id should be greater than 5 characters.'.red);
      process.exit();
    }

    if (!config.masterKey || config.masterKey.length < 5) {
      warn('Master key should be greater than 5 characters.'.red);
      process.exit();
    }

    this.configureAWS();
    this.configureRedisCacheAdapter();
    this.configureFileStorage();
    this.configurePushNotifications();
    this.configureEmailAdapter();
    this.configureFacebook();
    const app = this.app;
    // base health-check
    app.get('/', function(req, res) {
      res.status(200).send(ParseServerVersion);
    });

    this.mountMiddlewares(app);
    this.mountStaticFiles(app);
    this.mountAPI(app);
    this.mountDashboard(app);
    this.mountIncoming(app)
    this.mountServerConfig(app)

    if(_.isFunction(config.beforeBoot)){
      config.beforeBoot(app);
    }

    this.displayStartupLog(app)
    const httpServer = require('http').createServer(app);

    if(_.isNil(config.port)){
      console.log("No port defined to start server! Verify PORT environment variable is set.".red);
      process.exit();
    }

    httpServer.listen(config.port, function() {
      console.log("\n");
      this._started = true;
      if (config.startLiveQueryServer) {
        console.log(`[Hyperdrive.${process.pid}] live query server started...`.green);
        ParseServer.createLiveQueryServer(httpServer);
      }
      console.log(`[Hyperdrive.${process.pid}] started ${config.serverURL}...`.green);

      if(_.isFunction(config.afterBoot)){
        config.afterBoot(app);
      }

    });

    return app;
  }

  configureAWS() {
    let config = this.config;
    if (this.accessKeyId && this.secretAccessKey) {

      this.awsConfig = new AWS.Config({
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
        region: _.defaultTo(config.awsRegion, 'us-east-1')
      });

      AWS.config.apiVersions = {
        s3: '2006-03-01'
      };

    }

  }

  isAWSConfigured() {
    return false == _.isEmpty(this.awsConfig);
  }

  isS3Configured() {
    return this.awsConfig && this.fileStorage == "s3";
  }

  configureRedisCacheAdapter() {
    let config = this.config;
    if (_.isEmpty(config.redisURL))
      return;

    const RedisCacheAdapter = require('parse-server').RedisCacheAdapter;
    config.cacheAdapter = new RedisCacheAdapter({url: config.redisURL});
    this.redisURL = config.redisURL;
    Parse.redisURL = this.redisURL;
  }

  configureFileStorage() {
    let config = this.config;
    // if already configured, then return.
    if (config.filesAdapter)
      return;

    if (this.isAWSConfigured() && config.s3Bucket) {
      const S3Adapter = require('parse-server').S3Adapter;
      config.filesAdapter = new S3Adapter(config.s3Bucket, {
        region: config.awsRegion,
        directAccess: config.s3DirectAccess || false,
        bucketPrefix: config.s3BucketPrefix,
        baseUrl: config.s3BaseUrl,
        globalCacheControl: config.s3GlobalCacheControl,
        ServerSideEncryption: config.s3ServerSideEncryption
      });
      this.fileStorage = "s3";
    } else {
      this.fileStorage = "database";
    }

  }

  configurePushNotifications() {
    let config = this.config;
    // if already configured, then return
    if (config.push)
      return;

    // if no AWS config, then return
    if (!this.isAWSConfigured())
      return;

    // perform sns configuration
    const pushConfig = {
      pushTypes: {},
      accessKey: config.accessKeyId,
      secretKey: config.secretAccessKey,
      region: config.awsRegion
    };

    if (config.snsFCM) {
      pushConfig.pushTypes.android = {
        ARN: config.snsFCM
      };
    } else {
      warn("Android notifications not configured.");
    }

    if (config.snsAPNS) {
      pushConfig.pushTypes.ios = {
        ARN: config.snsAPNS,
        production: _.isNil(config.snsAPNS.match('/APNS_SANDBOX')),
        bundleId: config.iosBundleId
      }
    } else {
      warn("APNS not configured.");
    }

    const SNSPushAdapter = require('parse-server-sns-adapter');
    config.push = {
      adapter: new SNSPushAdapter(pushConfig)
    };

  }

  configureEmailAdapter() {
    let config = this.config;
    // if already configured, then return.
    if (config.emailAdapter)
      return;

    if (config.mailgunAPIKey) {
      config.emailAdapter = {
        module: '@parse/simple-mailgun-adapter',
        options: {
          fromAddress: config.systemEmailAddress,
          apiKey: config.mailgunAPIKey,
          domain: config.mailgunDomain || this.serverURL.hostname
        }
      };
    } else if (this.isAWSConfigured()) {
      config.emailAdapter = {
        module: "parse-server-amazon-ses-adapter",
        options: {
          from: config.systemEmailAddress,
          accessKeyId: config.accessKeyId,
          secretAccessKey: config.secretAccessKey,
          region: config.awsRegion
        }
      }

    } else {
      warn("No email adapter was configured.");
    }

  }

  configureFacebook() {
    let config = this.config;
    if( ! _.isArray(config.facebookAppIds) ) return;

    if( _.isEmpty(config.oauth) ) {
      config.oauth = { facebook: { } };
    }

    config.oauth.facebook = {
      appIds: config.facebookAppIds
    }

  }

  /// MOUNTING
  mountMiddlewares(app) {
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({extended: true}));
  }

  mountStaticFiles(app) {

    let staticPath = this.config.staticFilesPath;
    if (false == _.isEmpty(staticPath)) {
      // ex. '/public'
      app.use(staticPath, express.static(path.join(process.cwd(), staticPath)));
    }
  }

  mountAPI(app) {
    let config = this.config;
    if(_.isEmpty(config.parseMount) || config.parseMount == '-') return;
    Parse.initialize(config.appId, config.javascriptKey, config.masterKey);
    Parse.serverURL = config.serverURL;
    const api = new ParseServer(config);
    app.use(config.parseMount, api);
  }

  mountDashboard(app) {
    let config = this.config;
    if (_.isEmpty(config.dashboardMount) || config.dashboardMount == "-" )
      return;

    const dashboardOpts = {
      "apps": [
        {
          "serverURL": config.serverURL,
          "appId": config.appId,
          "masterKey": config.masterKey,
          "javascriptKey": config.javascriptKey,
          "appName": _.defaultTo(config.appName, "Hyperdrive App")
        }
      ]
    };

    if (config.dashboardUser && app.get('env') != 'development') {
      dashboardOpts.users = [
        {
          "user": config.dashboardUser,
          "pass": config.dashboardPassword
        }
      ];
    }

    const ParseDashboard = require('parse-dashboard');
    const dashboard = new ParseDashboard(dashboardOpts, {allowInsecureHTTP: true});
    app.use(config.dashboardMount, dashboard);

  }

  mountIncoming(app) {
    let config = this.config;
    if (_.isEmpty(config.incomingMount) || config.incomingMount == '-' )
      return;

    app.post(config.incomingMount + '/:method', function(req, res) {
      const method = req.params.method;
      console.log(`[Incoming Webhook Received] ${method} : ${JSON.stringify(req.body)}`);
      Parse.Cloud.run(method, {
        method: method,
        parameters: req.params,
        query: req.query,
        body: req.body
      }).then(function(result) {
        res.send(result);
      }, function(error) {
        console.log(`[Incoming Webhook Received] Failed to route notification ${method} : ${JSON.stringify(error)}`);
        res.status(400).send(error);
      });

    }); // app.post

  }

  mountServerConfig(app) {
    let config = this.config;

    if(config.configMount == '-') return;
    let configMount = config.configMount || config.masterKey;
    app.get('/' + configMount, function(req, res) {

      const parseEnv = {
        PARSE_APPLICATION_ID: config.appId,
        PARSE_SERVER_APPLICATION_ID: config.appId,
        PARSE_CLIENT_KEY: config.clientKey,
        PARSE_SERVER_CLIENT_KEY: config.clientKey,
        PARSE_SERVER_JAVASCRIPT_KEY: config.javascriptKey,
        PARSE_SERVER_MASTER_KEY: config.masterKey,
        PARSE_SERVER_REST_API_KEY: config.restAPIKey,
        PARSE_SERVER_URL: config.serverURL,
        PARSE_SERVER_VERSION: ParseServerVersion,
        PARSE_DATABASE_URI: config.databaseURI,
        DATABASE_URI: config.databaseURI,
        PARSE_SERVER_WEBHOOK_KEY: config.webhookKey,
        AWS_ACCESS_KEY_ID: config.accessKeyId,
        AWS_SECRET_ACCESS_KEY: config.secretAccessKey,
        AWS_REGION: config.awsRegion
      };

      if (_.isArray(config.publishEnvKeys) && config.publishEnvKeys.length > 0) {
        let e = process.env;
        config.publishEnvKeys.forEach((key) => {
          if (e[key])
            parseEnv[key] = e[key];
          }
        );
      }
      res.status(200).send(parseEnv);

    }); // app.get
  }

  displayStartupLog(app) {
    let config = this.config;
    let mode = app.get('env');

    console.log(`\n------------ v${HyperdriveVersion}[${ParseServerVersion}] ------------`.green);
    console.log(`ENV           : ${mode}`);
    console.log(`SERVER URL    : ${config.serverURL}`);
    console.log(`DATABASE URI  : ${config.databaseURI}`);
    console.log(`APP ID        : ${config.appId}`);

    if(mode == "development"){
      console.log(`MASTER KEY    : ${config.masterKey}`);
    } else {
      console.log(`MASTER KEY    : ${config.masterKey.substr(0, 5)}**REDACTED**`);
    }

    console.log(`REST API KEY  : ${config.restAPIKey}`);
    console.log(`CLIENT KEY    : ${config.clientKey}`);
    console.log(`JAVASCRIPT KEY: ${config.javascriptKey}`);
    console.log(`WEBHOOKS KEY  : ${config.webhookKey}`);

    console.log(`CLOUD CODE    : ${_.defaultTo(config.cloud,'-')}`);
    console.log(`INCOMING PATH : ${_.defaultTo(config.incomingMount, '-')}`);
    console.log(`CONFIG ROUTE  : ${_.defaultTo(config.configMount, '-')}`);
    console.log(`DASHBOARD     : ${_.defaultTo(config.dashboardMount, '-')}`);
    console.log(`REDIS URL     : ${_.defaultTo(config.redisURL, '-')}`);

    if (config.emailAdapter && config.systemEmailAddress) {
      console.log(`SYSTEM EMAIL  : ${config.systemEmailAddress}`)
    }

    if (this.isAWSConfigured() && this.isS3Configured()) {
      let fileStore = `s3:${config.s3Bucket}/${config.s3BucketPrefix}`;
      console.log(`FILES STORE   : ${fileStore}`);
      console.log(`AWS BASE URL  : /${config.s3BaseURL}`);
    } else {
      console.log(`FILES STORE   : Database`);
    }

    if (this.isAWSConfigured()) {
      console.log(`AWS ACCESS KEY: ${config.accessKeyId}:${config.awsRegion}`);

      if (config.snsAPNS) {
        console.log(`APNS BUNDLE ID : ${config.iosBundleId}`);
        console.log(`APNS SNS       : ${config.snsAPNS}`);
      }

      if (config.snsFCM) {
        console.log(`Firebase SNS   : ${config.snsFCM}`);
      }

      if(_.isArray(config.facebookAppIds)) {
        console.log('Facebook Ids   : ' + _.join(config.facebookAppIds,','));
      }

    }

  }

}

module.exports = Hyperdrive;
