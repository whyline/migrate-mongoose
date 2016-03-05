import fs from 'fs';
import path from 'path';
import mkdirp from 'mkdirp';
import yargs from 'yargs';

import Migration from './lib';

"use strict";


const  { argv: args } = yargs
  .usage("Usage: $0 <command> [options]")
  .command('create', 'Creates a new migration file.')
  .demand(2)
  .example('$0 create add_users')
  .command('up', 'Migrates all the migration files that have not yet run.')
  .demand(2)
  .example('$0 up add_user')
  .command('down', 'Rolls back migrations down to given name (if down function was provided)')
  .example('$0 down delete_names')
  .option('template-file', { alias: 't', description: 'The template file to use when creating a migration' })
  .option('migrations-dir', { description: 'The path to the migration files', default: './migrations' })
  .option('cd', { description: 'Change current working directory before running anything' })
  .help('h')
  .alias('h', 'help');

// --config
  // --env -e env
  // --col collectionName


function fileRequired(error) {
  if (error && error.code == 'ENOENT') {
    console.error(`Could not find any files at path '${error.path}'`);
    process.exit(1);
  }
}


// Save the directory for this file
const srcDir = __dirname;
// Change directory before anything
if (args.cd) process.chdir(args.cd);

const migrationsDir = path.resolve(args['migrations-dir']);

// Destructure the command and following argument
const  [ command, argument ] = args._;

switch(command) {
  case 'create':
    const templatePath = args['template-file'] ? args['template-file'] : path.resolve(srcDir, 'default-template.js');
    Migration.create(argument, { templatePath, migrationsPath: migrationsDir });
    break;
  case 'up':
    Migration.up(argument);
    break;
  case 'down':
    Migration.down(argument);
    break;
  default:
    yargs.showHelp();
}


process.on('uncaughtException', (e) => {
  console.log('DAMN', e);
});

process.on('unhandledRejection', (e) => {
  console.log('SHIT', e);
});

//process.exit(0);
