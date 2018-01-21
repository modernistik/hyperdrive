const opts = module.exports = {};

// Override options here, ex:
// opts.appName = "My App";

// Hook before the server boots
opts.beforeBoot = function(app) {
  // `app` is an expressjs instance
};

// Hook after the server boots
opts.afterBoot = function(app) {
  // `app` is an expressjs instance
};
