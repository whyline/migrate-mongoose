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

mongoose.connection.on('disconnected', () => {
  console.error('MongoDB Connection Disconnected');
});

process.on('SIGINT', () => {
  mongoose.connection.close(() => {
    console.log('Mongoose connection disconnected through app termination');
    process.exit(0);
  });
});


export default mongoose.model('migration', MigrationSchema);



