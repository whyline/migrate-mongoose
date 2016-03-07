'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _mkdirp = require('mkdirp');

var _mkdirp2 = _interopRequireDefault(_mkdirp);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _colors = require('colors');

var _colors2 = _interopRequireDefault(_colors);

var _mongoose = require('mongoose');

var _mongoose2 = _interopRequireDefault(_mongoose);

var _db = require('./db');

var _db2 = _interopRequireDefault(_db);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new _bluebird2.default(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return _bluebird2.default.resolve(value).then(function (value) { return step("next", value); }, function (err) { return step("throw", err); }); } } return step("next"); }); }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

_bluebird2.default.config({
  warnings: false
});

var defaultTemplate = '\n"use strict";\n\n/**\n * Make any changes you need to make to the database here\n */\nexport async function up() {\n}\n\n/**\n * Make any changes that UNDO the up function side effects here (if possible)\n */\nexport async function down() {\n}\n';

var Migrator = function () {
  function Migrator(_ref) {
    var templatePath = _ref.templatePath;
    var _ref$migrationsPath = _ref.migrationsPath;
    var migrationsPath = _ref$migrationsPath === undefined ? './migrations' : _ref$migrationsPath;
    var dbConnectionUri = _ref.dbConnectionUri;

    _classCallCheck(this, Migrator);

    this.template = templatePath ? _fs2.default.readFileSync(templatePath, 'utf-8') : defaultTemplate;
    this.migrationPath = _path2.default.resolve(migrationsPath);
    this.connection = _mongoose2.default.connect(dbConnectionUri);
  }

  _createClass(Migrator, [{
    key: 'create',
    value: function () {
      var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee(migrationName) {
        var now, newMigrationFile;
        return regeneratorRuntime.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                _context.prev = 0;
                now = Date.now();
                newMigrationFile = now + '-' + migrationName + '.js';

                _mkdirp2.default.sync(this.migrationPath);
                _fs2.default.writeFileSync(_path2.default.join(this.migrationPath, newMigrationFile), this.template);
                // create instance in db
                _context.next = 7;
                return this.connection;

              case 7:
                _context.next = 9;
                return _db2.default.create({
                  name: migrationName,
                  createdAt: now
                });

              case 9:
                console.log('Created migration ' + migrationName + ' in ' + this.migrationPath + '.');
                _context.next = 16;
                break;

              case 12:
                _context.prev = 12;
                _context.t0 = _context['catch'](0);

                console.error(_context.t0.stack);
                fileRequired(_context.t0);

              case 16:
              case 'end':
                return _context.stop();
            }
          }
        }, _callee, this, [[0, 12]]);
      }));

      return function create(_x) {
        return ref.apply(this, arguments);
      };
    }()
  }, {
    key: 'run',
    value: function () {
      var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee3(migrationName, direction) {
        var untilMigration, query, sortDirection, migrationsToRun, self;
        return regeneratorRuntime.wrap(function _callee3$(_context3) {
          while (1) {
            switch (_context3.prev = _context3.next) {
              case 0:
                if (!migrationName) {
                  _context3.next = 6;
                  break;
                }

                _context3.next = 3;
                return _db2.default.findOne({ name: migrationName });

              case 3:
                _context3.t0 = _context3.sent;
                _context3.next = 9;
                break;

              case 6:
                _context3.next = 8;
                return _db2.default.findOne().sort({ createdAt: -1 });

              case 8:
                _context3.t0 = _context3.sent;

              case 9:
                untilMigration = _context3.t0;

                if (untilMigration) {
                  _context3.next = 16;
                  break;
                }

                if (!migrationName) {
                  _context3.next = 15;
                  break;
                }

                throw new ReferenceError("Could not find that migration in the database");

              case 15:
                throw new Error("There are no pending migrations.");

              case 16:
                query = {
                  createdAt: { $lte: untilMigration.createdAt },
                  state: 'down'
                };


                if (direction == 'down') {
                  query = {
                    createdAt: { $gte: untilMigration.createdAt },
                    state: 'up'
                  };
                }

                sortDirection = direction == 'up' ? 1 : -1;
                _context3.next = 21;
                return _db2.default.find(query).sort({ createdAt: sortDirection });

              case 21:
                migrationsToRun = _context3.sent;

                if (migrationsToRun.length) {
                  _context3.next = 24;
                  break;
                }

                throw new Error('There are no migrations to run'.yellow);

              case 24:
                self = this;
                _context3.next = 27;
                return _bluebird2.default.map(migrationsToRun, function () {
                  var _this = this;

                  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee2(migration) {
                    var migrationFilePath, migrationFunctions;
                    return regeneratorRuntime.wrap(function _callee2$(_context2) {
                      while (1) {
                        switch (_context2.prev = _context2.next) {
                          case 0:
                            migrationFilePath = _path2.default.join(self.migrationPath, migration.filename);
                            migrationFunctions = require(migrationFilePath);
                            _context2.prev = 2;

                            console.log((direction.toUpperCase() + ':   ')[direction == 'up' ? 'green' : 'red'], ' ' + migration.filename);
                            _context2.next = 6;
                            return migrationFunctions[direction].call(_mongoose2.default.model.bind(_mongoose2.default));

                          case 6:
                            _context2.next = 8;
                            return _db2.default.where({ name: migration.name }).update({ $set: { state: direction } }).exec();

                          case 8:
                            _context2.next = 14;
                            break;

                          case 10:
                            _context2.prev = 10;
                            _context2.t0 = _context2['catch'](2);

                            console.error(('Failed to run migration ' + migration.name + '. Not continuing. Make sure your data is in consistent state').red);
                            throw _context2.t0;

                          case 14:
                          case 'end':
                            return _context2.stop();
                        }
                      }
                    }, _callee2, _this, [[2, 10]]);
                  }));

                  return function (_x4) {
                    return ref.apply(this, arguments);
                  };
                }());

              case 27:

                console.log('All migrations finished successfully.'.green);

              case 28:
              case 'end':
                return _context3.stop();
            }
          }
        }, _callee3, this);
      }));

      return function run(_x2, _x3) {
        return ref.apply(this, arguments);
      };
    }()
  }], [{
    key: 'list',
    value: function () {
      var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee4() {
        var migrations, _iteratorNormalCompletion, _didIteratorError, _iteratorError, _iterator, _step, m;

        return regeneratorRuntime.wrap(function _callee4$(_context4) {
          while (1) {
            switch (_context4.prev = _context4.next) {
              case 0:
                _context4.next = 2;
                return _db2.default.find().sort({ createdAt: 1 });

              case 2:
                migrations = _context4.sent;

                if (!migrations.length) console.log('There are no migrations to list.'.yellow);
                _iteratorNormalCompletion = true;
                _didIteratorError = false;
                _iteratorError = undefined;
                _context4.prev = 7;
                for (_iterator = migrations[Symbol.iterator](); !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                  m = _step.value;

                  console.log(('' + (m.state == 'up' ? 'UP:  \t' : 'DOWN:\t'))[m.state == 'up' ? 'green' : 'red'], ' ' + m.filename);
                }
                _context4.next = 15;
                break;

              case 11:
                _context4.prev = 11;
                _context4.t0 = _context4['catch'](7);
                _didIteratorError = true;
                _iteratorError = _context4.t0;

              case 15:
                _context4.prev = 15;
                _context4.prev = 16;

                if (!_iteratorNormalCompletion && _iterator.return) {
                  _iterator.return();
                }

              case 18:
                _context4.prev = 18;

                if (!_didIteratorError) {
                  _context4.next = 21;
                  break;
                }

                throw _iteratorError;

              case 21:
                return _context4.finish(18);

              case 22:
                return _context4.finish(15);

              case 23:
              case 'end':
                return _context4.stop();
            }
          }
        }, _callee4, this, [[7, 11, 15, 23], [16,, 18, 22]]);
      }));

      return function list() {
        return ref.apply(this, arguments);
      };
    }()
  }]);

  return Migrator;
}();

exports.default = Migrator;


function fileRequired(error) {
  if (error && error.code == 'ENOENT') {
    console.error('Could not find any files at path \'' + error.path + '\'');
    process.exit(1);
  }
}