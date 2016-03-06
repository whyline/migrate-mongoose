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
        var _this = this;

        var untilMigration, query, sortDirection, migrationsToRun, migrationPromises, _iteratorNormalCompletion, _didIteratorError, _iteratorError, _loop, _iterator, _step;

        return regeneratorRuntime.wrap(function _callee3$(_context4) {
          while (1) {
            switch (_context4.prev = _context4.next) {
              case 0:
                if (!migrationName) {
                  _context4.next = 6;
                  break;
                }

                _context4.next = 3;
                return _db2.default.findOne({ name: migrationName });

              case 3:
                _context4.t0 = _context4.sent;
                _context4.next = 9;
                break;

              case 6:
                _context4.next = 8;
                return _db2.default.findOne().sort({ createdAt: -1 });

              case 8:
                _context4.t0 = _context4.sent;

              case 9:
                untilMigration = _context4.t0;

                if (untilMigration) {
                  _context4.next = 12;
                  break;
                }

                throw new ReferenceError("There are no pending migrations.");

              case 12:
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

                console.log('using query', query);

                sortDirection = direction == 'up' ? 1 : -1;
                _context4.next = 18;
                return _db2.default.find(query).sort({ createdAt: sortDirection });

              case 18:
                migrationsToRun = _context4.sent;


                console.log('found migrations', migrationsToRun);

                if (!migrationsToRun.length) console.warn('There are no migrations to run'.yellow);

                migrationPromises = [];
                _iteratorNormalCompletion = true;
                _didIteratorError = false;
                _iteratorError = undefined;
                _context4.prev = 25;
                _loop = regeneratorRuntime.mark(function _loop() {
                  var migration, migrationFilePath, migrationFunctions;
                  return regeneratorRuntime.wrap(function _loop$(_context3) {
                    while (1) {
                      switch (_context3.prev = _context3.next) {
                        case 0:
                          migration = _step.value;
                          migrationFilePath = _path2.default.join(_this.migrationPath, migration.filename);

                          console.log('migration file path', migrationFilePath);
                          migrationFunctions = require(migrationFilePath);

                          console.log('Required');

                          _context3.t0 = migrationPromises;
                          _context3.next = 8;
                          return new _bluebird2.default(function () {
                            var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee2(resolve, reject) {
                              return regeneratorRuntime.wrap(function _callee2$(_context2) {
                                while (1) {
                                  switch (_context2.prev = _context2.next) {
                                    case 0:
                                      _context2.prev = 0;

                                      console.log((direction.toUpperCase() + ':   ')[direction == 'up' ? 'green' : 'red'], ' ' + migration.filename);
                                      _context2.next = 4;
                                      return migrationFunctions[direction].call(_mongoose2.default.model.bind(_mongoose2.default));

                                    case 4:
                                      _context2.next = 6;
                                      return _db2.default.update({ name: migration.name }, { $set: { state: direction } });

                                    case 6:
                                      resolve();
                                      _context2.next = 14;
                                      break;

                                    case 9:
                                      _context2.prev = 9;
                                      _context2.t0 = _context2['catch'](0);

                                      console.error(('Failed to run migration ' + migration.name + '. Not continuing. Make sure your data is in consistent state').red);
                                      console.error('Details: ', _context2.t0.stack);
                                      reject(_context2.t0);

                                    case 14:
                                    case 'end':
                                      return _context2.stop();
                                  }
                                }
                              }, _callee2, _this, [[0, 9]]);
                            })),
                                _this = _this;

                            return function (_x4, _x5) {
                              return ref.apply(_this, arguments);
                            };
                          }());

                        case 8:
                          _context3.t1 = _context3.sent;

                          _context3.t0.push.call(_context3.t0, _context3.t1);

                        case 10:
                        case 'end':
                          return _context3.stop();
                      }
                    }
                  }, _loop, _this);
                });
                _iterator = migrationsToRun[Symbol.iterator]();

              case 28:
                if (_iteratorNormalCompletion = (_step = _iterator.next()).done) {
                  _context4.next = 33;
                  break;
                }

                return _context4.delegateYield(_loop(), 't1', 30);

              case 30:
                _iteratorNormalCompletion = true;
                _context4.next = 28;
                break;

              case 33:
                _context4.next = 39;
                break;

              case 35:
                _context4.prev = 35;
                _context4.t2 = _context4['catch'](25);
                _didIteratorError = true;
                _iteratorError = _context4.t2;

              case 39:
                _context4.prev = 39;
                _context4.prev = 40;

                if (!_iteratorNormalCompletion && _iterator.return) {
                  _iterator.return();
                }

              case 42:
                _context4.prev = 42;

                if (!_didIteratorError) {
                  _context4.next = 45;
                  break;
                }

                throw _iteratorError;

              case 45:
                return _context4.finish(42);

              case 46:
                return _context4.finish(39);

              case 47:
                _context4.next = 49;
                return _bluebird2.default.settle(migrationPromises);

              case 49:
                _mongoose2.default.disconnect();

              case 50:
              case 'end':
                return _context4.stop();
            }
          }
        }, _callee3, this, [[25, 35, 39, 47], [40,, 42, 46]]);
      }));

      return function run(_x2, _x3) {
        return ref.apply(this, arguments);
      };
    }()
  }], [{
    key: 'list',
    value: function () {
      var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee4() {
        var migrations, _iteratorNormalCompletion2, _didIteratorError2, _iteratorError2, _iterator2, _step2, m;

        return regeneratorRuntime.wrap(function _callee4$(_context5) {
          while (1) {
            switch (_context5.prev = _context5.next) {
              case 0:
                _context5.next = 2;
                return _db2.default.find().sort({ createdAt: 1 });

              case 2:
                migrations = _context5.sent;
                _iteratorNormalCompletion2 = true;
                _didIteratorError2 = false;
                _iteratorError2 = undefined;
                _context5.prev = 6;

                for (_iterator2 = migrations[Symbol.iterator](); !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                  m = _step2.value;

                  console.log((m.state.toUpperCase() + ':   ')[m.state == 'up' ? 'green' : 'red'], ' ' + m.filename);
                }
                _context5.next = 14;
                break;

              case 10:
                _context5.prev = 10;
                _context5.t0 = _context5['catch'](6);
                _didIteratorError2 = true;
                _iteratorError2 = _context5.t0;

              case 14:
                _context5.prev = 14;
                _context5.prev = 15;

                if (!_iteratorNormalCompletion2 && _iterator2.return) {
                  _iterator2.return();
                }

              case 17:
                _context5.prev = 17;

                if (!_didIteratorError2) {
                  _context5.next = 20;
                  break;
                }

                throw _iteratorError2;

              case 20:
                return _context5.finish(17);

              case 21:
                return _context5.finish(14);

              case 22:
              case 'end':
                return _context5.stop();
            }
          }
        }, _callee4, this, [[6, 10, 14, 22], [15,, 17, 21]]);
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