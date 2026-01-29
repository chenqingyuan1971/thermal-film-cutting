const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const { MongoClient, ObjectId } = require('mongodb');
const MongoStore = require('connect-mongo');

console.log(`[${new Date().toISOString()}] Loading modules...`);

const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB Atlas 连接配置
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'insulation_cutting_system';

let db;
let usersCollection;
let projectsCollection;

// 初始化 MongoDB 连接
async function initializeDatabase() {
  try {
    console.log(`[${new Date().toISOString()}] Initializing MongoDB connection...`);
    const client = new MongoClient(MONGODB_URI);
    
    await client.connect();
    console.log(`[${new Date().toISOString()}] Connected to MongoDB successfully`);
    
    db = client.db(DB_NAME);
    usersCollection = db.collection('users');
    projectsCollection = db.collection('projects');
    
    // 创建索引
    await usersCollection.createIndex({ username: 1 }, { unique: true });
    await projectsCollection.createIndex({ user_id: 1 });
    
    console.log(`[${new Date().toISOString()}] Database indexes created successfully`);
    return true;
  } catch (dbError) {
    console.error(`[${new Date().toISOString()}] MongoDB connection failed:`, dbError.message);
    return false;
  }
}

// 同步等待数据库初始化完成
let dbInitialized = false;
initializeDatabase().then(success => {
  dbInitialized = success;
  if (!success) {
    console.error(`[${new Date().toISOString()}] Failed to initialize database, server may not function correctly`);
  }
});

// 中间件配置
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Session配置 - 针对生产环境优化（Render.com）
// 注意：secret 必须保持固定，否则服务器重启后所有用户会话都会失效！
// 使用 MongoDB 存储会话数据，即使服务器重启也不会丢失会话
app.use(session({
  secret: '隔热膜智能裁剪系统_v3.3_固定安全密钥_2026',  // 固定密钥，会话持久化
  resave: false,
  saveUninitialized: false,
  name: 'sessionId',  // 设置cookie名称
  cookie: {
    secure: false,           // Render.com使用HTTP，设为false
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7天延长会话有效期
    sameSite: 'lax',         // 允许跨站请求时发送cookie
    path: '/'                // 设置cookie路径为根路径
  },
  store: MongoStore.create({
    mongoUrl: MONGODB_URI,
    dbName: DB_NAME,
    collectionName: 'sessions',  // 将会话存储在 sessions 集合中
    ttl: 7 * 24 * 60 * 60,       // 7天过期（秒）
    autoRemove: 'interval',
    autoRemoveInterval: 60       // 每60分钟清理过期会话
  })
}));

// 辅助函数：确保数据库已连接
function ensureDbConnection() {
  if (!dbInitialized || !usersCollection || !projectsCollection) {
    throw new Error('数据库连接未就绪');
  }
}

// 路由：检查登录状态
app.get('/api/user/status', async (req, res) => {
  try {
    ensureDbConnection();
    
    if (req.session.userId) {
      const user = await usersCollection.findOne(
        { _id: new ObjectId(req.session.userId) },
        { projection: { password: 0 } }
      );
      
      if (user) {
        // 将 _id 转换为 id
        const userObj = {
          id: user._id.toString(),
          username: user.username,
          email: user.email,
          created_at: user.created_at
        };
        return res.json({ loggedIn: true, user: userObj });
      }
    }
    res.json({ loggedIn: false });
  } catch (error) {
    console.error('检查登录状态错误:', error);
    res.json({ loggedIn: false });
  }
});

// 路由：用户注册
app.post('/api/user/register', async (req, res) => {
  try {
    ensureDbConnection();
    
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
    const existingUser = await usersCollection.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ success: false, message: '用户名已存在' });
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = new ObjectId();
    const now = new Date();

    // 创建用户
    await usersCollection.insertOne({
      _id: userId,
      username,
      password: hashedPassword,
      email: email || null,
      created_at: now,
      last_login: null
    });

    // 设置session
    req.session.userId = userId.toString();
    req.session.username = username;

    res.json({ 
      success: true, 
      message: '注册成功',
      user: { id: userId.toString(), username, email }
    });

  } catch (error) {
    console.error('注册错误:', error);
    res.status(500).json({ success: false, message: '服务器错误，注册失败' });
  }
});

// 路由：用户登录
app.post('/api/user/login', async (req, res) => {
  try {
    ensureDbConnection();
    
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: '用户名和密码不能为空' });
    }

    // 查找用户
    const user = await usersCollection.findOne({ username });
    if (!user) {
      return res.status(401).json({ success: false, message: '用户名或密码错误' });
    }

    // 验证密码
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ success: false, message: '用户名或密码错误' });
    }

    // 更新最后登录时间
    await usersCollection.updateOne(
      { _id: user._id },
      { $set: { last_login: new Date() } }
    );

    // 设置session
    req.session.userId = user._id.toString();
    req.session.username = user.username;

    res.json({ 
      success: true, 
      message: '登录成功',
      user: { id: user._id.toString(), username: user.username, email: user.email }
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
app.get('/api/projects', async (req, res) => {
  try {
    ensureDbConnection();
    
    console.log('[API] GET /api/projects - Session:', req.session.userId);
    
    if (!req.session.userId) {
      console.log('[API] 用户未登录，返回401');
      return res.status(401).json({ success: false, message: '请先登录' });
    }

    console.log('[API] 查询用户项目，userId:', req.session.userId);
    
    const projects = await projectsCollection.find({
      user_id: req.session.userId
    }).sort({ updated_at: -1 }).toArray();
    
    // 转换数据格式
    const formattedProjects = projects.map(p => ({
      id: p._id.toString(),
      name: p.name,
      description: p.description,
      project_data: p.project_data,
      created_at: p.created_at,
      updated_at: p.updated_at
    }));
    
    console.log('[API] 查询到项目数量:', formattedProjects.length);
    res.json({ success: true, projects: formattedProjects });
  } catch (error) {
    console.error('获取项目列表错误:', error);
    res.status(500).json({ success: false, message: '获取项目列表失败: ' + error.message });
  }
});

// 路由：保存项目
app.post('/api/projects/save', async (req, res) => {
  try {
    ensureDbConnection();
    
    if (!req.session.userId) {
      return res.status(401).json({ success: false, message: '请先登录' });
    }

    const { name, description, data } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: '项目名称不能为空' });
    }

    const projectId = req.body.id || new ObjectId().toString();
    const projectData = JSON.stringify(data);
    const now = new Date();

    // 检查项目是否存在
    let existingProject = null;
    try {
      existingProject = await projectsCollection.findOne({
        _id: new ObjectId(projectId),
        user_id: req.session.userId
      });
    } catch (e) {
      // 如果 projectId 格式不正确，视为新项目
      existingProject = null;
    }

    if (existingProject) {
      // 更新现有项目
      await projectsCollection.updateOne(
        { _id: new ObjectId(projectId), user_id: req.session.userId },
        { 
          $set: {
            name,
            description: description || '',
            project_data: projectData,
            updated_at: now
          }
        }
      );
    } else {
      // 创建新项目
      await projectsCollection.insertOne({
        _id: new ObjectId(projectId),
        user_id: req.session.userId,
        name,
        description: description || '',
        project_data: projectData,
        created_at: now,
        updated_at: now
      });
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
app.get('/api/projects/:id', async (req, res) => {
  try {
    ensureDbConnection();
    
    if (!req.session.userId) {
      return res.status(401).json({ success: false, message: '请先登录' });
    }

    const projectId = req.params.id;
    let project = null;
    
    try {
      project = await projectsCollection.findOne({
        _id: new ObjectId(projectId),
        user_id: req.session.userId
      });
    } catch (e) {
      return res.status(404).json({ success: false, message: '项目不存在' });
    }

    if (!project) {
      return res.status(404).json({ success: false, message: '项目不存在' });
    }

    res.json({ 
      success: true, 
      project: {
        id: project._id.toString(),
        name: project.name,
        description: project.description,
        project_data: JSON.parse(project.project_data),
        created_at: project.created_at,
        updated_at: project.updated_at,
        user_id: project.user_id
      }
    });
  } catch (error) {
    console.error('获取项目错误:', error);
    res.status(500).json({ success: false, message: '获取项目失败' });
  }
});

// 路由：删除项目
app.delete('/api/projects/:id', async (req, res) => {
  try {
    ensureDbConnection();
    
    if (!req.session.userId) {
      return res.status(401).json({ success: false, message: '请先登录' });
    }

    const projectId = req.params.id;
    let result = null;
    
    try {
      result = await projectsCollection.deleteOne({
        _id: new ObjectId(projectId),
        user_id: req.session.userId
      });
    } catch (e) {
      return res.status(404).json({ success: false, message: '项目不存在或无权限删除' });
    }

    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: '项目不存在或无权限删除' });
    }

    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    console.error('删除项目错误:', error);
    res.status(500).json({ success: false, message: '删除失败' });
  }
});

// 添加默认路由 - 将所有路径指向 index.html（支持前端路由）
// 这个路由必须在API路由之后，确保所有非API请求都返回index.html
app.get('*', (req, res) => {
  console.log('[路由] 捕获请求:', req.path);
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 启动服务器
const HOST = '0.0.0.0';
app.listen(PORT, HOST, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║     隔热膜智能裁剪优化系统 V3.3 服务器已启动               ║
║     访问地址: http://localhost:${PORT}                        ║
║     管理员邮箱: admin@example.com                           ║
║     数据库: MongoDB Atlas                                  ║
╚═══════════════════════════════════════════════════════════╝
  `);
  console.log(`[${new Date().toISOString()}] Server started on port ${PORT}`);
  console.log(`[${new Date().toISOString()}] MongoDB URI: ${MONGODB_URI}`);
  console.log(`[${new Date().toISOString()}] Database name: ${DB_NAME}`);
});
