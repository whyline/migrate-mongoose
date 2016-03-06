#! /usr/bin/env node
'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

//import 'babel-polyfill';


var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _mkdirp = require('mkdirp');

var _mkdirp2 = _interopRequireDefault(_mkdirp);

var _yargs = require('yargs');

var _yargs2 = _interopRequireDefault(_yargs);

require('colors');

var _lib = require('./lib');

var _lib2 = _interopRequireDefault(_lib);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var _yargs$usage$command$ = _yargs2.default.usage("Usage: $0 -d <mongo-uri> [[create|up|down <migration-name>]|list] [optional options]").command('list'.cyan, 'Lists all migrations and their current state.').example('$0 list').command('create <migration-name>'.cyan, 'Creates a new migration file.').example('$0 create add_users').command('up [migration-name]'.cyan, 'Migrates all the migration files that have not yet been run in chronological order. ' + 'Not including [migration-name] will run UP on all migrations that are in a DOWN state.').example('$0 up add_user').command('down <migration-name>'.cyan, 'Rolls back migrations down to given name (if down function was provided)').example('$0 down delete_names').option('d', {
  demand: true,
  type: 'string',
  alias: 'dbConnectionUri',
  description: 'The URI of the database connection'.yellow,
  nargs: 1
}).option('md', {
  alias: 'migrations-dir',
  description: 'The path to the migration files',
  normalize: true,
  default: './migrations',
  nargs: 1
}).option('t', {
  alias: 'template-file',
  description: 'The template file to use when creating a migration',
  type: 'string',
  normalize: true,
  nargs: 1
}).option('c', {
  alias: 'change-dir',
  type: 'string',
  normalize: 'true',
  description: 'Change current working directory before running anything',
  nargs: 1
}).help('h').alias('h', 'help');

var args = _yargs$usage$command$.argv;

/*
TODO:
- Add Env Support
- Add Options file support
- Add custom collection option
*/

// Change directory before anything if the option was provided

if (args.cd) process.chdir(args.cd);
// Make sure we have a connection URI

if (!args.dbConnectionUri) {
  console.error('You need to provide the Mongo URI to persist migration status.\nUse option --dbConnectionUri / -d to provide the URI.'.red);
  process.exit(1);
}

var migrator = new _lib2.default({
  migrationsPath: _path2.default.resolve(args['migrations-dir']),
  templatePath: args['template-file'],
  dbConnectionUri: args['dbConnectionUri']
});

// Destructure the command and following argument

var _args$_ = _slicedToArray(args._, 2);

var command = _args$_[0];
var _args$_$ = _args$_[1];
var migrationName = _args$_$ === undefined ? args['migration-name'] : _args$_$;


var promise = void 0;
switch (command) {
  case 'create':
    validateSubArgs({ min: 1, desc: 'You must provide the name of the migration to create.'.red });
    promise = migrator.create();
    promise.then(function () {
      console.log('Migration created. Run ' + ('mongoose-migrate up ' + migrationName).cyan + ' to apply the migration.');
    });
    break;
  case 'up':
    validateSubArgs({ max: 1, desc: 'Command "up" takes 0 or 1 arguments'.red });
    promise = migrator.run(argument, 'up');
    break;
  case 'down':
    validateSubArgs({ min: 1, desc: 'You must provide the name of the migration to stop at when migrating down.'.red });
    promise = migrator.run(args['migration-name'], 'down');
    break;
  case 'list':
    validateSubArgs({ max: 0, desc: 'Command "list" does not take any arguments'.yellow });
    promise = _lib2.default.list();
    break;
  default:
    _yargs2.default.showHelp();
}

promise.then(function () {
  process.exit(0);
}).catch(function (err) {
  if (/no pending migrations/.test(err.message)) console.warn(err.message.yellow);else console.error(err.stack);
  process.exit(1);
});

function validateSubArgs(_ref) {
  var _ref$min = _ref.min;
  var min = _ref$min === undefined ? 0 : _ref$min;
  var _ref$max = _ref.max;
  var max = _ref$max === undefined ? Infinity : _ref$max;
  var desc = _ref.desc;

  var argsLen = args._.length - 1;
  if (argsLen < min || argsLen > max) {
    console.error(desc);
    _yargs2.default.showHelp();
    process.exit(-1);
  }
}