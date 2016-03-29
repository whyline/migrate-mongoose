import path from 'path';
import fs from 'fs';
import mkdirp from 'mkdirp';
import Promise from 'bluebird';
import colors from 'colors';
import mongoose from 'mongoose';
import _ from 'lodash';
import ask from 'inquirer';

import MigrationModel from './db';

Promise.config({
  warnings: false
});

const es6Template =
`'use strict';

/**
 * Make any changes you need to make to the database here
 */
export async function up() {
}

/**
 * Make any changes that UNDO the up function side effects here (if possible)
 */
export async function down() {
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



export default class Migrator {
  constructor({ templatePath, migrationsPath = './migrations',  dbConnectionUri, es6Templates = false }) {
    const defaultTemplate = es6Templates ?  es6Template : es5Template;
    this.template = templatePath ? fs.readFileSync(templatePath, 'utf-8') : defaultTemplate;
    this.migrationPath = path.resolve(migrationsPath);
    this.connection = mongoose.connect(dbConnectionUri);
    this.es6 = es6Templates;
  }

  async create(migrationName) {
    try {
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

  async run(migrationName, direction) {
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
      await Migrator.list();
      process.exit(0)
    }

    let self = this;
    await Promise.map(migrationsToRun, async (migration) => {
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
        console.log(`${direction.toUpperCase()}:   `[direction == 'up'? 'green' : 'red'], ` ${migration.filename}`);


        await new Promise( (resolve, reject) => {
          const callPromise =  migrationFunctions[direction].call(mongoose.model.bind(mongoose), async function callback(err) {
            if (err) reject(err);
            resolve();
          });

          if (typeof callPromise.then === 'function') {
            callPromise.then(resolve).catch(reject);
          }
        });

        await MigrationModel.where({name: migration.name}).update({$set: {state: direction}}).exec();
        console.log('All migrations finished successfully.'.green);
      }
      catch(err) {
        console.error(`Failed to run migration ${migration.name} due to an error.`.red);
        console.error(`Not continuing. Make sure your data is in consistent state`.red);

        if (err.message && /Unexpected token/.test(err.message)) console.warn('If you are using an ES6 migration file, use option --es6'.yellow);
        else {
          throw err instanceof(Error) ? err : new Error(err);
        }
      }
    });
  }


  static async list() {
    const migrations = await MigrationModel.find().sort({ createdAt: 1 });
    if (!migrations.length) console.log('There are no migrations to list.'.yellow);
    for (const m of migrations){
      console.log(`${m.state == 'up' ? 'UP:  \t' : 'DOWN:\t'}`[m.state == 'up'? 'green' : 'red'], ` ${m.filename}`);
    }
  }

  static async prune() {
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


      const filesNotInDb = _.filter(migrationsInFolder, { existsInDatabase: false }).map( f => f.filename );

      if (filesNotInDb.length) {
        const answers =  await new Promise(function(resolve) {
          ask.prompt({
            type: 'checkbox',
            message: 'The following migrations exist in the migrations folder but not in the database. Select the ones you want to remove from the file system.',
            name: 'filesToDelete',
            choices: filesNotInDb
          }, (answers) => {
            resolve(answers);
          });
        });

        for (const fileToDelete of answers.filesToDelete) {
          const filePath= path.join(this.migrationPath, fileToDelete);
          console.log(`Removing ${filePath} from file system`);
          fs.unlinkSync(filePath);
        }
      }

      const dbMigrationsNotOnFs = _.filter(migrationsInDatabase, m => {
        return !_.find(migrationsInFolder, { filename: m.filename })
      });

      if (dbMigrationsNotOnFs.length) {
        const answers =  await new Promise(function(resolve) {
          ask.prompt({
            type: 'checkbox',
            message: 'The following migrations exist in the database but not in the migrations folder. Select the ones you want to remove from the file system.',
            name: 'migrationsToDelete',
            choices: dbMigrationsNotOnFs
          }, (answers) => {
            resolve(answers);
          });
        });


        if (answers.migrationsToDelete.length) {
          console.log(`Removing migration(s) `, `${answers.migrationsToDelete.join(', ')}`.cyan, ` from database`);
          await MigrationModel.remove({
            name: { $in: answers.migrationsToDelete }
          });
        }
      }
    }
    catch(error) {
      console.error(`Could not prune extraneous migrations.`.red);
      console.log(error);
      throw error;
    }
  }
}



function fileRequired(error) {
  if (error && error.code == 'ENOENT') {
    console.error(`Could not find any files at path '${error.path}'`);
    process.exit(1);
  }
}
