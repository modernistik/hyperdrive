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

#### With the Heroku Button
If you wish to quickly deploy to Heroku, you can use the deploy button below.

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/modernistik/hyperdrive)

#### Without It

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

By default, if no AWS S3 configuration is provided, Hyperdrive will store files directly in the  database.

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

## Hyperdrive Project
In general, you want to create a new Hyperdrive project in order to provide custom
configuration and extend functionality. You can create a new project with the following:

```bash
$ hyperdrive --init myapp
```

This will create a new directory which will be used to manage your server instance.
```
├── myapp/              # Your project's name
├────── config.js       # Configuration file
├────── package.json    # List of core dependencies
│
├────── cloud/          # Cloud code directory
│       └── main.js     # main entry point
│  
└────── public/         # Public accessible files
        └── index.html
```

Once that is done, you should run `npm install` in the directory.

```bash
$ cd myapp/
$ npm install
```

Your project is setup, and you can run the server with either hyperdrive executable in the nodes_module directory or `npm start`.

### Advanced Configuration
If you want a more programmatic approach to configuring and launching the server,
you can do so in your script following:

```javascript
const Hyperdrive = require("@modernistik/hyperdrive");

const opts = {}; // setup options

// optional
opts.beforeBoot = function(app){

};

// create server instance
const server = new Hyperdrive(opts);

// start server
server.start();
```

# Core API Mount Points
The following are the API end points for Hyperdrive and each of the internal microservice software components.

### /
This is the root path and can be used as a primary health check. It returns the version number of the Parse Server component running in Hyperdrive.

### /parse
This is the end point to make Parse Server API requests using the [Parse SDK](http://docs.parseplatform.org/). You may modify the mount point by setting the `PARSE_MOUNT` environment variable. For a full set of supported REST API in this endpoint, see the [Parse REST Guide](http://docs.parseplatform.org/rest/guide/#quick-reference).

### /dashboard
This is the end point to access the Parse Server Dashboard. You may modify the mount point by setting the `DASHBOARD_MOUNT` environment variable. You may disable the dashboard by setting the variable to `-`.

### /incoming/:method
This is the *POST* end point to receive incoming webhook notifications and events from external services. The incoming `method` name variable in the url will be used to call a corresponding Parse Cloud Code function with specific parameters. You may modify the mount point by setting the `INCOMING_MOUNT` environment variable. Setting to `-` will disable this feature.

### /:configurationKey
This end point allows Hyperdrive to expose the set of environment variables. This is useful in using Hyperdrive as a single point for remote configuration. Only requesters with the proper `:configurationKey` will retrieve the configuration. Additional environment variables may be made public by modifying the `publishEnvKeys` in the Hyperdrive configuration options hash. By default, the Parse Server MasterKey is used, but can be overridden by setting the `CONFIG_KEY` environment variable. You may also disable this feature by setting the environment variable to `-`.

# Overriding Configuration
You can modify the booting and configuration options provided to the server before it is launched. To do this, you can setup a `config.js` file that exports an options hash that will be provided to both Hyperdrive and the internal Parse Server. An example of the contents of the file is below:

```javascript
const opts = module.exports = {}; // required

// These options are passed to Parse Server configuration.
opts.appName = "My App";

// Hook before the server boots
opts.beforeBoot = function(app) {
  // `app` is an expressjs instance
};

// Hook after the server boots
opts.afterBoot = function(app) {
  // `app` is an expressjs instance
};

```

If using the configuration file option, you should start hyperdrive with the `-c` option.

```bash
$ hyperdrive -c config.js
```

## Generating Keys
The Parse Server requires a set of keys for authenticating client requests. These keys can be generated by using Secure Random hex digest with some string. It is important to be systematic in generating all the keys, we provide some guidance below. These keys should be set as environment variables for each of the API keys to provide clients, and the internal master key.

You can use the built in command to generate keys for your application:

```bash
# Generate a secure random byte key
$ hyperdrive -k
# => 62d5ec8599a1c5d2dc9ff110d66858e9

$ hyperdrive --keys
# PARSE_SERVER_APPLICATION_ID    = b8da9...
# PARSE_SERVER_MASTER_KEY        = e7588...
# PARSE_SERVER_REST_API_KEY      = c3baa...
# PARSE_SERVER_CLIENT_KEY        = 6d735...
# PARSE_SERVER_JAVASCRIPT_KEY    = c6e61...
# PARSE_SERVER_WEBHOOK_KEY       = 55243...
```

## Database Configuration
Hyperdrive supports two main database adapters: MongoDB 3.2 and later, and PostgreSQL 9.4 or later. You may set the `DATABASE_URI` parameter to the database url. By default, the adapter uses MongoDB with the url `mongodb://localhost:27017/parse`.

If you plan on using MongoDB for staging and development, the recommended services are either [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) or [mLab](https://mlab.com/).

When using PostgreSQL, you can use either AWS or Heroku as a provider. When using AWS, you must create a RDS instance with Postgres 9.4 or later and verify it is in the same region (ex. us-east-1) as where the Hyperdrive server will be running. If deploying to Heroku, you may opt for using Heroku PostgreSQL as it might be easier to manage.

### Indexing
For both adapters, you must manually create and manage your own indexes. In general, it is always recommended to index all pointer, date and location fields using the most effective compound sparse indexes (MongoDB). In addition, for the `_User` collection, the `email` and `username` fields should be uniquely indexed.

## Parse Dashboard
Hyperdrive comes with the [Parse Dashboard](https://github.com/parse-community/parse-dashboard) built-in at the `/dashboard` mount point (ex. http://localhost:1337/dashboard). This featured is enabled by default through the use of environment variables and it mounted on a specific path on the Hyperdrive service. You may modify the dashboard with the following environment variables.

#### DASHBOARD_MOUNT
The url mount point to access the dashboard interface. By default, this is `/dashboard`. Set to `-` to disable the dashboard completely.

#### DASHBOARD_USER
A login credentials may be used with the dashboard for additional security when running in production mode. Set this variable to the desired username for login (default: `admin`).

#### DASHBOARD_PASS
When adding login credentials to the dashboard, you may also set a password. By default, the password will be the value of the `DASHBOARD_USER` variable.


## AWS Configuration
To configure AWS Services to work with Hyperdrive, you must first create an AWS IAM Role to represent the access policies and services that allows Hyperdrive instances to access. At a minimum, this access priviledges should include the S3 buckets for file storage, and the SNS service for push notifications. Once complete, you should be given AWS access and secret keys which you can set for the environment variables `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` in order for the server to access the resources.

In general, when configuring AWS resources, it is important to create all AWS resources in the same region for best performance and efficiency.

### Creating an IAM Role with Policies
To setup Hyperdrive to access the AWS resources, you must first create an IAM role attached with specific policy files. First, you must access the [IAM Service Console](https://console.aws.amazon.com/iam/home) in AWS. From there, you can select 'Users' from the sidebar navigation, and then select 'Add user'.

Next, you should enter a good descriptive username for this IAM role, and only select 'Programmatic access' for the 'Access Type'. Clicking 'Next: Permissions', should bring you to a screen where you can set the permissions for this new user. From the available option tabs, select 'Attach existing policies directly'. AWS provides managed policy files that you can attach in order to access the services needed to run Hyperdrive on AWS. The policies you want to attach are: `AmazonS3FullAccess`, `AmazonSNSFullAccess` and `AmazonSESFullAccess`. Once you have selected those policies you can click 'Next: Review'. You can then complete creating the user, which will provide you with your AWS access and secret keys that represent this user. These are the keys you should use when setting the environment variables `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`.

### AWS Policy for Production
In the production environments, it is recommended to restrict the IAM role by reducing the policy scope permissions. As an example, instead of attaching the `AmazonS3FullAccess` policy, to your IAM role, you can create a specific policy that allows the IAM role specific access to the S3 buckets it will need. You can do so by going to the [IAM Services console](https://console.aws.amazon.com/iam/home), selecting 'Policies' from the sidebar menu, and click 'Create policy'. You can then use the 'JSON' editor tab, and use the policy below that restricts the IAM role to full access only to the specified S3 buckets. Remember to replace `<YOUR_S3_BUCKET>` with your actual bucket name.

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:*"
            ],
            "Resource": [
                "arn:aws:s3:::<YOUR_S3_BUCKET>",
                "arn:aws:s3:::<YOUR_S3_BUCKET>/*",
            ]
        }
    ]
}
```

Once you have created the new policy file, you can go to your IAM user, remove the `AmazonS3FullAccess` and attach the one you just created. The changes will take immediate effect without needing to change any AWS generated keys.


## File Storage Configuration
Hyperdrive allows the storage and management of static assets (Parse Files) with two supported adapters out of the box. The default configuration supports [MongoDB GridFS](https://docs.mongodb.com/v3.4/core/gridfs/) which stores all files as BSON documents inside the database. While this adapter is the easiest to use and perfect during development, it is not recommended for production as it has a size limit of 16 MB and uses the performance of the database to serve static files.

To utilize AWS S3 adapter for file storage, follow the guide provided here: [Configuring S3 Adapter](http://docs.parseplatform.org/parse-server/guide/#configuring-s3adapter). You must have configured a both the `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` in your environment for the IAM role that will have access to the bucket files, and have created the S3 buckets in your AWS account. To reduce issues, we recommend not using '.' (periods) in the bucket name, as well as, having different buckets for development, staging and production. The following are the list of environment variables you can modify the control the adapter settings. For a list of other available variables [see here](https://github.com/parse-community/parse-server-s3-adapter/blob/master/lib/optionsFromArguments.js).

#### S3_BUCKET
The name of the S3 bucket where files will be stored. The recommendation is to have different buckets for development, staging and production. In the production setup, we recommend setting a NO deletion policy on the bucket itself.

#### S3_BUCKET_PREFIX
You may set this variable to a path with a trailing slash (ex. `assets/`) to have files be stored in with a particular prefix path ("subfolder") in your S3 bucket.

#### AWS_REGION
The region for this bucket, which defaults to `us-east-1`. It is recommended to have both the bucket and the location where the server will be running in the same AWS region.

#### S3_BASE_URL
The base url for accessing the files. By default, this will be the S3 bucket name followed by the bucket prefix: `https://<S3_BUCKET>.s3.amazonaws.com/<S3_BUCKET_PREFIX>`. If you are using CloudFront when accessing the files, this should be the host url including any path or prefix required to access the files (ex `https://123.cloudfront.net/[bucketPrefix]`). This variable should *NOT* contain a trailing slash. In addition, you may have to set `S3_DIRECT_ACCESS` in the S3 adapter configuration.

#### S3_GLOBAL_CACHE_CONTROL
Sets the global cache control when serving the files to clients. The default is `public, max-age=31536000`.

#### S3_SERVER_SIDE_ENCRYPTION
For sensitive data, you may set this variable to enable AWS S3 server side encryption. The two options available for encryption are `AES256` and `aws:kms`. The default is none.

### Bucket Policies
 In the production environments, you may want to add additional restrictions to the files stored in the bucket. In addition, if you have important data that should never be deleted, it is recommended to add a no-deletion bucket policy on the bucket itself. The template for the no-delete bucket policy is below. You will have to replace the `<S3_BUCKET>` variable you actual bucket name:

```json
{
    "Version": "2012-10-17",
    "Id": "NoDeleteBucketPolicy",
    "Statement": [
        {
            "Sid": "DenyDeletionOfBucket",
            "Effect": "Deny",
            "Principal": "*",
            "Action": [
                "s3:DeleteBucket",
                "s3:DeleteBucketPolicy",
                "s3:DeleteBucketWebsite",
                "s3:DeleteObject",
                "s3:DeleteObjectVersion"
            ],
            "Resource": [
                "arn:aws:s3:::<S3_BUCKET>",
                "arn:aws:s3:::<S3_BUCKET>/*"
            ]
        }
    ]
}
```

For some use cases, you may also create a [AWS S3 LifeCycle policy](http://docs.aws.amazon.com/AmazonS3/latest/dev/lifecycle-configuration-examples.html) to transition file data to a different storage class after a particular time.

If you have issues having clients directly access files in your S3 bucket, you may allow a general read policy on the bucket with the policy file below. You will have to replace the `<S3_BUCKET>` variable you actual bucket name:

```json

{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "Allow Public Access to All Objects",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::<S3_BUCKET>/*"
        }
    ]
}

```

### Push Notification Configuration
Hyperdrive supports multiple modes of sending push notifications to mobile clients. The recommended and most flexible approach is to use [AWS Simple Notification Service](https://aws.amazon.com/sns/) (SNS). Utilizing SNS, allows you to manage and update any push certificates and secret keys with Amazon, without having to bundle those with the server software. There are two supported platforms for notifications: iOS and Android.

#### Apple Push Notification Service (APNS)
To enable push notifications to iOS devices, you should must set both `IOS_BUNDLE_ID` and the `AWS_SNS_APNS` environment variables. The `IOS_BUNDLE_ID` should be bundle identifier of the application (ex. com.modernistik.myapp). The `AWS_SNS_APNS` should be set to the Amazon Resource Name (ARN) that you are provided with in the SNS console after configuring the endpoint. This should look something like `arn:aws:sns:us-east-1:123456789100:app/APNS/MyAppName`. The path `APNS` maybe `APNS_SANDBOX` when the SNS endpoint is configured for the APNS development (sandbox) environment.

##### Create the SNS ARN
Before configuring SNS, you must have created a valid APNs client TLS certificate as documented by Apple here: [Communicate with APNs using a TLS certificate](http://help.apple.com/xcode/mac/current/#/dev11b059073). Once that is available and you have downloaded the `.p12` certificate, you can login to your AWS console and select [SNS from the list of services](https://console.aws.amazon.com/sns/v2/home?region=us-east-1#/applications). Once there, you should select 'Applications' from the side menu, and select the button 'Create platform application'.

Once a modal window pops-up, you should enter the application name and from the `Push notification platform` dropdown, select either 'Apple Production' or 'Apple Development', depending on what you are configuring. Note that it is recommended to append the suffix `Dev` or `Sandbox` to the Application name in this window if you are creating an endpoint for the 'Apple Development' servers. Select 'iOS push certificate' from the 'Push certificate type', and select 'Choose file' from the button below. You should then select the exported `.p12` file from the previous guide above. Finally, click on 'Load credentials from file' and click on the 'Create platform application' button to complete.

Once completed, you should see your application name listed in the Applications list, and a corresponding ARN. Set the environment variable for the `AWS_SNS_APNS` to this new value.

#### Firebase Cloud Messaging (FCM)
To enable push notifications for Firebase messaging (Google Cloud Messaging), set the SNS ARN to the `AWS_SNS_FCM` environment variable.

##### Create the SNS ARN
To configure Android devices to receive push notifications, you must create a Firebase project in the Firebase console. From the console interface, go to 'Settings' (gear icon), and then select 'Cloud Messaging'. The API key provided to you by Firebase will be used to configure AWS SNS for Android devices.

Once you have the key, you can go to the [AWS SNS console](https://console.aws.amazon.com/sns/v2/home?region=us-east-1#/applications), and under the 'Application' section, select 'Create platform application'. Select'Google Cloud Messaging (GCM)' from the 'Push notification platform' dropdown and enter the Firebase key you were provided. Click on 'Create platform application' to save the end point.

Once you complete creating an ARN for the Firebase messaging endpoint, you can se this value to the `AWS_SNS_FCM` environment variable.

### Incoming Webhooks
You may configure Hyperdrive to receive incoming webhooks from external services through an incoming hook path. This is useful for receiving notifications and events from these external sources, and routing them into your API as cloud code methods. The way this works is by setting the webhook URL at the external endpoint service, to match with the cloud code method you want to call in your API. This cloud method will receive the name of the method, query parameters and the contents of the request body.

As an example, say you want [Stripe to send you a notification](https://stripe.com/docs/webhooks) for a particular transaction event. You can create and register a Parse cloud code method `stripeEvent`. This method will receive parameters with keys for `method`, `parameters`, `query` and `body`. Once you have the method setup and registered with the Parse Server component in Hyperdrive, you can provide Stripe with the webhook url of `http://<your_server_url>/incoming/stripeEvent`.

```javascript
Parse.Cloud.define("stripeEvent", function(request, response) {
  const params = request.params;
  // params = { method: .., query: .., body: .., parameters: .. }
  // maybe enqueue a Kue job
  response.success();
});
```

If you are using Parse Cloud Code webhooks, you can also use the same functionality. The example below uses [Parse-Stack](https://github.com/modernistik/parse-stack/) to register the `stripeEvent`.

```ruby
# If using Parse-Stack
Parse::Webhooks.route :function, :stripeEvent do
  body = params["body"]
  # maybe enqueue a Sidekiq worker
  true
end
```

You may configure the mount path of incoming webhooks by setting the `INCOMING_MOUNT` environment variable (ex. `/incoming`). In production, it is recommended to change this to a different unique and possibly random string. Set `INCOMING_MOUNT` to `-` to disable this feature.

## Copyright and License
Copyright (C) 2013 Modernistik LLC (https://www.modernistik.com). Requires agreement for commercial use.
