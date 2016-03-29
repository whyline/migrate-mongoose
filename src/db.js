import mongoose, { Schema } from 'mongoose';

const MigrationSchema = new Schema({
  name: String,
  createdAt: Date,
  state: {
    type: String,
    enum: ['down', 'up'],
    default: 'down'
  }
});

MigrationSchema.virtual('filename').get(function() {
  return `${this.createdAt.getTime()}-${this.name}.js`;
});

mongoose.connection.on('error', err => {
  console.error(`MongoDB Connection Error: ${err}`);
});

process.on('SIGINT', () => { mongoose.connection.close(); });
process.on('exit', () => { mongoose.connection.close(); });

export default mongoose.model('migration', MigrationSchema);

