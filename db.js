// db.js — armazenamento em arquivo JSON (sem compilação nativa, funciona em qualquer PC).
const fs = require('fs');
const path = require('path');
const { hashPassword, verifyPassword } = require('./auth');

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

function emptyDB() {
  return { users: [], students: [], activities: [], grades: [], videos: [], forumPosts: [], nextUserId: 1, nextStudentId: 1, nextActivityId: 1, nextGradeId: 1, nextVideoId: 1, nextForumId: 1 };
}

function load() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_FILE)) {
    const initial = emptyDB();
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2));
    return initial;
  }
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch {
    // Arquivo corrompido/vazio: recomeça do zero em vez de derrubar o servidor.
    const initial = emptyDB();
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2));
    return initial;
  }
}

function save(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

let state = load();

// ---- Compatibilidade com bancos já existentes (criados antes desta versão) ----
state.activities = state.activities || [];
state.grades = state.grades || [];
state.videos = state.videos || [];
state.forumPosts = state.forumPosts || [];
state.nextActivityId = state.nextActivityId || 1;
state.nextGradeId = state.nextGradeId || 1;
state.nextVideoId = state.nextVideoId || 1;
state.nextForumId = state.nextForumId || 1;

// ---- Usuários padrão ----
// As senhas NÃO ficam mais escritas no código. Elas vêm das variáveis de
// ambiente configuradas no painel do Render (Environment):
//   ADMIN_SENHA, PROFESSOR_SENHA e (opcional) ALUNO_SENHA
// Se a variável existir, o usuário é criado ou tem a senha atualizada a cada
// inicialização. Se não existir, o usuário não é criado.
state.users = state.users || [];
const seedUsers = [
  { username: 'tacio.macedo',      env: 'PROFESSOR_SENHA', role: 'professor', name: 'Tácio Macedo',      label: 'Professor responsável' },
  { username: 'tales.oliveira',    env: 'ADMIN_SENHA',     role: 'admin',     name: 'Tales Oliveira',    label: 'Administrador' },
  { username: 'eduardo.rodrigues', env: 'ALUNO_SENHA',     role: 'aluno',     name: 'Eduardo Rodrigues', label: 'Técnico em Enfermagem' },
];
let seedChanged = false;
for (const u of seedUsers) {
  const senha = process.env[u.env];
  const existing = state.users.find(x => x.username === u.username);
  if (!senha) {
    if (!existing) console.warn(`[db] ${u.env} não configurada: usuário ${u.username} não foi criado.`);
    continue;
  }
  if (existing) {
    if (!verifyPassword(senha, existing.password_hash)) {
      existing.password_hash = hashPassword(senha);
      seedChanged = true;
      console.log(`[db] Senha de ${u.username} atualizada a partir de ${u.env}.`);
    }
  } else {
    state.users.push({
      id: state.nextUserId++,
      username: u.username,
      password_hash: hashPassword(senha),
      role: u.role,
      name: u.name,
      label: u.label,
      created_at: new Date().toISOString(),
    });
    seedChanged = true;
    console.log(`[db] Usuário ${u.username} criado.`);
  }
}
if (seedChanged) save(state);

// ---- API do "banco" ----
module.exports = {
  findUserByUsername(username) {
    return state.users.find(u => u.username === username) || null;
  },

  listStudents() {
    return [...state.students].sort((a, b) => b.id - a.id);
  },

  findStudentByEmail(email) {
    return state.students.find(s => s.email.toLowerCase() === email.toLowerCase()) || null;
  },

  createStudentAndUser({ nome, email, senha, createdBy }) {
    const username = email.trim().toLowerCase();
    if (this.findStudentByEmail(email) || this.findUserByUsername(username)) {
      const err = new Error('Já existe um aluno cadastrado com esse e-mail.');
      err.code = 'DUPLICATE';
      throw err;
    }

    const student = {
      id: state.nextStudentId++,
      nome, email,
      created_by: createdBy,
      created_at: new Date().toISOString(),
    };
    state.students.push(student);

    state.users.push({
      id: state.nextUserId++,
      username,
      password_hash: hashPassword(senha),
      role: 'aluno',
      name: nome,
      label: 'Aluno',
      created_at: new Date().toISOString(),
    });

    save(state);
    return { student, username };
  },

  // ---- Atividades ----
  listActivities() {
    return [...state.activities].sort((a, b) => b.id - a.id);
  },

  createActivity({ titulo, disciplina, descricao, prazo, createdBy }) {
    const activity = {
      id: state.nextActivityId++,
      titulo, disciplina, descricao: descricao || '', prazo: prazo || '',
      created_by: createdBy,
      created_at: new Date().toISOString(),
    };
    state.activities.push(activity);
    save(state);
    return activity;
  },

  // ---- Notas ----
  listGrades() {
    return [...state.grades].sort((a, b) => b.id - a.id);
  },

  listGradesByMatricula(matricula) {
    return state.grades.filter(g => g.matricula === matricula).sort((a, b) => b.id - a.id);
  },

  upsertGrade({ matricula, disciplina, nota, frequencia, createdBy }) {
    const existing = state.grades.find(g => g.matricula === matricula && g.disciplina === disciplina);
    const notaNum = Number(nota);
    const freqNum = Number(frequencia);
    if (existing) {
      existing.nota = notaNum;
      existing.frequencia = freqNum;
      existing.updated_by = createdBy;
      existing.updated_at = new Date().toISOString();
      save(state);
      return existing;
    }
    const grade = {
      id: state.nextGradeId++,
      matricula, disciplina,
      nota: notaNum, frequencia: freqNum,
      created_by: createdBy,
      created_at: new Date().toISOString(),
    };
    state.grades.push(grade);
    save(state);
    return grade;
  },

  // ---- Videoaulas ----
  listVideos() {
    return [...state.videos].sort((a, b) => b.id - a.id);
  },

  createVideo({ titulo, disciplina, url, duracao, descricao, createdBy }) {
    const video = {
      id: state.nextVideoId++,
      titulo, disciplina, url,
      duracao: duracao || '', descricao: descricao || '',
      created_by: createdBy,
      created_at: new Date().toISOString(),
    };
    state.videos.push(video);
    save(state);
    return video;
  },

  // ---- Fórum ----
  listForumPosts() {
    return [...state.forumPosts].sort((a, b) => a.id - b.id); // ordem cronológica (mais antigo primeiro)
  },

  createForumPost({ username, name, role, message }) {
    const post = {
      id: state.nextForumId++,
      username, name, role,
      message,
      created_at: new Date().toISOString(),
    };
    state.forumPosts.push(post);
    save(state);
    return post;
  },
};
