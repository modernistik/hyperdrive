// Copyright (C) 2016 Modernistik LLC. All Rights Reserved.
// Author: Anthony Persaud
const path = require('path');
const _ = require('lodash');
// utilize maintained parsers by the Parse-Server team.
/// https://github.com/parse-community/parse-server/blob/master/src/Options/parsers.js
let ParseServerParsers = require('parse-server/lib/Options/parsers.js');

function mountPathOptionalParser(str){
  // if it's false, then return null
  if ( _.isEmpty(str) || str == '-' || str == 'false') {
    return undefined;
  }
  return removeTrailingSlash(str);
}

function removeTrailingSlash(str) {
  if (!str) {
    return str;
  }
  if (str.endsWith("/")) {
    str = str.substr(0, str.length - 1);
  }
  return str;
}

function appendPath(str) {
  let endPath = removeTrailingSlash(str);
  return path.join(process.cwd(), endPath + "/");
}

ParseServerParsers.mountPathOptionalParser = mountPathOptionalParser;
ParseServerParsers.removeTrailingSlash = removeTrailingSlash;
ParseServerParsers.appendPath = appendPath;

module.exports = ParseServerParsers;
