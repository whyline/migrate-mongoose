import path from 'path';
import fs from 'fs';
import mkdirp from 'mkdirp';


export default class Migration {
  static create(migrationName, { templatePath, migrationsPath }) {
    try {
      const template = fs.readFileSync(templatePath, 'utf-8');
      const newMigrationFile = `${Date.now()}-${migrationName}.js`;
      mkdirp.sync(migrationsPath);
      fs.writeFileSync(path.resolve(migrationsPath, newMigrationFile), template);

      // create instance in db
    }
    catch(error){
      fileRequired(error);
    }
  }
}





function fileRequired(error) {
  if (error && error.code == 'ENOENT') {
    console.error(`Could not find any files at path '${error.path}'`);
    process.exit(1);
  }
}
