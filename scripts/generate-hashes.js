
// ============================================
// SCRIPT PARA GENERAR HASHES
// scripts/generate-hashes.js
// ============================================

const bcrypt = require('bcryptjs');

const passwords = [
  { name: 'medico', password: 'diabetes2024' },
  { name: 'admin', password: 'admin2024' }
];

passwords.forEach(({ name, password }) => {
  const hash = bcrypt.hashSync(password, 10);
  console.log(`\n${name}:`);
  console.log(`Password: ${password}`);
  console.log(`Hash: ${hash}`);
});
