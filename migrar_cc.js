const { Client } = require('./node_modules/pg');
const client = new Client({ connectionString: 'postgres://administrador:administrador@62.72.11.28:5555/datacore-banco?sslmode=disable' });
client.connect().then(async () => {
  await client.query('ALTER TABLE tiny.centro_custo_config ADD COLUMN IF NOT EXISTS config_json JSONB');
  console.log('coluna config_json adicionada com sucesso');
  await client.end();
}).catch(console.error);
