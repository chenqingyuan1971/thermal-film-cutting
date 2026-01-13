---
AIGC:
    ContentProducer: Minimax Agent AI
    ContentPropagator: Minimax Agent AI
    Label: AIGC
    ProduceID: "00000000000000000000000000000000"
    PropagateID: "00000000000000000000000000000000"
    ReservedCode1: 30450220564ab779222b3ce038ea38c45d97e1af60b9f0430b3ae2d1271372869b308094022100f2441936e66d6a1ceb1bb35a873e740abdf656703b5f857a33bd1016a42089dd
    ReservedCode2: 3044022057dcee498c442e2c56ddbf0deb4fdf021e0e86366165bdaab39c0cd087933b2e022056e3aa1d7df09f8a4a01bf1dbbd6d599779053c8154285667dc4a86cec0fe877
---

# 玻璃隔热膜智能裁切优化系统 V3.2

## 📌 重要说明

**当前状态**：这是一个完整的全栈应用，包含：
- ✅ 前端：HTML/CSS/JavaScript（可直接部署到静态托管）
- ✅ 后端：Node.js + Express（需要支持Node.js的服务器）

## 🚀 快速开始（选择一种方式）

### 方式一：本地运行（推荐用于测试）

```bash
# 1. 进入项目目录
cd 隔热膜智能裁剪系统

# 2. 安装依赖
npm install

# 3. 启动服务器
npm start

# 4. 打开浏览器访问
http://localhost:3000
```

### 方式二：部署到云端（Render.com - 免费）

1. **准备代码**
   - 将整个项目上传到 GitHub 仓库

2. **部署到 Render**
   - 访问 https://render.com
   - 创建新的 Web Service
   - 连接你的 GitHub 仓库
   - 设置：
     - Build Command: `npm install`
     - Start Command: `npm start`
     - Environment: `Node`

3. **配置环境变量**（可选）
   - PORT: 自动设置

4. **访问应用**
   - Render 会提供访问地址（如：https://your-app.onrender.com）

### 方式三：部署到 Railway（推荐）

1. **访问 https://railway.app**
2. **创建新项目**
   - 选择 "Deploy from GitHub repo"
   - 选择你的仓库

3. **自动部署**
   - Railway 会自动检测 Node.js 项目并部署

4. **访问应用**
   - Railway 会提供访问地址

### 方式四：部署到 Vercel（需要配置）

Vercel 主要用于静态站点，需要额外配置 API 路由。

推荐使用 Render 或 Railway，它们对 Node.js 支持更好。

## 📖 功能说明

### 1. 用户登录/注册系统
- ✅ 支持用户注册新账号
- ✅ 支持用户登录/退出
- ✅ 登录后可保存和查看历史项目

### 2. 项目保存功能
- ✅ 登录用户可以保存当前项目
- ✅ 自动记录项目名称、描述
- ✅ 保存所有玻璃数据、优化结果

### 3. 历史项目查看
- ✅ 登录后在"我的项目"中查看所有保存的项目
- ✅ 支持打开历史项目继续编辑
- ✅ 支持删除不需要的项目

## 📋 使用说明

1. **首次使用**
   - 点击右上角"**注册**"按钮创建账号
   - 填写用户名和密码（密码至少6位）

2. **登录**
   - 输入用户名和密码登录系统

3. **保存项目**
   - 输入项目信息（项目名称、业主、联系方式等）
   - 添加玻璃数据
   - 点击"**💾 保存项目**"按钮保存当前工作

4. **查看历史**
   - 登录后点击"**📁 历史记录**"查看历史记录
   - 点击项目可继续编辑

5. **继续编辑**
   - 从历史记录中打开项目
   - 继续添加玻璃或修改数据
   - 重新保存项目

## 🔧 核心功能

### 玻璃数据管理
- 添加/编辑/删除玻璃信息
- 支持批量导入Excel/CSV数据
- 提供示例数据快速测试

### 智能裁切优化
- 自动计算最优裁切方案
- 支持横向/纵向拼接
- 余料管理和复用
- 多方案对比选择

### 报告生成
- 导出PDF报告
- 打印功能
- 计算日志下载

## 📁 项目结构

```
隔热膜智能裁剪系统/
├── server.js           # 后端服务器
├── package.json        # 项目配置
├── public/             # 前端文件
│   ├── index.html      # 主页面
│   └── js/
│       └── app.js      # 认证模块
└── data/               # 数据库存储
    └── system.db       # SQLite数据库
```

## ⚠️ 常见问题

### Q: 认证功能不工作？
A: 确保后端服务器正在运行。认证功能需要服务器支持，单独的静态页面无法工作。

### Q: 如何修改端口？
A: 启动命令：`PORT=8080 npm start`

### Q: 数据库文件在哪？
A: 在 `data/system.db`，包含用户和项目数据

### Q: 如何备份数据？
A: 复制 `data/system.db` 文件即可

## 📞 技术支持

如有问题，请：
1. 检查服务器日志
2. 确认网络连接
3. 验证浏览器控制台错误信息

---

**系统版本**: V3.2  
**核心技术**: Node.js + Express + SQLite + 原生JavaScript
