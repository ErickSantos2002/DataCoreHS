const { Client } = require('./node_modules/pg');
if (!process.env.DATABASE_URL) {
  console.error('Defina DATABASE_URL antes de rodar. Ex.: DATABASE_URL=postgres://usuario:senha@host:porta/banco node migrar_cc.js');
  process.exit(1);
}

const client = new Client({ connectionString: process.env.DATABASE_URL });
client.connect().then(async () => {
  await client.query('ALTER TABLE tiny.centro_custo_config ADD COLUMN IF NOT EXISTS config_json JSONB');
  console.log('coluna config_json adicionada com sucesso');
  await client.end();
}).catch(console.error);
