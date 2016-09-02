import mongoose, { Schema }  from 'mongoose';
import Promise from 'bluebird';
// Factory function for a mongoose model
mongoose.Promise = Promise;

export default function ( collection = 'migrations', dbConnection ) {

  const MigrationSchema = new Schema({
    name: String,
    createdAt: Date,
    state: {
      type: String,
      enum: ['down', 'up'],
      default: 'down'
    }
  }, {
    collection: collection
  });

  MigrationSchema.virtual('filename').get(function() {
    return `${this.createdAt.getTime()}-${this.name}.js`;
  });

  dbConnection.on('error', err => {
    console.error(`MongoDB Connection Error: ${err}`);
  });

  process.on('SIGINT', () => { dbConnection.close(); });
  process.on('exit', () => { dbConnection.close(); });

  return dbConnection.model( collection, MigrationSchema );
}

