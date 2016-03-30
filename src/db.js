import mongoose, { Schema } from 'mongoose';
// Factory function for a mongoose model

export default function ( collection = 'migrations' ) {

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

  mongoose.connection.on('error', err => {
    console.error(`MongoDB Connection Error: ${err}`);
  });

  process.on('SIGINT', () => { mongoose.connection.close(); });
  process.on('exit', () => { mongoose.connection.close(); });

  return mongoose.model( collection, MigrationSchema );
}

