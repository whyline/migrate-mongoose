### Example of using the library programmatically

```javascript
var migrateMongoose = require('migrate-mongoose');

// Define all your variables
var 
 migrationsDir = '/path/to/migrations/',
 templatePath,
 dbUrl = 'mongodb://localhost/db',
 useES6 = true,
 collectionName = 'myMigrations',
 autosync = true;

let migrator = new migrateMongoose({
  migrationsPath:  migrationsDir, // Path to migrations directory
  templatePath: templatePath, // The template to use when creating migrations needs up and down functions exposed
  dbConnectionUri: dbUrl, // mongo url
  es6Templates: useES6, // Should migrations be assumed to be using ES6?
  collectionName:  collectionName, // collection name to use for migrations (defaults to 'migrations')
  autosync: autosync // if making a CLI app, set this to false to prompt the user, otherwise true
});


var migrationName = 'myNewMigration', promise;

// Create a new migration
migrator.create(migrationName).then(()=> {
  console.log(`Migration created. Run `+ `mongoose-migrate up ${migrationName}`.cyan + ` to apply the migration.`);
});

// Migrate Up
promise = migrator.run(migrationName, 'up');

// Migrate Down
promise = migrator.run(migrationName, 'down');

// List Migrations
/*
Example return val

Promise which resolves with
[
 { name: 'my-migration', filename: '149213223424_my-migration.js', state: 'up' },
 { name: 'add-cows', filename: '149213223453_add-cows.js', state: 'down' }
]

*/
promise = migrator.list();


// Prune extraneous migrations from file system
promise = migrator.prune();

// Synchronize DB with latest migrations from file system
/*
Looks at the file system migrations and imports any migrations that are
on the file system but missing in the database into the database

This functionality is opposite of prune()
*/
promise = migrator.sync();


