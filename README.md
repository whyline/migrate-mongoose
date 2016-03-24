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
- Provides plenty of configuration such as
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
 npm install -f migrate-mongoose
```
and then run
```
migrate [command] [options]
```

### Usage
```
Usage: migrate -d <mongo-uri> [[create|up|down<migration-name>]|list] [optional options]

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
  -d, --dbConnectionUri   The URI of the database connection               [string] [required]
  --es6                   use es6 migration template?                                [boolean]
  --md, --migrations-dir  The path to the migration files   [string] [default: "./migrations"]
  -t, --template-file     The template file to use when creating a migration          [string]
  -c, --change-dir        Change current working directory before running  anything   [string]
  -h, --help              Show help                                                  [boolean]

 
 
Examples:
  node_modules/.bin/migrate list
  node_modules/.bin/migrate create add_users
  node_modules/.bin/migrate up add_user
  node_modules/.bin/migrate down delete_names
  node_modules/.bin/migrate prune
```
#### Setting Options Automatically
If you want to not provide the options such as `--dbConnectionUri` to the program every time you have 2 options.

**1. Set the option as an Environment Variable with the prefix MIGRATE_**
```
export MIGRATE_dbConnectionUri=localhost/migrations
```
**2. Provide a config file (defaults to *migrate.json*)**
```bash
# If you have migrate.json in the directory, you don't need to do anything
migrate list
 
# Otherwise you can provide a config file
migrate list --config somePath/myCustomConfigFile[.json]
```

**Override Order:**
1. Command line args
2. Config file
3. Env var


#### Migration Files
Here's how you can access your `mongoose` models and handle errors in your migrations (ES5 Example)
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



### Notes

1. Currently, the **-d**/**dbConnectionUri**  must be provided along with the database you want to use.
example: `-d mongo://localhost:27017/migrations`
2. Currently the framework uses the `migrations` collection to keep track of migrations



### Roadmap
- Add support for `options` file so you don't have to keep specifying the same options over and over
- Add option to use a different instead of the default `migrations` collection
- Transpile ES6 migration files to ES5 automatically when running migrations


### How to contribute
1. Start an issue. We will discuss the best approach
2. Make a pull request. I'll review it and comment until we are both confident about it
3. Profit
