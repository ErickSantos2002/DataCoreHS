const { Client } = require('./node_modules/pg');
const XLSX = require('./node_modules/xlsx');

const client = new Client({
  connectionString: 'postgres://administrador:administrador@62.72.11.28:5555/datacore-banco?sslmode=disable'
});

async function main() {
  await client.connect();

  const query = `
    SELECT
      i.descricao,
      EXTRACT(MONTH FROM n.data_emissao) AS mes,
      SUM(CAST(i.quantidade AS numeric)) AS total_quantidade
    FROM tiny.itens_nota i
    JOIN tiny.notas_fiscais n ON i.id_nota = n.id
    WHERE EXTRACT(YEAR FROM n.data_emissao) = 2025
      AND n.descricao_situacao = 'Emitida DANFE'
      AND (
        n.natureza_operacao ILIKE '%6102%' OR
        n.natureza_operacao ILIKE '%5102%' OR
        n.natureza_operacao ILIKE '%6108%' OR
        n.natureza_operacao ILIKE '%5108%'
      )
      AND n.id NOT IN (
        SELECT DISTINCT m.id_nota FROM tiny.marcadores m
        WHERE LOWER(m.descricao) IN (
          'cancelar','cliente não quis o produto','nf devolvida',
          'nf cancelada','nf recusada',
          'nf recusada. cliente solicitou frete','inutilizada'
        )
      )
    GROUP BY i.descricao, EXTRACT(MONTH FROM n.data_emissao)
    ORDER BY i.descricao, mes
  `;

  const result = await client.query(query);
  await client.end();

  // Organizar dados: produto -> { mes -> quantidade }
  const produtos = {};
  for (const row of result.rows) {
    const produto = row.descricao;
    const mes = parseInt(row.mes);
    const qtd = parseFloat(row.total_quantidade);
    if (!produtos[produto]) produtos[produto] = {};
    produtos[produto][mes] = qtd;
  }

  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  // Montar linhas da planilha
  const header = ['Produto', ...meses, 'Total Anual'];
  const rows = [header];

  const totaisMensais = new Array(12).fill(0);

  for (const [produto, mesesData] of Object.entries(produtos)) {
    const linha = [produto];
    let totalAnual = 0;
    for (let m = 1; m <= 12; m++) {
      const qtd = mesesData[m] || 0;
      linha.push(qtd);
      totalAnual += qtd;
      totaisMensais[m - 1] += qtd;
    }
    linha.push(totalAnual);
    rows.push(linha);
  }

  // Linha de totais mensais
  const totalAnualGeral = totaisMensais.reduce((a, b) => a + b, 0);
  rows.push(['TOTAL', ...totaisMensais, totalAnualGeral]);

  // Criar workbook
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Largura das colunas
  ws['!cols'] = [
    { wch: 50 }, // Produto
    ...meses.map(() => ({ wch: 8 })),
    { wch: 12 }  // Total
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Vendas 2025');
  XLSX.writeFile(wb, 'D:/GitHub/DataCoreHS/vendas_2025.xlsx');
  console.log('Planilha gerada: vendas_2025.xlsx');
  console.log(`Total de produtos: ${Object.keys(produtos).length}`);
}

main().catch(console.error);
