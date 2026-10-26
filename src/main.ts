import db from './generated/db.json';

document.querySelector('#app')!.textContent = `資器材 ${db.items.length} 品目`;
