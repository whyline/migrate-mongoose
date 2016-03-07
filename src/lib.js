import path from 'path';
import fs from 'fs';
import mkdirp from 'mkdirp';
import Promise from 'bluebird';
import colors from 'colors';
import mongoose from 'mongoose';

import MigrationModel from './db';

Promise.config({
  warnings: false
});

const defaultTemplate = `
"use strict";

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


export default class Migrator {
  constructor({ templatePath, migrationsPath = './migrations',  dbConnectionUri }) {
    this.template = templatePath ? fs.readFileSync(templatePath, 'utf-8') : defaultTemplate;
    this.migrationPath = path.resolve(migrationsPath);
    this.connection = mongoose.connect(dbConnectionUri);
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

    if (!migrationsToRun.length) throw new Error('There are no migrations to run'.yellow);

    let self = this;
    await Promise.map(migrationsToRun, async (migration) => {
      const migrationFilePath = path.join(self.migrationPath, migration.filename);
      const migrationFunctions = require(migrationFilePath);
      try {
        console.log(`${direction.toUpperCase()}:   `[direction == 'up'? 'green' : 'red'], ` ${migration.filename}`);
        await migrationFunctions[direction].call(mongoose.model.bind(mongoose));
        await MigrationModel.where({name: migration.name}).update({$set: {state: direction}}).exec();
      }
      catch(err) {
        console.error(`Failed to run migration ${migration.name}. Not continuing. Make sure your data is in consistent state`.red);
        throw err;
      }
    });

    console.log('All migrations finished successfully.'.green);
  }


  static async list() {
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
