/**
 * 隔热膜智能裁剪系统 - 前端应用脚本
 * 包含用户认证、项目管理和数据操作功能
 */

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

  // 加载项目列表
  async function loadProjectList() {
    if (!AppState.isLoggedIn) return;
    
    try {
      const response = await fetch(`${API_BASE}/api/projects`, {
        credentials: 'same-origin'
      });
      const data = await response.json();
      
      if (data.success) {
        console.log('加载到的项目数据:', data.projects);
        renderProjectList(data.projects);
      } else {
        showNotification(data.message || '加载项目列表失败', 'error');
      }
    } catch (error) {
      console.error('加载项目列表失败:', error);
      showNotification('网络错误，加载失败', 'error');
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

  // 渲染项目列表
  function renderProjectList(projects) {
    const listContainer = document.getElementById('projectListContainer');
    
    if (!projects || projects.length === 0) {
      listContainer.innerHTML = `
        <div class="text-center py-12 text-gray-500">
          <svg class="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
          </svg>
          <p class="text-lg">暂无保存的项目</p>
          <p class="text-sm mt-2">开始一个新项目并保存，即可在此处查看</p>
        </div>
      `;
      return;
    }
    
    listContainer.innerHTML = `
      <div class="grid gap-4">
        ${projects.map(project => {
          // 从保存的project_data中解析统计信息
          let stats = null;
          let projectData = null;
          try {
            if (project.project_data) {
              projectData = typeof project.project_data === 'string' 
                ? JSON.parse(project.project_data) 
                : project.project_data;
              stats = parseStatsFromProjectData(projectData);
            }
          } catch (e) {
            console.error('解析项目数据失败:', e);
          }
          
          // 优先从projectData.projectInfo.name获取项目名称
          let displayName = '';
          if (projectData && projectData.projectInfo && projectData.projectInfo.name) {
            // 从保存的数据中获取项目名称
            displayName = projectData.projectInfo.name;
          } else if (project.name) {
            // 使用数据库中的name字段
            displayName = project.name;
          }
          
          // 如果都没有，则显示"未命名项目"
          if (!displayName || !displayName.trim()) {
            displayName = '未命名项目';
          }
          
          // 生成统计信息HTML
          let statsHtml = '';
          if (stats && stats.hasData) {
            const productsText = stats.products.length > 0 ? stats.products.join('、') : '未指定';
            const filmAreaText = stats.filmArea > 0 ? stats.filmArea.toFixed(2) + 'm²' : '未计算';
            statsHtml = `
              <div class="mt-2 p-2 bg-gray-50 rounded-lg">
                <div class="flex flex-wrap gap-3 text-xs">
                  <span class="text-gray-600">
                    <span class="font-semibold">拟用产品：</span>${escapeHtml(productsText)}
                  </span>
                  <span class="text-gray-600">
                    <span class="font-semibold">玻璃面积：</span>${stats.glassArea.toFixed(2)}m²
                  </span>
                  <span class="text-gray-600">
                    <span class="font-semibold">膜材面积：</span>${filmAreaText}
                  </span>
                </div>
              </div>
            `;
          }
          
          return `
          <div class="bg-white border-2 border-gray-200 rounded-xl p-4 hover:border-red-300 transition cursor-pointer project-item" data-id="${project.id}">
            <div class="flex items-start justify-between">
              <div class="flex-1" onclick="openProject('${project.id}')">
                <h4 class="font-bold text-lg text-gray-800 mb-1">${escapeHtml(displayName)}</h4>
                ${project.description ? `<p class="text-sm text-gray-500 mb-2">${escapeHtml(project.description)}</p>` : ''}
                ${statsHtml}
                <div class="flex items-center gap-4 text-xs text-gray-400 mt-2">
                  <span>创建时间：${formatDate(project.created_at)}</span>
                  <span>更新时间：${formatDate(project.updated_at)}</span>
                </div>
              </div>
              <div class="flex items-center gap-2 ml-4">
                <button onclick="event.stopPropagation(); deleteProject('${project.id}')" 
                  class="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition" title="删除项目">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        `}).join('')}
      </div>
    `;
  }

  // 保存当前项目
  async function saveProject(name, description, isSaveAndNew = false) {
    if (!AppState.isLoggedIn) {
      showNotification('请先登录后再保存项目', 'warning');
      showAuthModal('login');
      return false;
    }
    
    const projectData = collectProjectData();
    
    // 调试：打印收集的数据
    console.log('收集的项目数据:', {
      name: name,
      description: description,
      glassesCount: projectData.glasses?.length || 0,
      hasOptimizationResult: !!projectData.optimizationResult
    });
    
    // 如果是保存并新建，清除当前项目ID以创建新项目
    const projectId = isSaveAndNew ? null : (AppState.currentProject?.id || null);
    
    try {
      const response = await fetch(`${API_BASE}/api/projects/save`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: projectId,
          name: name,
          description: description,
          data: projectData
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // 更新当前项目状态
        AppState.currentProject = {
          id: data.id,
          name: name,
          description: description
        };
        
        if (isSaveAndNew) {
          showNotification('项目保存成功！准备创建新项目...', 'success');
        } else {
          showNotification('项目保存成功！', 'success');
        }
        
        loadProjectList();
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

  // ==================== 模态框相关函数 ====================

  // 显示认证模态框
  function showAuthModal(tab = 'login') {
    const modal = document.getElementById('authModal');
    if (modal) {
      modal.classList.remove('hidden');
      
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
    }
  }

  // 显示历史记录模态框
  function showHistoryModal() {
    const modal = document.getElementById('historyModal');
    if (modal) {
      modal.classList.remove('hidden');
      loadProjectList();
    }
  }

  // 显示保存模态框
  function showSaveModal() {
    if (!AppState.isLoggedIn) {
      showNotification('请先登录后再保存项目', 'warning');
      showAuthModal('login');
      return;
    }
    
    const modal = document.getElementById('saveModal');
    if (modal) {
      modal.classList.remove('hidden');
      
      // 预填充项目名称 - 优先使用表单中的项目名称，然后是当前打开的项目名称
      const formProjectName = document.getElementById('projectName').value;
      const currentProjectName = AppState.currentProject?.name;
      
      if (formProjectName) {
        document.getElementById('saveProjectName').value = formProjectName;
      } else if (currentProjectName) {
        document.getElementById('saveProjectName').value = currentProjectName;
      } else {
        document.getElementById('saveProjectName').value = '';
      }
      
      // 预填充项目描述
      const currentDescription = AppState.currentProject?.description;
      document.getElementById('saveProjectDescription').value = currentDescription || '';
    }
  }

  // 关闭模态框
  function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('hidden');
    }
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
        // 优先使用表单中的项目名称，确保保存的项目名称正确
        const formProjectName = document.getElementById('projectName').value;
        const saveProjectName = document.getElementById('saveProjectName').value;
        
        // 如果弹窗中的名称为空或与表单不同，使用表单中的名称
        const name = (saveProjectName && saveProjectName.trim()) ? saveProjectName : formProjectName;
        const description = document.getElementById('saveProjectDescription').value;
        
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
        // 优先使用表单中的项目名称，确保保存的项目名称正确
        const formProjectName = document.getElementById('projectName').value;
        const saveProjectName = document.getElementById('saveProjectName').value;
        
        // 如果弹窗中的名称为空或与表单不同，使用表单中的名称
        const name = (saveProjectName && saveProjectName.trim()) ? saveProjectName : formProjectName;
        const description = document.getElementById('saveProjectDescription').value;
        
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
  
  window.AppAuth = {
    checkLoginStatus,
    showAuthModal,
    showHistoryModal,
    showSaveModal,
    logoutUser,
    saveProject,
    openProject,
    deleteProject
  };

})();
