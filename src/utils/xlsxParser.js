import * as XLSX from 'xlsx';

// Normalização para ignorar acentos e maiúsculas nas colunas do Excel
function normalizeKey(key) {
  if (typeof key !== 'string') return '';
  return key
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function parseOperatorsExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Obter os dados brutos como array de arrays para podermos normalizar o cabeçalho
        const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        if (rawRows.length === 0) {
          resolve([]);
          return;
        }

        const headers = rawRows[0].map(h => normalizeKey(h));
        const operators = [];

        for (let i = 1; i < rawRows.length; i++) {
          const row = rawRows[i];
          if (row.length === 0 || !row[headers.indexOf('nome')]) continue; // Ignora linhas vazias ou sem nome

          const getVal = (headerName) => {
            const index = headers.indexOf(normalizeKey(headerName));
            return index !== -1 ? String(row[index] || '').trim() : '';
          };

          // Normalizar Alocação (Home Office ou Presencial)
          let alocacao = getVal('alocacao') || 'Presencial';
          if (normalizeKey(alocacao).includes('home') || normalizeKey(alocacao).includes('ho') || normalizeKey(alocacao).includes('office')) {
            alocacao = 'Home Office';
          } else {
            alocacao = 'Presencial';
          }

          // Normalizar Escala (5x2 ou 6x1)
          let escala = getVal('escala') || '6x1';
          if (escala.includes('5')) {
            escala = '5x2';
          } else {
            escala = '6x1';
          }

          operators.push({
            name: getVal('nome'),
            supervisor_name: getVal('supervisor'),
            schedule: getVal('horario') || getVal('horario de trabalho') || '08:00 - 17:12',
            allocation: alocacao,
            skill: getVal('skill') || 'Voz',
            escala: escala,
            active: true
          });
        }
        resolve(operators);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}

// Função para exportar dados para Excel real
export function exportToExcel(data, fileName = 'relatorio.xlsx') {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Dados');
  XLSX.writeFile(workbook, fileName);
}
