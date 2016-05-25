export async function up () {
  await this('users').updateMany({}, { $set: { state: 'California' } });
}

export async function down () {
  await this('users').updateMany({}, { $unset: { state: 1 } });
}
