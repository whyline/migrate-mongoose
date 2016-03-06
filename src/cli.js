import fs from 'fs';
import path from 'path';
import mkdirp from 'mkdirp';
import yargs from 'yargs';

import Migrator from './lib';

"use strict";


const  { argv: args } = yargs
  .usage("Usage: $0 <command> [options]")
  .command('list', 'Lists all migrations and their current state.')
  .demand(1)
  .example('$0 list')
  .command('create', 'Creates a new migration file.')
  .demand(2)
  .example('$0 create add_users')
  .command('up', 'Migrates all the migration files that have not yet run.\n Not including a migration name will run all migrations that have not yet run.')
  .demand(1)
  .example('$0 up [add_user]')
  .command('down', 'Rolls back migrations down to given name (if down function was provided)')
  .example('$0 down delete_names')
  .option('template-file', { alias: 't', description: 'The template file to use when creating a migration' })
  .option('migrations-dir', { description: 'The path to the migration files', default: './migrations' })
  .option('cd', { description: 'Change current working directory before running anything' })
  .option('dbConnectionUri', { demand: true, type: 'string', alias: 'd', description: 'The URI of the database connection' })
  .help('h')
  .alias('h', 'help');

/*
TODO:
- Add Env Support
- Add Options file support
- Add custom collection option
*/

// Change directory before anything
if (args.cd) process.chdir(args.cd);

let migrator = new Migrator({
  migrationsPath:  path.resolve(args['migrations-dir']),
  templatePath: args['template-file'],
  dbConnectionUri: args['dbConnectionUri']
});

// Destructure the command and following argument
const  [ command, argument ] = args._;

let promise;
switch(command) {
  case 'create':
    promise = migrator.create(argument);
    break;
  case 'up':
    promise = migrator.run(argument, 'up');
    break;
  case 'down':
    promise = migrator.run(argument, 'down');
    break;
  case 'list':
    promise = Migrator.list();
    break;
  default:
    yargs.showHelp();
}

promise
  .then(() => { process.exit(0); })
  .catch((err) => {
    process.exit(1);
  });
