const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

console.log(`[${new Date().toISOString()}] Loading modules...`);

const app = express();
const PORT = process.env.PORT || 3000;

// 初始化数据库（添加错误处理）
let db;
try {
  console.log(`[${new Date().toISOString()}] Initializing database...`);
  const Database = require('better-sqlite3');
  db = new Database(path.join(__dirname, 'data', 'system.db'));
  console.log(`[${new Date().toISOString()}] Database initialized successfully`);
} catch (dbError) {
  console.error(`[${new Date().toISOString()}] Database initialization failed:`, dbError.message);
  // 如果数据库初始化失败，使用内存数据库作为后备
  console.log(`[${new Date().toISOString()}] Falling back to memory database`);
  const Database = require('better-sqlite3');
  db = new Database(':memory:');
}

// 创建数据库表
try {
  console.log(`[${new Date().toISOString()}] Creating tables...`);
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      email TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login DATETIME
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      project_data TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
  `);
  console.log(`[${new Date().toISOString()}] Tables created successfully`);
} catch (tableError) {
  console.error(`[${new Date().toISOString()}] Table creation failed:`, tableError.message);
}

// 中间件配置
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Session配置 - 针对生产环境优化
app.use(session({
  secret: '隔热膜智能裁剪系统_v3.2_安全密钥_' + Date.now(),
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,           // Render.com使用HTTP，设为false
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24小时
    sameSite: 'lax',         // 关键：允许跨站请求时发送cookie
    path: '/'                // 关键：设置cookie路径为根路径
  }
}));

// 路由：检查登录状态
app.get('/api/user/status', (req, res) => {
  if (req.session.userId) {
    const user = db.prepare('SELECT id, username, email, created_at FROM users WHERE id = ?').get(req.session.userId);
    if (user) {
      return res.json({ loggedIn: true, user });
    }
  }
  res.json({ loggedIn: false });
});

// 路由：用户注册
app.post('/api/user/register', async (req, res) => {
  try {
    const { username, password, email } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: '用户名和密码不能为空' });
    }

    if (username.length < 3 || username.length > 20) {
      return res.status(400).json({ success: false, message: '用户名长度必须在3-20个字符之间' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: '密码长度不能少于6个字符' });
    }

    // 检查用户名是否已存在
    const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existingUser) {
      return res.status(400).json({ success: false, message: '用户名已存在' });
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = uuidv4();

    // 创建用户
    db.prepare('INSERT INTO users (id, username, password, email) VALUES (?, ?, ?, ?)').run(
      userId, username, hashedPassword, email || null
    );

    // 设置session
    req.session.userId = userId;
    req.session.username = username;

    res.json({ 
      success: true, 
      message: '注册成功',
      user: { id: userId, username, email }
    });

  } catch (error) {
    console.error('注册错误:', error);
    res.status(500).json({ success: false, message: '服务器错误，注册失败' });
  }
});

// 路由：用户登录
app.post('/api/user/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: '用户名和密码不能为空' });
    }

    // 查找用户
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!user) {
      return res.status(401).json({ success: false, message: '用户名或密码错误' });
    }

    // 验证密码
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ success: false, message: '用户名或密码错误' });
    }

    // 更新最后登录时间
    db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);

    // 设置session
    req.session.userId = user.id;
    req.session.username = user.username;

    res.json({ 
      success: true, 
      message: '登录成功',
      user: { id: user.id, username: user.username, email: user.email }
    });

  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({ success: false, message: '服务器错误，登录失败' });
  }
});

// 路由：用户登出
app.post('/api/user/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ success: false, message: '退出失败' });
    }
    res.json({ success: true, message: '退出成功' });
  });
});

// 路由：获取项目列表
app.get('/api/projects', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ success: false, message: '请先登录' });
  }

  try {
    const projects = db.prepare(`
      SELECT id, name, description, created_at, updated_at 
      FROM projects 
      WHERE user_id = ?
      ORDER BY updated_at DESC
    `).all(req.session.userId);

    res.json({ success: true, projects });
  } catch (error) {
    console.error('获取项目列表错误:', error);
    res.status(500).json({ success: false, message: '获取项目列表失败' });
  }
});

// 路由：保存项目
app.post('/api/projects/save', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ success: false, message: '请先登录' });
  }

  try {
    const { name, description, data } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: '项目名称不能为空' });
    }

    const projectId = req.body.id || uuidv4();
    const projectData = JSON.stringify(data);

    // 检查项目是否存在
    const existingProject = db.prepare('SELECT id FROM projects WHERE id = ? AND user_id = ?').get(
      projectId, req.session.userId
    );

    if (existingProject) {
      // 更新现有项目
      db.prepare(`
        UPDATE projects 
        SET name = ?, description = ?, project_data = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND user_id = ?
      `).run(name, description || '', projectData, projectId, req.session.userId);
    } else {
      // 创建新项目
      db.prepare(`
        INSERT INTO projects (id, user_id, name, description, project_data)
        VALUES (?, ?, ?, ?, ?)
      `).run(projectId, req.session.userId, name, description || '', projectData);
    }

    res.json({ 
      success: true, 
      message: '保存成功',
      id: projectId
    });

  } catch (error) {
    console.error('保存项目错误:', error);
    res.status(500).json({ success: false, message: '保存失败' });
  }
});

// 路由：获取单个项目
app.get('/api/projects/:id', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ success: false, message: '请先登录' });
  }

  try {
    const project = db.prepare(`
      SELECT * FROM projects WHERE id = ? AND user_id = ?
    `).get(req.params.id, req.session.userId);

    if (!project) {
      return res.status(404).json({ success: false, message: '项目不存在' });
    }

    res.json({ 
      success: true, 
      project: {
        ...project,
        data: JSON.parse(project.project_data)
      }
    });
  } catch (error) {
    console.error('获取项目错误:', error);
    res.status(500).json({ success: false, message: '获取项目失败' });
  }
});

// 路由：删除项目
app.delete('/api/projects/:id', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ success: false, message: '请先登录' });
  }

  try {
    const result = db.prepare('DELETE FROM projects WHERE id = ? AND user_id = ?').run(
      req.params.id, req.session.userId
    );

    if (result.changes === 0) {
      return res.status(404).json({ success: false, message: '项目不存在或无权限删除' });
    }

    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    console.error('删除项目错误:', error);
    res.status(500).json({ success: false, message: '删除失败' });
  }
});

// 添加默认路由 - 将所有路径指向 index.html（支持前端路由）
app.get('*', (req, res, next) => {
  // 如果请求的是 API 路由，跳过
  if (req.path.startsWith('/api/')) {
    return next();
  }
  
  // 如果请求的是静态文件（CSS、JS、图片等），跳过
  const ext = path.extname(req.path);
  if (ext && ext !== '.html') {
    return next();
  }
  
  // 其他所有路径都返回 index.html
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 启动服务器
const HOST = '0.0.0.0';
app.listen(PORT, HOST, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║     隔热膜智能裁剪优化系统 V3.2 服务器已启动               ║
║     访问地址: http://localhost:${PORT}                        ║
║     管理员邮箱: admin@example.com                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
  console.log(`[${new Date().toISOString()}] Server started on port ${PORT}`);
});
