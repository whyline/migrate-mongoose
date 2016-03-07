'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _mongoose = require('mongoose');

var _mongoose2 = _interopRequireDefault(_mongoose);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var MigrationSchema = new _mongoose.Schema({
  name: String,
  createdAt: Date,
  state: {
    type: String,
    enum: ['down', 'up'],
    default: 'down'
  }
});

MigrationSchema.virtual('filename').get(function () {
  return this.createdAt.getTime() + '-' + this.name + '.js';
});

_mongoose2.default.connection.on('error', function (err) {
  console.error('MongoDB Connection Error: ' + err);
});

process.on('SIGINT', function () {
  _mongoose2.default.connection.close();
});
process.on('exit', function () {
  _mongoose2.default.connection.close();
});

exports.default = _mongoose2.default.model('migration', MigrationSchema);