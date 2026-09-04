// Base de dados esqueleto — vazia por padrão.
// Dados são carregados pelo usuário via CRUD (Cadastros Base):
//   - Use "Carregar Base Padrão" para restaurar os dados originais
//   - Use "Importar DB" para carregar um arquivo exportado anteriormente
//   - Use "Exportar DB" para salvar a base atual em um arquivo JSON
export const db = {
  cabos: {
    energia: {
      headers: [],
      sizes: {}
    },
    telecom: {
      headers: [],
      sizes: {}
    }
  },
  condutos: {
    familias: [],
    itens: []
  }
};
