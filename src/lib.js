import path from 'path';
import fs from 'fs';
import mkdirp from 'mkdirp';
import Promise from 'bluebird';
import colors from 'colors';
import mongoose from 'mongoose';
import _ from 'lodash';
import ask from 'inquirer';

import MigrationModelFactory from './db';
let MigrationModel;

Promise.config({
  warnings: false
});

const es6Template =
`
/**
 * Make any changes you need to make to the database here
 */
export async function up() {
  // Write migration here
}

/**
 * Make any changes that UNDO the up function side effects here (if possible)
 */
export async function down() {
  // Write migration here
}
`;

const es5Template =
`'use strict';

/**
 * Make any changes you need to make to the database here
 */
exports.up = function up (done) {
  done();
};

/**
 * Make any changes that UNDO the up function side effects here (if possible)
 */
exports.down = function down(done) {
  done();
};
`;

/**
 * Print a message to the stder and quit process
 * @param {strint} message - the message to print. Can be styled.
 */
function errorQuit(message) {
  console.error(message);
  process.exit(1);
}


export default class Migrator {
  constructor({ templatePath, migrationsPath = './migrations',  dbConnectionUri, es6Templates = false, collectionName = 'migrations', autosync = false }) {
    const defaultTemplate = es6Templates ?  es6Template : es5Template;
    this.template = templatePath ? fs.readFileSync(templatePath, 'utf-8') : defaultTemplate;
    this.migrationPath = path.resolve(migrationsPath);
    this.connection = mongoose.connect(dbConnectionUri);
    this.es6 = es6Templates;
    this.collection = collectionName;
    this.autosync = autosync;
    MigrationModel = MigrationModelFactory(collectionName);
  }

  async create(migrationName) {
    try {
      const existingMigration = await MigrationModel.findOne({ name: migrationName });
      if (!!existingMigration) return errorQuit(`There is already a migration with name '${migrationName}' in the database`.red);

      await this.sync();
      const now = Date.now();
      const newMigrationFile = `${now}-${migrationName}.js`;
      mkdirp.sync(this.migrationPath);
      fs.writeFileSync(path.join(this.migrationPath, newMigrationFile), this.template);
      // create instance in db
      await this.connection;
      await MigrationModel.create({
        name: migrationName,
        createdAt: now
      });
      console.log(`Created migration ${migrationName} in ${this.migrationPath}.`);
    }
    catch(error){
      console.error(error.stack);
      fileRequired(error);
    }
  }

  /**
   * Runs migrations up to or down to a given migration name
   *
   * @param migrationName
   * @param direction
   */
  async run(migrationName, direction) {
    await this.sync();

    const untilMigration = migrationName ?
      await MigrationModel.findOne({name: migrationName}) :
      await MigrationModel.findOne().sort({createdAt: -1});

    if (!untilMigration) {
      if (migrationName) throw new ReferenceError("Could not find that migration in the database");
      else throw new Error("There are no pending migrations.");
    }

    let query = {
      createdAt: {$lte: untilMigration.createdAt},
      state: 'down'
    };

    if (direction == 'down') {
      query = {
        createdAt: {$gte: untilMigration.createdAt},
        state: 'up'
      };
    }


    const sortDirection = direction == 'up' ? 1 : -1;
    const migrationsToRun = await MigrationModel.find(query)
      .sort({createdAt: sortDirection});

    if (!migrationsToRun.length) {
      console.warn('There are no migrations to run'.yellow);
      console.log(`Current Migrations' Statuses: `);
      await this.list();
      process.exit(0)
    }

    let self = this;
    let numMigrationsRan = 0;
    for (const migration of migrationsToRun) {
      try {
        const migrationFilePath = path.join(self.migrationPath, migration.filename);

        if (this.es6) {
          require('babel-register')({
            "presets": [require("babel-preset-stage-0"),  require("babel-preset-es2015")],
            "plugins": [require("babel-plugin-transform-runtime")]
          });

          require('babel-polyfill');
        }

        const migrationFunctions = require(migrationFilePath);

        if (!migrationFunctions[direction]) errorQuit(`The ${direction} export is not defined in ${migration.filename}.`.red);


        await new Promise( (resolve, reject) => {
          const callPromise =  migrationFunctions[direction].call(mongoose.model.bind(mongoose), function callback(err) {
            if (err) return reject(err);
            resolve();
          });

          if (callPromise && typeof callPromise.then === 'function') {
            callPromise.then(resolve).catch(reject);
          }
        });

        console.log(`${direction.toUpperCase()}:   `[direction == 'up'? 'green' : 'red'] + ` ${migration.filename} `);

        await MigrationModel.where({name: migration.name}).update({$set: {state: direction}});
        numMigrationsRan++;
      }
      catch(err) {
        console.error(`Failed to run migration ${migration.name} due to an error.`.red);
        console.error(`Not continuing. Make sure your data is in consistent state`.red);

        if (err.message && /Unexpected token/.test(err.message)) errorQuit('If you are using an ES6 migration file, use option --es6'.yellow);

        else {
          throw err instanceof(Error) ? err : new Error(err);
        }
      }
    }

    if (migrationsToRun.length == numMigrationsRan) console.log('All migrations finished successfully.'.green);
  }

  /**
   * Looks at the file system migrations and imports any migrations that are
   * on the file system but missing in the database into the database
   *
   * This functionality is opposite of prune()
   */
  async sync() {
    try {
      const filesInMigrationFolder = fs.readdirSync(this.migrationPath);
      const migrationsInDatabase = await MigrationModel.find({});
      // Go over migrations in folder and delete any files not in DB
      const migrationsInFolder = _.filter(filesInMigrationFolder, file => /\d{13,}\-.+.js$/.test(file))
        .map(filename => {
          const fileCreatedAt = parseInt(filename.split('-')[0]);
          const existsInDatabase = !!_.find(migrationsInDatabase, {createdAt: new Date(fileCreatedAt)});
          return {createdAt: fileCreatedAt, filename, existsInDatabase};
        });

      const filesNotInDb = _.filter(migrationsInFolder, {existsInDatabase: false}).map(f => f.filename);

      if (filesNotInDb.length) {
        console.log('Synchronizing database with file system migrations...');
        let migrationsToImport = filesNotInDb;

        if (!this.autosync) {
          const answers = await new Promise(function (resolve) {
            ask.prompt({
              type: 'checkbox',
              message: 'The following migrations exist in the migrations folder but not in the database. Select the ones you want to import into the database',
              name: 'migrationsToImport',
              choices: filesNotInDb
            }, (answers) => {
              resolve(answers);
            });
          });

          migrationsToImport = answers.migrationsToImport;
        }


        for (const migrationToImport of migrationsToImport) {
          const filePath = path.join(this.migrationPath, migrationToImport),
            timestampSeparatorIndex = migrationToImport.indexOf('-'),
            timestamp = migrationToImport.slice(0, timestampSeparatorIndex),
            migrationName = migrationToImport.slice(timestampSeparatorIndex + 1, migrationToImport.lastIndexOf('.'));

          console.log(`Adding migration ${filePath} into database from file system. State is ` + `DOWN`.red);
          await MigrationModel.create({
            name: migrationName,
            createdAt: timestamp
          });
        }
      }
    }
    catch (error) {
      console.error(`Could not synchronise migrations in the migrations folder up to the database.`.red);
      throw error;
    }
  }

  /**
   * Opposite of sync().
   * Removes files in migration directory which don't exist in database.
   */
  async prune() {
    try {
      const filesInMigrationFolder = fs.readdirSync(this.migrationPath);
      const migrationsInDatabase = await MigrationModel.find({});
      // Go over migrations in folder and delete any files not in DB
      const migrationsInFolder = _.filter(filesInMigrationFolder, file => /\d{13,}\-.+.js/.test(file) )
        .map(filename => {
          const fileCreatedAt = parseInt(filename.split('-')[0]);
          const existsInDatabase = !!_.find(migrationsInDatabase, { createdAt: new Date(fileCreatedAt) });
          return { createdAt: fileCreatedAt, filename,  existsInDatabase };
        });

      const dbMigrationsNotOnFs = _.filter(migrationsInDatabase, m => {
        return !_.find(migrationsInFolder, { filename: m.filename })
      });


      let migrationsToDelete = dbMigrationsNotOnFs.map( m => m.name );

      if (!this.autosync && !!migrationsToDelete.length) {
        const answers = await new Promise(function (resolve) {
          ask.prompt({
            type: 'checkbox',
            message: 'The following migrations exist in the database but not in the migrations folder. Select the ones you want to remove from the file system.',
            name: 'migrationsToDelete',
            choices: migrationsToDelete
          }, (answers) => {
            resolve(answers);
          });
        });

        migrationsToDelete = answers.migrationsToDelete;
      }

      if (migrationsToDelete.length) {
        console.log(`Removing migration(s) `, `${migrationsToDelete.join(', ')}`.cyan, ` from database`);
        await MigrationModel.remove({
          name: { $in: migrationsToDelete }
        });
      }
    }
    catch(error) {
      console.error(`Could not prune extraneous migrations from database.`.red);
      throw error;
    }
  }

  /**
   * Lists the current migrations and their statuses
   */
  async list() {
    await this.sync();
    const migrations = await MigrationModel.find().sort({ createdAt: 1 });
    if (!migrations.length) console.log('There are no migrations to list.'.yellow);
    for (const m of migrations){
      console.log(`${m.state == 'up' ? 'UP:  \t' : 'DOWN:\t'}`[m.state == 'up'? 'green' : 'red'], ` ${m.filename}`);
    }
  }
}



function fileRequired(error) {
  if (error && error.code == 'ENOENT') {
    console.error(`Could not find any files at path '${error.path}'`);
    process.exit(1);
  }
}
