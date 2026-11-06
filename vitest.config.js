export default {
  test: {
    // O banco dos testes NÃO é configurado aqui: src/db.js usa sempre o banco
    // pratocheio_teste quando roda sob o Vitest, e ignora DATABASE_URL (história 4b).

    // Todos os arquivos de teste usam o mesmo banco; em paralelo, o
    // limparBanco() de um apagaria os dados de outro (ADR 0001).
    fileParallelism: false
  }
};
