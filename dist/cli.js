'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _mkdirp = require('mkdirp');

var _mkdirp2 = _interopRequireDefault(_mkdirp);

var _yargs = require('yargs');

var _yargs2 = _interopRequireDefault(_yargs);

var _lib = require('./lib');

var _lib2 = _interopRequireDefault(_lib);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

"use strict";

var _yargs$usage$command$ = _yargs2.default.usage("Usage: $0 <command> [options]").command('list', 'Lists all migrations and their current state.').demand(1).example('$0 list').command('create', 'Creates a new migration file.').demand(2).example('$0 create add_users').command('up', 'Migrates all the migration files that have not yet run.\n Not including a migration name will run all migrations that have not yet run.').demand(1).example('$0 up [add_user]').command('down', 'Rolls back migrations down to given name (if down function was provided)').example('$0 down delete_names').option('template-file', { alias: 't', description: 'The template file to use when creating a migration' }).option('migrations-dir', { description: 'The path to the migration files', default: './migrations' }).option('cd', { description: 'Change current working directory before running anything' }).option('dbConnectionUri', { demand: true, type: 'string', alias: 'd', description: 'The URI of the database connection' }).help('h').alias('h', 'help');

var args = _yargs$usage$command$.argv;

/*
TODO:
- Add Env Support
- Add Options file support
- Add custom collection option
*/

// Change directory before anything

if (args.cd) process.chdir(args.cd);

var migrator = new _lib2.default({
  migrationsPath: _path2.default.resolve(args['migrations-dir']),
  templatePath: args['template-file'],
  dbConnectionUri: args['dbConnectionUri']
});

// Destructure the command and following argument

var _args$_ = _slicedToArray(args._, 2);

var command = _args$_[0];
var argument = _args$_[1];


var promise = void 0;
switch (command) {
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
    promise = _lib2.default.list();
    break;
  default:
    _yargs2.default.showHelp();
}

promise.then(function () {
  process.exit(0);
}).catch(function (err) {
  process.exit(1);
});