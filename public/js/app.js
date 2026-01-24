/**
 * 隔热膜智能裁剪系统 - 前端应用脚本
 * 包含用户认证、项目管理和数据操作功能
 * 版本: 3.3.26 - 修复模态框关闭问题
 */

// 版本号和缓存破坏器 - 强制浏览器加载最新版本
const APP_VERSION = 'v=3.3.26_' + new Date().getTime();
console.log(`[应用版本] ${APP_VERSION}`);

(function() {
  'use strict';

  // 全局状态
  const AppState = {
    currentUser: null,
    currentProject: null,
    isLoggedIn: false,
    projectData: null
  };

  // API基础地址 - 部署时自动检测
  const API_BASE = '';  // 空字符串表示使用相对路径，API和页面同源

  // ==================== 认证相关函数 ====================

  // 检查登录状态
  async function checkLoginStatus() {
    try {
      const response = await fetch(`${API_BASE}/api/user/status`, {
        credentials: 'same-origin'
      });
      const data = await response.json();
      
      if (data.loggedIn) {
        AppState.currentUser = data.user;
        AppState.isLoggedIn = true;
        updateUIForLoggedInUser();
      } else {
        updateUIForLoggedOutUser();
      }
    } catch (error) {
      console.error('检查登录状态失败:', error);
      updateUIForLoggedOutUser();
    }
  }

  // 用户注册
  async function registerUser(username, password, email) {
    try {
      const response = await fetch(`${API_BASE}/api/user/register`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, email })
      });
      
      const data = await response.json();
      
      if (data.success) {
        AppState.currentUser = data.user;
        AppState.isLoggedIn = true;
        closeModal('authModal');
        showNotification('注册成功，欢迎使用隔热膜智能裁剪系统！', 'success');
        updateUIForLoggedInUser();
        loadProjectList();
      } else {
        showNotification(data.message || '注册失败', 'error');
      }
    } catch (error) {
      console.error('注册失败:', error);
      showNotification('网络错误，注册失败，请稍后重试', 'error');
    }
  }

  // 用户登录
  async function loginUser(username, password) {
    try {
      const response = await fetch(`${API_BASE}/api/user/login`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      const data = await response.json();
      
      if (data.success) {
        AppState.currentUser = data.user;
        AppState.isLoggedIn = true;
        closeModal('authModal');
        showNotification(`欢迎回来，${data.user.username}！`, 'success');
        updateUIForLoggedInUser();
        loadProjectList();
      } else {
        showNotification(data.message || '登录失败', 'error');
      }
    } catch (error) {
      console.error('登录失败:', error);
      showNotification('网络错误，登录失败，请稍后重试', 'error');
    }
  }

  // 用户登出
  async function logoutUser() {
    try {
      const response = await fetch(`${API_BASE}/api/user/logout`, {
        method: 'POST',
        credentials: 'same-origin'
      });
      
      const data = await response.json();
      
      if (data.success) {
        AppState.currentUser = null;
        AppState.isLoggedIn = false;
        AppState.currentProject = null;
        AppState.projectData = null;
        
        // 重置界面
        closeModal('historyModal');
        clearAll();
        
        showNotification('已安全退出', 'info');
        updateUIForLoggedOutUser();
      }
    } catch (error) {
      console.error('退出失败:', error);
      showNotification('退出失败，请稍后重试', 'error');
    }
  }

  // ==================== 项目管理相关函数 ====================

  // 加载项目列表（带超时处理）
  async function loadProjectList() {
    if (!AppState.isLoggedIn) return;
    
    // 获取列表容器
    const listContainer = document.getElementById('projectListContainer');
    if (listContainer) {
      listContainer.innerHTML = `
        <div class="p-4">
          <div class="relative mb-4">
            <input type="text" id="projectSearchInput" placeholder="搜索项目名或业主..." 
              class="w-full px-4 py-3 pl-10 border-2 border-gray-200 rounded-xl focus:border-primary-red focus:outline-none transition"
              value="">
            <svg class="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
          </div>
        </div>
        <div class="text-center py-12 text-gray-500">
          <div class="animate-spin inline-block w-8 h-8 border-4 border-primary-red border-t-transparent rounded-full mb-4"></div>
          <p class="text-lg">正在加载项目...</p>
          <p class="text-sm mt-2">首次加载较慢，请耐心等待<br>或点击顶部左侧红色区域的 X 关闭此弹窗</p>
        </div>
      `;
    }
    
    try {
      // 添加超时控制（海外服务器，延长到20秒）
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);
      
      const response = await fetch(`${API_BASE}/api/projects`, {
        credentials: 'same-origin',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      console.log('[loadProjectList] API响应原始数据:', response);
      const data = await response.json();
      console.log('[loadProjectList] API响应解析后:', data);
      
      if (data.success) {
        renderProjectList(data.projects);
      } else {
        // 显示错误状态
        if (listContainer) {
          listContainer.innerHTML = `
            <div class="p-4">
              <div class="relative mb-4">
                <input type="text" id="projectSearchInput" placeholder="搜索项目名或业主..." 
                  class="w-full px-4 py-3 pl-10 border-2 border-gray-200 rounded-xl focus:border-primary-red focus:outline-none transition"
                  value="">
                <svg class="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
              </div>
            </div>
            <div class="text-center py-12 text-gray-500">
              <svg class="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
              </svg>
              <p class="text-lg">加载失败</p>
              <p class="text-sm mt-2">海外服务器连接较慢，请稍后重试</p>
              <button onclick="retryLoadProjectList()" class="mt-4 px-4 py-2 bg-primary-red text-white rounded-lg">
                重新加载
              </button>
            </div>
          `;
          <!-- 绑定重试按钮事件 - retryLoadProjectList 已在全局定义 -->
        }
        showNotification(data.message || '加载项目列表失败', 'error');
      }
    } catch (error) {
      console.error('加载项目列表失败:', error);
      
      // 确保即使请求失败也关闭模态框
      const historyModal = document.getElementById('historyModal');
      if (historyModal) {
        historyModal.classList.add('hidden');
        historyModal.style.display = 'none';
      }
      
      // 显示错误状态
      if (listContainer) {
        let errorMsg = '网络错误，加载失败';
        if (error.name === 'AbortError') {
          errorMsg = '请求超时，请检查网络连接';
        }
        
        listContainer.innerHTML = `
          <div class="p-4">
            <div class="relative mb-4">
              <input type="text" id="projectSearchInput" placeholder="搜索项目名或业主..." 
                class="w-full px-4 py-3 pl-10 border-2 border-gray-200 rounded-xl focus:border-primary-red focus:outline-none transition"
                value="">
              <svg class="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
              </svg>
            </div>
          </div>
          <div class="text-center py-12 text-gray-500">
            <svg class="w-16 h-16 mx-auto mb-4 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
            </svg>
            <p class="text-lg">加载失败</p>
            <p class="text-sm mt-2">网络连接超时，请稍后重试</p>
            <button onclick="retryLoadProjectList()" class="mt-4 px-4 py-2 bg-primary-red text-white rounded-lg">
              重新加载
            </button>
          </div>
        `;
        // 绑定重试按钮事件
        window.retryLoadProjectList = loadProjectList;
      }
      
      showNotification(error.name === 'AbortError' ? '请求超时，请重试' : '网络错误，加载失败', 'error');
    }
  }

  // 从项目数据中解析统计信息
  function parseStatsFromProjectData(projectData) {
    const stats = {
      products: [],
      glassArea: 0,
      filmArea: 0,
      hasData: false
    };
    
    if (!projectData) return stats;
    
    const glasses = projectData.glasses || [];
    
    // 检查是否有玻璃数据
    if (glasses && glasses.length > 0) {
      stats.hasData = true;
      
      // 计算玻璃总面积
      stats.glassArea = glasses.reduce((sum, g) => {
        return sum + (g.width * g.height * g.quantity);
      }, 0);
      stats.glassArea = stats.glassArea / 1000000; // 转换为平方米
      
      // 收集所有使用的产品（过滤掉空值）
      const productsSet = new Set(glasses.map(g => g.product).filter(p => p));
      stats.products = Array.from(productsSet);
    }
    
    // 如果有优化结果，计算膜材面积
    const optimizationResult = projectData.optimizationResult;
    if (optimizationResult && optimizationResult.segments && optimizationResult.segments.length > 0) {
      const FILM_WIDTH = 1520; // 膜材宽度
      const totalLength = optimizationResult.segments.reduce((sum, seg) => sum + seg.length, 0);
      stats.filmArea = (FILM_WIDTH * totalLength) / 1000000; // 转换为平方米
      stats.hasData = true;
    }
    
    return stats;
  }

  // 防抖函数 - 防止搜索过于频繁触发
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func.apply(this, args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // 渲染项目列表
  function renderProjectList(projects, searchTerm = '') {
    const listContainer = document.getElementById('projectListContainer');
    if (!listContainer) return;
    
    console.log('[renderProjectList] 接收到的projects:', projects);
    console.log('[renderProjectList] 搜索关键词:', searchTerm);
    
    // 确保 projects 是数组
    let projectsArray = [];
    if (Array.isArray(projects)) {
      projectsArray = projects;
    } else if (projects && typeof projects === 'object') {
      projectsArray = Object.values(projects);
    }
    
    // 缓存项目数据供搜索使用
    window.cachedProjects = projectsArray;
    
    // 如果有搜索关键词，进行过滤
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      projectsArray = projectsArray.filter(project => {
        // 搜索项目名称或业主姓名
        try {
          if (project.project_data) {
            const data = typeof project.project_data === 'string' 
              ? JSON.parse(project.project_data) 
              : project.project_data;
            const name = data.projectInfo?.name || '';
            const owner = data.projectInfo?.owner || '';
            const address = data.projectInfo?.address || '';
            return name.toLowerCase().includes(searchLower) ||
                   owner.toLowerCase().includes(searchLower) ||
                   address.toLowerCase().includes(searchLower);
          }
          return (project.name || '').toLowerCase().includes(searchLower);
        } catch (e) {
          return (project.name || '').toLowerCase().includes(searchLower);
        }
      });
      console.log('[renderProjectList] 过滤后的项目数:', projectsArray.length);
    }
    
    // 空项目处理
    if (projectsArray.length === 0) {
      listContainer.innerHTML = `
        <div class="p-4">
          <div class="relative mb-4">
            <input type="text" id="projectSearchInput" placeholder="搜索项目名或业主..." 
              class="w-full px-4 py-3 pl-10 border-2 border-gray-200 rounded-xl focus:border-primary-red focus:outline-none transition"
              value="${escapeHtml(searchTerm)}">
            <svg class="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
          </div>
        </div>
        <div class="text-center py-12 text-gray-500">
          <svg class="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
          </svg>
          <p class="text-lg">${searchTerm ? '未找到匹配的项目' : '暂无保存的项目'}</p>
          <p class="text-sm mt-2">${searchTerm ? '请尝试其他关键词' : '开始一个新项目并保存，即可在此处查看'}</p>
        </div>
      `;
      
      // 绑定搜索框事件
      const searchInput = document.getElementById('projectSearchInput');
      if (searchInput) {
        searchInput.addEventListener('input', debounce(function() {
          const term = this.value.trim();
          console.log('[renderProjectList] 搜索输入:', term);
          renderProjectList(window.cachedProjects, term);
        }, 300));
      }
      return;
    }
    
    // 生成项目列表HTML（包含搜索框）
    listContainer.innerHTML = `
      <div class="p-4 pb-2">
        <div class="relative">
          <input type="text" id="projectSearchInput" placeholder="搜索项目名或业主..." 
            class="w-full px-4 py-3 pl-10 border-2 border-gray-200 rounded-xl focus:border-primary-red focus:outline-none transition"
            value="${escapeHtml(searchTerm)}">
          <svg class="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
          </svg>
        </div>
      </div>
      <div class="grid gap-4 px-4 pb-4">
        ${projectsArray.map((project, index) => {
          // 解析项目数据
          let stats = null;
          let projectData = null;
          let displayName = '未命名项目';
          let displayOwner = '';  // 业主姓名
          let displayDescription = '';
          let projectAddress = '';
          
          try {
            if (project.project_data) {
              projectData = typeof project.project_data === 'string' 
                ? JSON.parse(project.project_data) 
                : project.project_data;
              
              stats = parseStatsFromProjectData(projectData);
              
              // 获取项目名称
              if (projectData.projectInfo?.name && projectData.projectInfo.name.trim()) {
                displayName = projectData.projectInfo.name.trim();
              } else if (projectData.name) {
                displayName = projectData.name;
              } else if (project.name) {
                displayName = project.name;
              }
              
              // 获取业主姓名（新增）
              displayOwner = projectData.projectInfo?.owner || '';
              
              // 获取项目地址
              projectAddress = projectData.projectInfo?.address || '';
              
              // 项目描述显示项目名称
              displayDescription = displayName;
            }
          } catch (e) {
            console.error('解析项目数据失败:', e);
          }
          
          const cardHtml = `
          <div class="bg-white border-2 border-gray-200 rounded-xl p-4 hover:border-red-300 transition cursor-pointer project-item" data-id="${project.id}">
            <div class="flex items-start justify-between">
              <div class="flex-1" onclick="loadProject('${project.id}')">
                <h4 class="font-bold text-lg text-gray-800 mb-1">${escapeHtml(displayName)}</h4>
                ${displayOwner ? `<p class="text-sm text-gray-500 mb-1">👤 ${escapeHtml(displayOwner)}</p>` : ''}
                ${projectAddress ? `<p class="text-sm text-gray-500 mb-1">📍 ${escapeHtml(projectAddress)}</p>` : ''}
                ${displayDescription ? `<p class="text-sm text-gray-600 mb-2">📝 ${escapeHtml(displayDescription)}</p>` : ''}
                ${stats && stats.hasData ? `
                  <div class="mt-2 p-2 bg-gray-50 rounded-lg">
                    <div class="flex flex-wrap gap-3 text-xs">
                      <span class="text-gray-600">
                        <span class="font-semibold">拟用产品：</span>${escapeHtml(stats.products.join('、') || '未指定')}
                      </span>
                      <span class="text-gray-600">
                        <span class="font-semibold">玻璃面积：</span>${stats.glassArea.toFixed(2)}m²
                      </span>
                      <span class="text-gray-600">
                        <span class="font-semibold">膜材面积：</span>${stats.filmArea.toFixed(2)}m²
                      </span>
                    </div>
                  </div>
                ` : ''}
                <div class="flex items-center gap-4 text-xs text-gray-400 mt-2">
                  <span>更新时间：${formatDate(project.updated_at)}</span>
                </div>
              </div>
              <div class="flex items-center gap-2 ml-4">
                <button onclick="event.stopPropagation(); loadProject('${project.id}')" 
                  class="px-3 py-2 bg-primary-red text-white font-semibold rounded-lg hover:bg-primary-red-dark transition flex items-center gap-1" title="加载项目">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path>
                  </svg>
                  加载
                </button>
                <button onclick="event.stopPropagation(); deleteProject('${project.id}')" 
                  class="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition" title="删除项目">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                  </svg>
                </button>
              </div>
            </div>
          </div>
          `;
          return cardHtml;
        }).join('')}
      </div>
    `;
    
    // 绑定搜索框事件
    const searchInput = document.getElementById('projectSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', debounce(function() {
        const term = this.value.trim();
        console.log('[renderProjectList] 搜索输入:', term);
        renderProjectList(window.cachedProjects, term);
      }, 300));
    }
  }

  // 搜索过滤函数（供全局调用）
  window.filterProjectsBySearch = function(searchTerm) {
    if (window.cachedProjects) {
      renderProjectList(window.cachedProjects, searchTerm);
    }
  };

  // 保存当前项目
  async function saveProject(name, description, isSaveAndNew = false) {
    if (!AppState.isLoggedIn) {
      showNotification('请先登录后再保存项目', 'warning');
      showAuthModal('login');
      return false;
    }
    
    const projectData = collectProjectData();
    
    // 获取表单中的项目名称和业主姓名
    const formProjectName = document.getElementById('projectName')?.value || '';
    const formOwnerName = document.getElementById('ownerName')?.value || '';
    const formAddress = document.getElementById('projectAddress')?.value || '';
    
    // 使用"项目名称+业主姓名"作为唯一标识
    const uniqueKey = `${formProjectName.trim()}_${formOwnerName.trim()}`;
    
    console.log('========== 保存项目调试 ==========');
    console.log('1. 表单项目名称:', formProjectName);
    console.log('2. 表单业主姓名:', formOwnerName);
    console.log('3. 唯一标识(uniqueKey):', uniqueKey);
    console.log('4. 弹窗传入的name参数:', name);
    
    // 确保 projectData.projectInfo 包含正确的值
    if (!projectData.projectInfo) {
      projectData.projectInfo = {};
    }
    projectData.projectInfo.name = formProjectName.trim() || name;
    projectData.projectInfo.owner = formOwnerName.trim();
    projectData.projectInfo.address = formAddress;
    
    // 如果是保存并新建，或者没有当前项目ID，则先查询是否已存在相同项目
    let existingProjectId = null;
    
    if (!isSaveAndNew && AppState.currentProject?.id) {
      // 有当前项目ID，直接更新
      existingProjectId = AppState.currentProject.id;
    } else {
      // 需要检查是否存在相同项目名+业主的项目
      try {
        const listResponse = await fetch(`${API_BASE}/api/projects`, {
          credentials: 'same-origin'
        });
        const listData = await listResponse.json();
        
        if (listData.success && listData.projects) {
          // 查找匹配的项目
          const projects = Array.isArray(listData.projects) ? listData.projects : Object.values(listData.projects);
          const existingProject = projects.find(p => {
            if (!p.project_data) return false;
            try {
              const data = typeof p.project_data === 'string' ? JSON.parse(p.project_data) : p.project_data;
              const pName = data.projectInfo?.name?.trim() || '';
              const pOwner = data.projectInfo?.owner?.trim() || '';
              return `${pName}_${pOwner}` === uniqueKey;
            } catch (e) {
              return false;
            }
          });
          
          if (existingProject) {
            existingProjectId = existingProject.id;
            console.log('5. 找到已存在的项目，ID:', existingProjectId);
          }
        }
      } catch (e) {
        console.error('查询已存在项目失败:', e);
      }
    }
    
    const projectId = existingProjectId || null;
    
    console.log('6. 最终使用的projectId:', projectId);
    console.log('===================================');
    
    try {
      const response = await fetch(`${API_BASE}/api/projects/save`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: projectId,
          name: projectData.projectInfo.name,
          description: description,
          data: projectData
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // 更新当前项目状态
        AppState.currentProject = {
          id: data.id,
          name: projectData.projectInfo.name,
          description: description
        };
        
        if (isSaveAndNew) {
          showNotification('项目保存成功！准备创建新项目...', 'success');
        } else if (projectId) {
          showNotification('项目已更新！', 'success');
        } else {
          showNotification('项目保存成功！', 'success');
        }
        
        // 刷新项目列表（即使失败也要保证保存成功）
        try {
          await loadProjectList();
        } catch (e) {
          console.error('刷新项目列表失败（不影响保存）:', e);
        }
        
        return true;
      } else {
        showNotification(data.message || '保存失败', 'error');
        return false;
      }
    } catch (error) {
      console.error('保存项目失败:', error);
      showNotification('网络错误，保存失败', 'error');
      return false;
    }
  }

  // 加载项目（恢复项目数据到表单）
  function loadProject(projectId) {
    console.log('[loadProject] 开始加载项目:', projectId);
    
    // 先获取项目数据
    fetch(`${API_BASE}/api/projects/${projectId}`, {
      credentials: 'same-origin'
    })
    .then(response => response.json())
    .then(data => {
      if (data.success && data.project) {
        const project = data.project;
        const projectData = project.data || project.project_data;
        
        console.log('[loadProject] 获取到项目数据:', projectData);
        
        // 恢复表单数据
        if (projectData.projectInfo) {
          if (document.getElementById('projectName')) {
            document.getElementById('projectName').value = projectData.projectInfo.name || '';
          }
          if (document.getElementById('ownerName')) {
            document.getElementById('ownerName').value = projectData.projectInfo.owner || '';
          }
          if (document.getElementById('contactPhone')) {
            document.getElementById('contactPhone').value = projectData.projectInfo.phone || '';
          }
          if (document.getElementById('projectAddress')) {
            document.getElementById('projectAddress').value = projectData.projectInfo.address || '';
          }
        }
        
        // 恢复玻璃数据
        if (projectData.glasses) {
          window.glasses = projectData.glasses;
          if (typeof window.updateGlassList === 'function') {
            window.updateGlassList();
          }
        }
        
        // 恢复选定的方案
        if (projectData.selectedPlans) {
          window.selectedPlans = projectData.selectedPlans;
        }
        
        // 恢复优化结果
        if (projectData.optimizationResult) {
          window.optimizationResult = projectData.optimizationResult;
        }
        
        // 更新当前项目状态
        AppState.currentProject = {
          id: project.id,
          name: projectData.projectInfo?.name || project.name,
          description: projectData.projectInfo?.owner || ''
        };
        
        // 关闭历史记录弹窗
        closeModal('historyModal');
        
        showNotification('项目已加载到表单，可以继续编辑', 'success');
      } else {
        showNotification('加载项目失败', 'error');
      }
    })
    .catch(error => {
      console.error('加载项目失败:', error);
      showNotification('网络错误，加载失败', 'error');
    });
  }

  // 搜索项目
  function searchProjects(keyword) {
    const searchInput = document.getElementById('projectSearchInput');
    if (!searchInput) return;
    
    const searchTerm = searchInput.value.trim().toLowerCase();
    console.log('[searchProjects] 搜索关键词:', searchTerm);
    
    // 触发重新渲染，传递搜索关键词
    if (typeof window.filterProjectsBySearch === 'function') {
      window.filterProjectsBySearch(searchTerm);
    }
  }

  // 打开项目
  async function openProject(projectId) {
    try {
      const response = await fetch(`${API_BASE}/api/projects/${projectId}`, {
        credentials: 'same-origin'
      });
      const data = await response.json();
      
      if (data.success) {
        const project = data.project;
        
        // 恢复项目数据
        restoreProjectData(project.data);
        
        AppState.currentProject = {
          id: project.id,
          name: project.name,
          description: project.description
        };
        
        // 更新界面显示
        document.getElementById('projectName').value = project.data.projectInfo?.name || '';
        document.getElementById('ownerName').value = project.data.projectInfo?.owner || '';
        document.getElementById('contactPhone').value = project.data.projectInfo?.phone || '';
        document.getElementById('projectAddress').value = project.data.projectInfo?.address || '';
        
        closeModal('historyModal');
        showNotification(`已打开项目：${project.name}`, 'success');
        
        // 如果有优化结果，显示结果
        if (project.data.optimizationResult) {
          window.displayResults && window.displayResults(project.data.optimizationResult);
        }
        
      } else {
        showNotification(data.message || '打开项目失败', 'error');
      }
    } catch (error) {
      console.error('打开项目失败:', error);
      showNotification('网络错误，打开失败', 'error');
    }
  }

  // 删除项目
  async function deleteProject(projectId) {
    if (!confirm('确定要删除这个项目吗？此操作不可恢复。')) {
      return;
    }
    
    try {
      const response = await fetch(`${API_BASE}/api/projects/${projectId}`, {
        method: 'DELETE',
        credentials: 'same-origin'
      });
      
      const data = await response.json();
      
      if (data.success) {
        showNotification('项目已删除', 'success');
        loadProjectList();
      } else {
        showNotification(data.message || '删除失败', 'error');
      }
    } catch (error) {
      console.error('删除项目失败:', error);
      showNotification('网络错误，删除失败', 'error');
    }
  }

  // ==================== 数据收集与恢复函数 ====================

  // 收集当前项目数据
  function collectProjectData() {
    const data = {
      projectInfo: {
        name: document.getElementById('projectName').value,
        owner: document.getElementById('ownerName').value,
        phone: document.getElementById('contactPhone').value,
        address: document.getElementById('projectAddress').value
      },
      glasses: window.glasses || [],
      selectedPlans: window.selectedPlans || {},
      optimizationState: window.optimizationState || null
    };
    
    // 保存优化结果（用于历史记录显示统计信息）
    if (window.optimizationResult) {
      data.optimizationResult = window.optimizationResult;
    }
    
    return data;
  }

  // 恢复项目数据
  function restoreProjectData(data) {
    if (data.glasses) {
      window.glasses = data.glasses;
      window.updateGlassList && window.updateGlassList();
    }
    
    if (data.selectedPlans) {
      window.selectedPlans = data.selectedPlans;
    }
    
    if (data.optimizationState) {
      window.optimizationState = data.optimizationState;
    }
  }

  // ==================== UI更新函数 ====================

  // 更新已登录用户的UI
  function updateUIForLoggedInUser() {
    const userNav = document.getElementById('userNav');
    if (userNav) {
      // 隐藏未登录状态，显示已登录状态
      const authNavGuest = document.getElementById('authNavGuest');
      const authNavUser = document.getElementById('authNavUser');
      const userDisplayName = document.getElementById('userDisplayName');
      
      if (authNavGuest) authNavGuest.classList.add('hidden');
      if (authNavUser) authNavUser.classList.remove('hidden');
      if (userDisplayName && AppState.currentUser) {
        userDisplayName.textContent = AppState.currentUser.username;
      }
    }
  }

  // 更新未登录用户的UI
  function updateUIForLoggedOutUser() {
    const userNav = document.getElementById('userNav');
    if (userNav) {
      // 隐藏已登录状态，显示未登录状态
      const authNavGuest = document.getElementById('authNavGuest');
      const authNavUser = document.getElementById('authNavUser');
      
      if (authNavGuest) authNavGuest.classList.remove('hidden');
      if (authNavUser) authNavUser.classList.add('hidden');
    }
  }

  // ==================== 模态框初始化函数 ====================
  
  // 初始化所有模态框为隐藏状态
  function initAllModals() {
    const modalIds = ['authModal', 'historyModal', 'saveModal', 'importModal', 'planModal', 'planSelectionModal'];
    modalIds.forEach(id => {
      const modal = document.getElementById(id);
      if (modal) {
        // 确保模态框初始化时是隐藏的
        modal.classList.add('hidden');
        modal.style.display = 'none';
      }
    });
    console.log('[initAllModals] 所有模态框已初始化为隐藏状态');
  }
  
  // ==================== 模态框相关函数 ====================

  // 显示认证模态框
  function showAuthModal(tab = 'login') {
    console.log('[showAuthModal] 函数被调用, tab:', tab);
    
    // 首先确保其他模态框是关闭的
    closeAllModals();
    
    const modal = document.getElementById('authModal');
    if (modal) {
      modal.classList.remove('hidden');
      modal.style.display = 'flex'; // 确保使用flex布局
      console.log('[showAuthModal] authModal已显示');
      
      // 切换到指定标签
      const loginTab = document.getElementById('loginTab');
      const registerTab = document.getElementById('registerTab');
      const loginForm = document.getElementById('loginFormElement');
      const registerForm = document.getElementById('registerFormElement');
      
      // 确保所有元素都存在
      if (!loginTab || !registerTab || !loginForm || !registerForm) {
        console.error('认证模态框元素未找到');
        return;
      }
      
      if (tab === 'login') {
        loginTab.classList.add('border-b-2', 'border-primary-red', 'text-primary-red');
        registerTab.classList.remove('border-b-2', 'border-primary-red', 'text-primary-red');
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
      } else {
        registerTab.classList.add('border-b-2', 'border-primary-red', 'text-primary-red');
        loginTab.classList.remove('border-b-2', 'border-primary-red', 'text-primary-red');
        registerForm.classList.remove('hidden');
        loginForm.classList.add('hidden');
      }
    } else {
      console.error('[showAuthModal] 找不到authModal元素');
    }
  }

  // 显示历史记录模态框
  function showHistoryModal() {
    console.log('[showHistoryModal] 函数被调用');
    console.log('[showHistoryModal] 当前登录状态:', AppState.isLoggedIn);
    
    // 如果未登录，先显示登录界面
    if (!AppState.isLoggedIn) {
      showNotification('请先登录后再查看历史项目', 'warning');
      showAuthModal('login');
      return;
    }
    
    // 关闭其他所有模态框
    closeAllModals();
    
    // 确保historyModal可见
    const modal = document.getElementById('historyModal');
    if (modal) {
      modal.classList.remove('hidden');
      modal.style.display = 'flex'; // 确保使用flex布局
      console.log('[showHistoryModal] 已打开历史记录模态框');
      loadProjectList();
    } else {
      console.error('[showHistoryModal] 找不到historyModal元素');
    }
  }

  // 显示保存模态框
  function showSaveModal() {
    console.log('[showSaveModal] 函数被调用');
    console.log('[showSaveModal] 当前登录状态:', AppState.isLoggedIn);
    
    // 如果未登录，先显示登录界面
    if (!AppState.isLoggedIn) {
      showNotification('请先登录后再保存项目', 'warning');
      showAuthModal('login');
      return;
    }
    
    // 关闭其他所有模态框
    closeAllModals();
    
    const modal = document.getElementById('saveModal');
    if (modal) {
      modal.classList.remove('hidden');
      modal.style.display = 'flex'; // 确保使用flex布局
      console.log('[showSaveModal] 已打开保存项目模态框');
      
      // 获取表单元素
      const projectNameInput = document.getElementById('projectName');
      const saveProjectNameInput = document.getElementById('saveProjectName');
      const saveProjectDescriptionInput = document.getElementById('saveProjectDescription');
      
      console.log('[showSaveModal] 开始执行');
      console.log('  - projectNameInput:', projectNameInput ? '已找到' : '未找到');
      console.log('  - saveProjectNameInput:', saveProjectNameInput ? '已找到' : '未找到');
      
      if (!projectNameInput || !saveProjectNameInput) {
        console.error('[showSaveModal] 错误：找不到必要的表单元素');
        return;
      }
      
      // 关键修复：直接读取表单当前值并立即填入
      const formProjectName = projectNameInput.value || '';
      const formDescription = document.getElementById('ownerName')?.value || '';
      
      console.log('[showSaveModal] 表单原始值:');
      console.log('  - projectName:', formProjectName);
      console.log('  - ownerName:', formDescription);
      
      // 立即填入值（不依赖AppState.currentProject）
      saveProjectNameInput.value = formProjectName.trim();
      if (saveProjectDescriptionInput) {
        saveProjectDescriptionInput.value = formDescription;
      }
      
      console.log('[showSaveModal] 已填入弹窗:');
      console.log('  - saveProjectName:', saveProjectNameInput.value);
      console.log('  - saveProjectDescription:', saveProjectDescriptionInput?.value || '(未找到)');
    }
  }

  // 关闭模态框
  function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('hidden');
      modal.style.display = 'none'; // 确保完全隐藏
    }
  }

  // 关闭所有模态框（修复手机端弹窗重叠问题）
  function closeAllModals() {
    const modalIds = ['historyModal', 'saveModal', 'authModal', 'planSelectionModal', 'importModal', 'planModal'];
    modalIds.forEach(id => closeModal(id));
  }

  // 重试加载项目列表（供全局调用）
  function retryLoadProjectList() {
    loadProjectList();
  }

  // ==================== 工具函数 ====================

  // 显示通知消息
  function showNotification(message, type = 'info') {
    const container = document.getElementById('notificationContainer');
    if (!container) return;
    
    const notification = document.createElement('div');
    const bgColor = type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500';
    const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';
    
    notification.className = `${bgColor} text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 transform transition-all duration-300 translate-y-2 opacity-0`;
    notification.innerHTML = `
      <span class="text-xl font-bold">${icon}</span>
      <span>${escapeHtml(message)}</span>
    `;
    
    container.appendChild(notification);
    
    // 显示动画
    setTimeout(() => {
      notification.classList.remove('translate-y-2', 'opacity-0');
    }, 10);
    
    // 自动隐藏
    setTimeout(() => {
      notification.classList.add('translate-y-2', 'opacity-0');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  // HTML转义
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // 格式化日期（北京时区 UTC+8）
  function formatDate(dateString) {
    const date = new Date(dateString);
    // 转换为北京时间 (UTC+8)
    const beijingTime = new Date(date.getTime() + 8 * 60 * 60 * 1000);
    return beijingTime.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  }

  // ==================== 初始化 ====================

  // 页面加载完成后初始化
  document.addEventListener('DOMContentLoaded', function() {
    // 首先初始化所有模态框为隐藏状态
    initAllModals();
    
    // 检查登录状态
    checkLoginStatus();
    
    // 绑定认证表单事件
    bindAuthForms();
    
    // 绑定模态框关闭事件
    bindModalEvents();
  });

  // 绑定认证表单事件
  function bindAuthForms() {
    // 登录表单
    const loginForm = document.getElementById('loginFormElement');
    if (loginForm) {
      loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const username = document.getElementById('loginUsername').value;
        const password = document.getElementById('loginPassword').value;
        loginUser(username, password);
      });
    }
    
    // 注册表单
    const registerForm = document.getElementById('registerFormElement');
    if (registerForm) {
      registerForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const username = document.getElementById('registerUsername').value;
        const password = document.getElementById('registerPassword').value;
        // email字段为可选，如果没有则传递空字符串
        const email = '';
        registerUser(username, password, email);
      });
    }
    
    // 标签切换
    const loginTab = document.getElementById('loginTab');
    const registerTab = document.getElementById('registerTab');
    
    if (loginTab) {
      loginTab.addEventListener('click', () => showAuthModal('login'));
    }
    
    if (registerTab) {
      registerTab.addEventListener('click', () => showAuthModal('register'));
    }
  }

  // 绑定模态框事件
  function bindModalEvents() {
    // 认证模态框关闭按钮
    const authCloseBtn = document.getElementById('authModalClose');
    if (authCloseBtn) {
      authCloseBtn.addEventListener('click', () => closeModal('authModal'));
    }
    
    // 历史记录模态框关闭按钮
    const historyCloseBtn = document.getElementById('historyModalClose');
    if (historyCloseBtn) {
      historyCloseBtn.addEventListener('click', () => closeModal('historyModal'));
    }
    
    // 保存模态框关闭按钮
    const saveCloseBtn = document.getElementById('saveModalClose');
    if (saveCloseBtn) {
      saveCloseBtn.addEventListener('click', () => closeModal('saveModal'));
    }
    
    // 保存按钮（保存并关闭）
    const saveConfirmBtn = document.getElementById('saveConfirmBtn');
    if (saveConfirmBtn) {
      saveConfirmBtn.addEventListener('click', async () => {
        // 获取表单中的项目名称
        const formProjectName = document.getElementById('projectName').value;
        // 获取保存弹窗中的项目名称
        const saveProjectName = document.getElementById('saveProjectName').value;
        
        console.log('[saveConfirmBtn] 保存信息:');
        console.log('  - 表单projectName:', formProjectName);
        console.log('  - 弹窗saveProjectName:', saveProjectName);
        
        // 优先级逻辑：优先使用弹窗中的名称，如果弹窗名称为空，则使用表单中的名称
        let name = '';
        if (saveProjectName && saveProjectName.trim()) {
          name = saveProjectName.trim();
          console.log('  - 使用弹窗中的项目名称:', name);
        } else if (formProjectName && formProjectName.trim()) {
          name = formProjectName.trim();
          console.log('  - 弹窗名称为空，使用表单中的项目名称:', name);
        }
        
        const description = document.getElementById('saveProjectDescription').value;
        console.log('  - 项目描述:', description);
        
        if (!name || !name.trim()) {
          showNotification('请在"项目详情"中填写项目名称后保存', 'warning');
          return;
        }
        
        const success = await saveProject(name, description);
        if (success) {
          closeModal('saveModal');
        }
      });
    }
    
    // 保存并新建按钮
    const saveAndNewBtn = document.getElementById('saveAndNewBtn');
    if (saveAndNewBtn) {
      saveAndNewBtn.addEventListener('click', async () => {
        // 获取表单中的项目名称
        const formProjectName = document.getElementById('projectName').value;
        // 获取保存弹窗中的项目名称
        const saveProjectName = document.getElementById('saveProjectName').value;
        
        console.log('[saveAndNewBtn] 保存信息:');
        console.log('  - 表单projectName:', formProjectName);
        console.log('  - 弹窗saveProjectName:', saveProjectName);
        
        // 优先级逻辑：优先使用弹窗中的名称，如果弹窗名称为空，则使用表单中的名称
        let name = '';
        if (saveProjectName && saveProjectName.trim()) {
          name = saveProjectName.trim();
          console.log('  - 使用弹窗中的项目名称:', name);
        } else if (formProjectName && formProjectName.trim()) {
          name = formProjectName.trim();
          console.log('  - 弹窗名称为空，使用表单中的项目名称:', name);
        }
        
        const description = document.getElementById('saveProjectDescription').value;
        console.log('  - 项目描述:', description);
        
        if (!name || !name.trim()) {
          showNotification('请在"项目详情"中填写项目名称后保存', 'warning');
          return;
        }
        
        const success = await saveProject(name, description, true); // 传递true表示保存并新建
        if (success) {
          // 关闭保存弹窗
          closeModal('saveModal');
          
          // 重置当前项目状态，允许创建新项目
          AppState.currentProject = null;
          AppState.projectData = null;
          
          // 清空表单
          document.getElementById('projectName').value = '';
          document.getElementById('ownerName').value = '';
          document.getElementById('contactPhone').value = '';
          document.getElementById('projectAddress').value = '';
          
          // 清空玻璃列表和优化结果
          if (typeof clearAll === 'function') {
            clearAll();
          }
          
          // 如果有清空优化结果的函数，也调用一下
          if (typeof clearResults === 'function') {
            clearResults();
          }
          
          showNotification('已创建新项目，请继续添加数据', 'success');
        }
      });
    }
    
    // 点击模态框外部关闭
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', function(e) {
        if (e.target === this) {
          const modalId = this.getAttribute('data-modal');
          if (modalId) {
            closeModal(modalId);
          }
        }
      });
    });
  }

  // 暴露全局函数（供HTML onclick调用）
  window.openProject = openProject;
  window.saveProject = saveProject;
  window.deleteProject = deleteProject;
  window.loadProject = loadProject;
  window.closeAllModals = closeAllModals;
  window.retryLoadProjectList = retryLoadProjectList;
  
  // 暴露AppAuth对象（供其他脚本调用）
  window.AppAuth = {
    checkLoginStatus,
    showAuthModal,
    showHistoryModal,
    showSaveModal,
    logoutUser,
    saveProject,
    openProject,
    deleteProject,
    loadProject,
    closeAllModals,
    retryLoadProjectList,
    initAllModals  // 暴露初始化函数
  };

})();
