// Run: node server/scripts/generate-sample.js
// Creates sample_attendance.xlsx in the project root

const XLSX = require('xlsx');
const path = require('path');

const data = [
  { name: 'Иванов Иван Иванович',    group: 'ИС-21', date: '2024-09-02', status: 'present' },
  { name: 'Петров Пётр Петрович',     group: 'ИС-21', date: '2024-09-02', status: 'absent'  },
  { name: 'Сидорова Анна Алексеевна', group: 'ИС-21', date: '2024-09-02', status: 'present' },
  { name: 'Козлов Артём Сергеевич',   group: 'МТ-22', date: '2024-09-02', status: 'present' },
  { name: 'Морозова Елена Юрьевна',   group: 'МТ-22', date: '2024-09-02', status: 'absent'  },
  { name: 'Иванов Иван Иванович',    group: 'ИС-21', date: '2024-09-04', status: 'present' },
  { name: 'Петров Пётр Петрович',     group: 'ИС-21', date: '2024-09-04', status: 'absent'  },
  { name: 'Сидорова Анна Алексеевна', group: 'ИС-21', date: '2024-09-04', status: 'present' },
  { name: 'Козлов Артём Сергеевич',   group: 'МТ-22', date: '2024-09-04', status: 'absent'  },
  { name: 'Морозова Елена Юрьевна',   group: 'МТ-22', date: '2024-09-04', status: 'present' },
  { name: 'Иванов Иван Иванович',    group: 'ИС-21', date: '2024-09-09', status: 'absent'  },
  { name: 'Петров Пётр Петрович',     group: 'ИС-21', date: '2024-09-09', status: 'absent'  },
  { name: 'Сидорова Анна Алексеевна', group: 'ИС-21', date: '2024-09-09', status: 'present' },
  { name: 'Козлов Артём Сергеевич',   group: 'МТ-22', date: '2024-09-09', status: 'present' },
  { name: 'Морозова Елена Юрьевна',   group: 'МТ-22', date: '2024-09-09', status: 'absent'  },
  { name: 'Иванов Иван Иванович',    group: 'ИС-21', date: '2024-09-11', status: 'absent'  },
  { name: 'Петров Пётр Петрович',     group: 'ИС-21', date: '2024-09-11', status: 'present' },
  { name: 'Сидорова Анна Алексеевна', group: 'ИС-21', date: '2024-09-11', status: 'present' },
  { name: 'Козлов Артём Сергеевич',   group: 'МТ-22', date: '2024-09-11', status: 'present' },
  { name: 'Морозова Елена Юрьевна',   group: 'МТ-22', date: '2024-09-11', status: 'present' },
  { name: 'Иванов Иван Иванович',    group: 'ИС-21', date: '2024-09-16', status: 'present' },
  { name: 'Петров Пётр Петрович',     group: 'ИС-21', date: '2024-09-16', status: 'absent'  },
  { name: 'Сидорова Анна Алексеевна', group: 'ИС-21', date: '2024-09-16', status: 'present' },
  { name: 'Козлов Артём Сергеевич',   group: 'МТ-22', date: '2024-09-16', status: 'absent'  },
  { name: 'Морозова Елена Юрьевна',   group: 'МТ-22', date: '2024-09-16', status: 'absent'  },
];

const wb = XLSX.utils.book_new();
const ws = XLSX.utils.json_to_sheet(data);
ws['!cols'] = [{ wch: 30 }, { wch: 10 }, { wch: 12 }, { wch: 10 }];
XLSX.utils.book_append_sheet(wb, ws, 'Посещаемость');
const out = path.join(__dirname, '../../sample_attendance.xlsx');
XLSX.writeFile(wb, out);
console.log('Created:', out);
