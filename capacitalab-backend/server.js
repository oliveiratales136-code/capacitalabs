// server.js — servidor HTTP puro (nenhuma dependência externa: só módulos nativos do Node).
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const db = require('./db');
const { verifyPassword, createToken, verifyToken } = require('./auth');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function sendJSON(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let chunks = '';
    req.on('data', (c) => {
      chunks += c;
      if (chunks.length > 1e6) req.destroy(); // limite de 1MB, evita abuso
    });
    req.on('end', () => {
      if (!chunks) return resolve({});
      try {
        resolve(JSON.parse(chunks));
      } catch {
        reject(new Error('JSON inválido'));
      }
    });
    req.on('error', reject);
  });
}

function getAuthUser(req) {
  const header = req.headers['authorization'] || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return null;
  return verifyToken(token);
}

function serveStatic(req, res, pathname) {
  let filePath = pathname === '/' ? '/index.html' : pathname;
  filePath = path.normalize(filePath).replace(/^(\.\.[/\\])+/, ''); // evita path traversal
  const fullPath = path.join(PUBLIC_DIR, filePath);

  fs.readFile(fullPath, (err, data) => {
    if (err) {
      // Qualquer rota desconhecida cai no index.html (SPA simples)
      fs.readFile(path.join(PUBLIC_DIR, 'index.html'), (err2, indexData) => {
        if (err2) {
          res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
          return res.end('Não encontrado.');
        }
        res.writeHead(200, { 'Content-Type': MIME['.html'] });
        res.end(indexData);
      });
      return;
    }
    const ext = path.extname(fullPath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const { pathname } = url;

  try {
    // ---------- POST /api/login ----------
    if (pathname === '/api/login' && req.method === 'POST') {
      const { username, password } = await readBody(req);
      if (!username || !password) {
        return sendJSON(res, 400, { error: 'Informe usuário e senha.' });
      }
      const user = db.findUserByUsername(String(username).trim());
      if (!user || !verifyPassword(password, user.password_hash)) {
        return sendJSON(res, 401, { error: 'Usuário ou senha inválidos.' });
      }
      const token = createToken({ id: user.id, username: user.username, role: user.role, name: user.name, label: user.label });
      return sendJSON(res, 200, {
        token,
        user: { username: user.username, role: user.role, name: user.name, label: user.label },
      });
    }

    // ---------- GET /api/me ----------
    if (pathname === '/api/me' && req.method === 'GET') {
      const user = getAuthUser(req);
      if (!user) return sendJSON(res, 401, { error: 'Token inválido ou expirado.' });
      return sendJSON(res, 200, { user });
    }

    // ---------- GET /api/students ----------
    if (pathname === '/api/students' && req.method === 'GET') {
      const user = getAuthUser(req);
      if (!user) return sendJSON(res, 401, { error: 'Token ausente ou expirado.' });
      if (!['professor', 'admin'].includes(user.role)) {
        return sendJSON(res, 403, { error: 'Você não tem permissão para esta ação.' });
      }
      const rows = db.listStudents().map(({ id, nome, matricula, curso, email, created_at }) => ({ id, nome, matricula, curso, email, created_at }));
      return sendJSON(res, 200, { students: rows });
    }

    // ---------- POST /api/students ----------
    if (pathname === '/api/students' && req.method === 'POST') {
      const user = getAuthUser(req);
      if (!user) return sendJSON(res, 401, { error: 'Token ausente ou expirado.' });
      if (!['professor', 'admin'].includes(user.role)) {
        return sendJSON(res, 403, { error: 'Você não tem permissão para esta ação.' });
      }
      const { nome, matricula, curso, email, senha } = await readBody(req);
      if (!nome || !matricula || !curso || !email || !senha) {
        return sendJSON(res, 400, { error: 'Preencha todos os campos.' });
      }
      try {
        const { username } = db.createStudentAndUser({
          nome, matricula: String(matricula).trim(), curso, email, senha,
          createdBy: user.username,
        });
        return sendJSON(res, 201, { ok: true, login: { username, senha } });
      } catch (err) {
        if (err.code === 'DUPLICATE') return sendJSON(res, 409, { error: err.message });
        console.error(err);
        return sendJSON(res, 500, { error: 'Erro ao cadastrar aluno.' });
      }
    }

    // ---------- Atividades ----------

    if (pathname === '/api/activities' && req.method === 'GET') {
      const user = getAuthUser(req);
      if (!user) return sendJSON(res, 401, { error: 'Token ausente ou expirado.' });
      return sendJSON(res, 200, { activities: db.listActivities() });
    }

    if (pathname === '/api/activities' && req.method === 'POST') {
      const user = getAuthUser(req);
      if (!user) return sendJSON(res, 401, { error: 'Token ausente ou expirado.' });
      if (!['professor', 'admin'].includes(user.role)) {
        return sendJSON(res, 403, { error: 'Você não tem permissão para esta ação.' });
      }
      const { titulo, disciplina, descricao, prazo } = await readBody(req);
      if (!titulo || !disciplina) {
        return sendJSON(res, 400, { error: 'Preencha ao menos título e disciplina.' });
      }
      const activity = db.createActivity({ titulo, disciplina, descricao, prazo, createdBy: user.username });
      return sendJSON(res, 201, { activity });
    }

    // ---------- Notas ----------

    if (pathname === '/api/grades' && req.method === 'GET') {
      const user = getAuthUser(req);
      if (!user) return sendJSON(res, 401, { error: 'Token ausente ou expirado.' });
      if (!['professor', 'admin'].includes(user.role)) {
        return sendJSON(res, 403, { error: 'Você não tem permissão para esta ação.' });
      }
      const matricula = url.searchParams.get('matricula');
      const grades = matricula ? db.listGradesByMatricula(matricula) : db.listGrades();
      return sendJSON(res, 200, { grades });
    }

    if (pathname === '/api/grades' && req.method === 'POST') {
      const user = getAuthUser(req);
      if (!user) return sendJSON(res, 401, { error: 'Token ausente ou expirado.' });
      if (!['professor', 'admin'].includes(user.role)) {
        return sendJSON(res, 403, { error: 'Você não tem permissão para esta ação.' });
      }
      const { matricula, disciplina, nota, frequencia } = await readBody(req);
      if (!matricula || !disciplina || nota === undefined || nota === '') {
        return sendJSON(res, 400, { error: 'Selecione o aluno, a disciplina e a nota.' });
      }
      const notaNum = Number(nota);
      if (Number.isNaN(notaNum) || notaNum < 0 || notaNum > 10) {
        return sendJSON(res, 400, { error: 'A nota deve ser um número entre 0 e 10.' });
      }
      const grade = db.upsertGrade({ matricula, disciplina, nota: notaNum, frequencia: frequencia || 0, createdBy: user.username });
      return sendJSON(res, 201, { grade });
    }

    // ---------- Videoaulas ----------

    if (pathname === '/api/videos' && req.method === 'GET') {
      const user = getAuthUser(req);
      if (!user) return sendJSON(res, 401, { error: 'Token ausente ou expirado.' });
      return sendJSON(res, 200, { videos: db.listVideos() });
    }

    if (pathname === '/api/videos' && req.method === 'POST') {
      const user = getAuthUser(req);
      if (!user) return sendJSON(res, 401, { error: 'Token ausente ou expirado.' });
      if (!['professor', 'admin'].includes(user.role)) {
        return sendJSON(res, 403, { error: 'Você não tem permissão para esta ação.' });
      }
      const { titulo, disciplina, url, duracao, descricao } = await readBody(req);
      if (!titulo || !disciplina || !url) {
        return sendJSON(res, 400, { error: 'Preencha título, disciplina e o link do vídeo.' });
      }
      let parsedUrl;
      try { parsedUrl = new URL(url); } catch { parsedUrl = null; }
      if (!parsedUrl || !['http:', 'https:'].includes(parsedUrl.protocol)) {
        return sendJSON(res, 400, { error: 'Informe um link de vídeo válido (começando com http:// ou https://).' });
      }
      const video = db.createVideo({ titulo, disciplina, url, duracao, descricao, createdBy: user.username });
      return sendJSON(res, 201, { video });
    }

    // ---------- Fórum (aberto a aluno, professor e admin) ----------

    if (pathname === '/api/forum' && req.method === 'GET') {
      const user = getAuthUser(req);
      if (!user) return sendJSON(res, 401, { error: 'Token ausente ou expirado.' });
      return sendJSON(res, 200, { posts: db.listForumPosts() });
    }

    if (pathname === '/api/forum' && req.method === 'POST') {
      const user = getAuthUser(req);
      if (!user) return sendJSON(res, 401, { error: 'Token ausente ou expirado.' });
      const { message } = await readBody(req);
      if (!message || !String(message).trim()) {
        return sendJSON(res, 400, { error: 'Escreva uma mensagem antes de enviar.' });
      }
      const post = db.createForumPost({
        username: user.username, name: user.name, role: user.role,
        message: String(message).trim().slice(0, 2000),
      });
      return sendJSON(res, 201, { post });
    }

    // ---------- Arquivos estáticos (o site) ----------
    if (req.method === 'GET') {
      return serveStatic(req, res, pathname);
    }

    sendJSON(res, 404, { error: 'Rota não encontrada.' });
  } catch (err) {
    console.error(err);
    sendJSON(res, 500, { error: 'Erro interno do servidor.' });
  }
});

server.listen(PORT, () => {
  console.log(`CapacitaLab backend rodando em http://localhost:${PORT}`);
});
