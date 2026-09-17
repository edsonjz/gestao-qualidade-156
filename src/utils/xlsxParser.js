import * as XLSX from 'xlsx';

// Normalização para ignorar acentos, caracteres especiais e maiúsculas nas colunas do Excel
function normalizeKey(key) {
  if (typeof key !== 'string') return '';
  return key
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

// Encontra o índice da primeira coluna que combina com qualquer um dos aliases fornecidos
function findHeaderIndex(headers, aliases) {
  for (const alias of aliases) {
    const normalizedAlias = normalizeKey(alias);
    const index = headers.findIndex(h => h === normalizedAlias || h.includes(normalizedAlias));
    if (index !== -1) return index;
  }
  return -1;
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

        const headers = (rawRows[0] || []).map(h => normalizeKey(String(h || '')));
        
        // Índices das colunas baseado em aliases flexíveis
        const nameIdx = findHeaderIndex(headers, ['nome', 'operador', 'colaborador', 'atendente', 'funcionario']);
        const matriculaIdx = findHeaderIndex(headers, ['matricula', 're', 'registro', 'id', 'codigo', 'cod']);
        const superIdx = findHeaderIndex(headers, ['supervisor', 'supervisora', 'gestor', 'gestora', 'lider', 'coordenador']);
        const horarioIdx = findHeaderIndex(headers, ['horario', 'turno', 'jornada']);
        const alocacaoIdx = findHeaderIndex(headers, ['alocacao', 'modelo', 'local']);
        const skillIdx = findHeaderIndex(headers, ['skill', 'canal']);
        const escalaIdx = findHeaderIndex(headers, ['escala']);

        const operators = [];

        for (let i = 1; i < rawRows.length; i++) {
          const row = rawRows[i];
          if (!row || row.length === 0) continue;

          const getVal = (index) => {
            return index !== -1 && row[index] !== undefined && row[index] !== null ? String(row[index]).trim() : '';
          };

          const name = getVal(nameIdx);
          const matricula = getVal(matriculaIdx);
          const supervisor = getVal(superIdx);

          // Ignora linhas sem nome
          if (!name) continue;

          // Normalizar Alocação (Home Office ou Presencial)
          let alocacao = getVal(alocacaoIdx) || 'Presencial';
          const normAloc = normalizeKey(alocacao);
          if (normAloc.includes('home') || normAloc.includes('ho') || normAloc.includes('office') || normAloc.includes('remoto')) {
            alocacao = 'Home Office';
          } else {
            alocacao = 'Presencial';
          }

          // Normalizar Escala (5x2 ou 6x1)
          let escala = getVal(escalaIdx) || '6x1';
          if (escala.includes('5')) {
            escala = '5x2';
          } else {
            escala = '6x1';
          }

          // Normalizar Skill (Voz ou Mídias)
          let skill = getVal(skillIdx) || 'Voz';
          const normSkill = normalizeKey(skill);
          if (normSkill.includes('midia') || normSkill.includes('chat') || normSkill.includes('digital') || normSkill.includes('email')) {
            skill = 'Mídias';
          } else {
            skill = 'Voz';
          }

          operators.push({
            name: name,
            matricula: matricula || '',
            supervisor_name: supervisor || 'Geral',
            schedule: getVal(horarioIdx) || '08:00 - 17:12',
            allocation: alocacao,
            skill: skill,
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

// Função para exportar lista de colaboradores formatada
export function exportOperatorsToExcel(operators, fileName = 'colaboradores_156.xlsx') {
  const formattedData = operators.map(op => ({
    'Supervisor': op.supervisor_name || 'Não atribuído',
    'Matrícula': op.matricula || '',
    'Nome': op.name || '',
    'Turno / Horário': op.schedule || '08:00 - 17:12',
    'Skill': op.skill || 'Voz',
    'Escala': op.escala || '6x1',
    'Alocação': op.allocation || 'Presencial',
    'Status': op.active ? 'Ativo' : 'Inativo'
  }));

  const worksheet = XLSX.utils.json_to_sheet(formattedData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Colaboradores');
  XLSX.writeFile(workbook, fileName);
}

// Função para gerar modelo simples de planilha para download
export function generateTemplateExcel(fileName = 'modelo_importacao_colaboradores.xlsx') {
  const templateData = [
    {
      'Supervisor': 'Carlos Silva',
      'Matrícula': '156001',
      'Nome': 'Ana Paula Oliveira'
    },
    {
      'Supervisor': 'Mariana Souza',
      'Matrícula': '156002',
      'Nome': 'Bruno Ferreira Lima'
    },
    {
      'Supervisor': 'Carlos Silva',
      'Matrícula': '156003',
      'Nome': 'Camila Santos Rocha'
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(templateData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Modelo');
  XLSX.writeFile(workbook, fileName);
}

// Função genérica para exportar dados para Excel
export function exportToExcel(data, fileName = 'relatorio.xlsx') {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Dados');
  XLSX.writeFile(workbook, fileName);
}
