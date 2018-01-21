#!/usr/bin/env node
const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const program = require('commander');
const crypto = require('crypto');
const CURR_DIR = process.cwd();
const Hyperdrive = require('../index.js');
const colors = require('colors');
const HyperdriveVersion = require(path.join(__dirname,'..','..','package.json')).version;
const ParseServerVersion = require('parse-server/package.json').version;
const OptionDefinitions = require('../definitions').definitions;
require('dotenv').config({silent: true});

let versionString = `Hyperdrive: ${HyperdriveVersion} [${ParseServerVersion}]`;
program
  .version(versionString, '-v, --version')
  .usage('[options]')
  .option('-i, --init <name>', 'Initialize a new Hyperdrive project.')
  .option('-s, --start', 'Start the server with default options.')
  .option('--info <optName>', 'Get info on a configuration option.')
  .option('-k, --key', 'Generate a random secure key to use with the server')
  .option('-c, --config <file>', 'Start a Hyperdrive instance with the configuration')
  .option('-d, --database <databaseURI>', 'The database to use (ex. mongodb://localhost:27017/parse).');

program.on('--help', function(){

    console.log("\n  Examples:");
    console.log('');
    console.log('    $ hyperdrive -s');
    console.log('    $ hyperdrive -c config.js');
    console.log('    $ hyperdrive -d postgres://user@localhost:5432');

    console.log("\n  Configuration : Environment Variables:\n".yellow);
    Object.keys(OptionDefinitions).sort().forEach(function(key){
      let v = OptionDefinitions[key];
      console.log(`    ${key.padEnd(22)}: ${v.env}`);
    });
    console.log("\n  Use `hyperdrive --info <configName>` for additional information".yellow);
    console.log("  Also see `parse-server -h` for additional environment variables.");
    console.log("\n");

  });
program.parse(process.argv);

if(program.info){
  const key = program.info;
  const info = OptionDefinitions[key];
  console.log(`\n${key.green} : ${info.env}`);
  console.log(`\n   ${info.help.green || "No description."}\n`);
  process.exit();
}

if(program.init) {
  const templatePath = `${__dirname}/templates`;
  const projectName = program.init;
  const projectDirectory = path.join(CURR_DIR, projectName);
  if (fs.existsSync(projectDirectory)) {
    console.log('Directory already exists!'.red);
    process.exit();
  }
  console.log(`Creating project: ${projectName}`.green);
  console.log(`=> ${projectDirectory.yellow}`);
  fs.mkdirSync(projectDirectory);
  createDirectoryContents(templatePath, projectDirectory);
  console.log("=> Completed".green)
  console.log(`==> Run 'npm install' in the directory ${projectName}`.green)
  process.exit();
} else if(program.key) {
  console.log('=>  ' + crypto.randomBytes(16).toString('hex').green);
  process.exit();
} else if(program.start || program.database || program.config) {
  let opts = {};

  if(program.config) {
    let configFile = path.join(CURR_DIR, program.config);
    opts = require(configFile);
  }

  if(program.database){
    opts.databaseURI = program.database;
  }

  const server = new Hyperdrive(opts);
  server.start();
} else {
  program.help(function(t){ return colors.yellow(t); })
}



function createDirectoryContents(templatePath, projectDirectory) {
  const filesToCreate = fs.readdirSync(templatePath);

  filesToCreate.forEach(file => {
    const origFilePath = path.join(templatePath,file);
    // get stats about the current file
    const stats = fs.statSync(origFilePath);

    if (stats.isFile()) {
      const contents = fs.readFileSync(origFilePath, 'utf8');
      const writePath = path.join(projectDirectory,file);
      console.log(`[+]  ${file.yellow}`);
      fs.writeFileSync(writePath, contents, 'utf8');
    }
    else if (stats.isDirectory()) {
      const writePath = path.join(projectDirectory,file);
      console.log(`==>  ${file.yellow}/`);
      fs.mkdirSync(writePath);
      // recursive call
      const fromDir = path.join(templatePath, file);
      const toDir = path.join(projectDirectory,file);
      createDirectoryContents(fromDir,toDir);
    }
  });
}
