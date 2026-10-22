export default {
  test: {
    // O banco dos testes NÃO é configurado aqui: src/db.js usa sempre o SQLite
    // em memória quando roda sob o Vitest, e ignora DATABASE_FILE (história 4b).
  }
};
