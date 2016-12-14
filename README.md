# migrate-mongoose
A node based migration framework for mongoose

#### Motivation
migrate-mongoose is a migration framework for projects which are already using mongoose.
 

**Most other migration frameworks:**
- Use a local state file to keep track of which migrations have been run: This is a problem for PaS providers like heroku where the file system is wiped each time you deploy
- Not configurable enough: There are not a granular enough controls to manage which migrations get run
- Rely on a document-level migration: You have to change your application code to run a migration if it hasn't been run on a document you're working with

**migrate-mongoose:**
- Stores migration state in MongoDB
- Provides plenty of features such as 
    - Access to mongoose models in migrations
    - Use of promises or standard callbacks
    - custom config files or env variables for migration options
    - ability to delete unused migrations
- Relies on a simple *GLOBAL* state of whether or not each migration has been called 
    


### Getting Started
You can install it locally in your project
```
 npm install migrate-mongoose
```
and then run
```
./node_modules/.bin/migrate [command] [options]
```

#### or

Install it globally
```
 npm install -g migrate-mongoose
```
and then run
```
migrate [command] [options]
```

### Usage
```
Usage: migrate -d <mongo-uri> [[create|up|down<migration-name>]|list|prune] [optional options]

Commands:
  list                     Lists all migrations and their current state.
  create <migration-name>  Creates a new migration file.
  up [migration-name]      Migrates all the migration files that have not yet
                           been run in chronological order. Not including
                           [migration-name] will run UP on all migrations that
                           are in a DOWN state.
  down <migration-name>    Rolls back all migrations down to given name (if down
                           function was provided)
  prune                    Allows you to delete extraneous migrations by
                           removing extraneous local migration files/database
                           migrations.
 
 
Options:
  -d, --dbConnectionUri   The URI of the database connection                           [string] [required]
  --collection            The mongo collection name to use for migrations [string] [default: "migrations"]
  --es6                   use es6 migration templates?                                           [boolean]
  --md, --migrations-dir  The path to the migration files               [string] [default: "./migrations"]
  -t, --template-file     The template file to use when creating a migration                      [string]
  -c, --change-dir        Change current working directory before running  anything               [string]
  --autosync              Automatically add any migrations on filesystem but not in db to db     [boolean]
                          rather than asking interactively (use in scripts)
  -h, --help              Show help                                                              [boolean]

 
 
Examples:
  node_modules/.bin/migrate list -d mongodb://localhost/migrations
  node_modules/.bin/migrate create add_users -d mongodb://localhost/migrations
  node_modules/.bin/migrate up add_user -d mongodb://localhost/migrations
  node_modules/.bin/migrate down delete_names -d mongodb://localhost/migrations
  node_modules/.bin/migrate prune -d mongodb://localhost/migrations
  node_modules/.bin/migrate list --config settings.json
```


#### Setting Options Automatically
If you want to not provide the options such as `--dbConnectionUri` to the program every time you have 2 options.

**1. Set the option as an Environment Variable with the prefix MIGRATE_**
```
export MIGRATE_dbConnectionUri=localhost/migrations
```
**2. Provide a config file (defaults to *migrate.json* or *migrate.js*)**
```bash
# If you have migrate.json in the directory, you don't need to do anything
migrate list
 
# Otherwise you can provide a config file
migrate list --config somePath/myCustomConfigFile[.json]
```


### Options Override Order:
Command line args _beat_ Env vars _beats_ Config File

Just make sure you don't have aliases of the same option with 2 different values between env vars and config file


#### Migration Files
Here's how you can access your `mongoose` models and handle errors in your migrations

**ES5 Example**
```javascript
'use strict';

var lib = require('myLibrary');

/**
 * Make any changes you need to make to the database here
 */
exports.up = function up (done) {
  return lib.doSomeWork().then(function() {
    // Don't forget to call done() or the migration will never finish!
    done();
  })
  .catch(function(error){
    // If you get an error in your async operations you can call done like so
    done(error);
  });
  
  // Throwing errors also works
  throw new Error('It should never get here!');
};

/**
 * Make any changes that UNDO the up function side effects here (if possible)
 */
exports.down = function down(done) {
  lib.undoAboveWork().then(function() {
      done();
    })
    .catch(function(error){
      done(error);
    });
};
```

**ES6 Example**
```javascript
/**
 * Easy flow control
 */
// Notice no need for callback 
export async function up() {
  // Error handling is as easy as throwing an error  
  if (condition) {
    throw new Error('This is an error. Could not complete migration');  
  }
  
  // You can just run your updates and when function finishes the migration is assumed to be done!
  await new Promise((resolve, reject) => {
    setTimeout(()=> { resolve('ok'); }, 3000);
  });
  
  // ========  OR ===========
  // just return the promise! It will succeed when it resolves or fail when rejected 
  return lib.getPromise();
  
}
```


**Access to mongoose models**

```javascript
// Lets say you have a user model like this

// models/User.js
const UserSchema = new Schema({
  firstName: String,
  lastName: String,
});

module.exports = mongoose.model('user', UserSchema);

// 1459287720919-my-migration.js
export async function up() {
  // Then you can access it in the migration like so  
  await this('user').update({}, {
    $rename: { firstName: 'first' }
  }, { multi: true });
  
  // Or something such as
 const users = this('user').find();
 /* Do something with users */
 
}
```


### Notes

Currently, the **-d**/**dbConnectionUri**  must include the database to use for migrations in the uri.
example: `-d mongodb://localhost:27017/development` . If you don't want to pass it in every time feel free to use the
`migrate.json` config file or an environment variable


### How to contribute
1. Start an issue. We will discuss the best approach
2. Make a pull request. I'll review it and comment until we are both confident about it
3. Profit
