// 全局变量
let currentUser = null;
let currentTab = 'groups';
let currentSigninType = 'noon';
let groups = [];
let members = [];
let signinRecords = [];

// 初始化应用
function initApp() {
    // 加载数据
    loadData();
    
    // 初始化事件监听
    initEventListeners();
    
    // 检查是否已登录
    checkLoginStatus();
}

// 加载本地存储数据
function loadData() {
    // 加载分组数据
    const groupsData = localStorage.getItem('volunteerGroups');
    groups = groupsData ? JSON.parse(groupsData) : [];
    
    // 加载成员数据
    const membersData = localStorage.getItem('volunteerMembers');
    members = membersData ? JSON.parse(membersData) : [];
    
    // 加载签到记录
    const signinData = localStorage.getItem('volunteerSigninRecords');
    signinRecords = signinData ? JSON.parse(signinData) : [];
    
    // 加载用户数据（简单密码验证）
    // 无论是否存在，都重置为新的用户名和密码
    localStorage.setItem('volunteerUser', JSON.stringify({
        username: 'index',
        password: 'index'
    }));
}

// 保存数据到本地存储
function saveData() {
    localStorage.setItem('volunteerGroups', JSON.stringify(groups));
    localStorage.setItem('volunteerMembers', JSON.stringify(members));
    localStorage.setItem('volunteerSigninRecords', JSON.stringify(signinRecords));
}

// 初始化事件监听
function initEventListeners() {
    // 导航标签切换
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.dataset.tab;
            switchTab(tabId);
        });
    });
    
    // 签到类型切换
    document.querySelectorAll('.signin-type-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const signinType = tab.dataset.signinType;
            switchSigninType(signinType);
        });
    });
    
    // 分组选择变化
    const signinGroupSelect = document.getElementById('signinGroupSelect');
    if (signinGroupSelect) {
        signinGroupSelect.addEventListener('change', () => {
            renderSigninTable();
        });
    }
    
    // 模态框关闭点击外部区域
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.classList.remove('active');
        }
    });
    
    // 回车键登录
    document.getElementById('username')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleLogin();
        }
    });
    
    document.getElementById('password')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleLogin();
        }
    });
}

// 检查登录状态
function checkLoginStatus() {
    const loginPage = document.getElementById('loginPage');
    const container = document.querySelector('.container');
    
    if (currentUser) {
        loginPage.style.display = 'none';
        container.style.display = 'block';
        renderPage();
    } else {
        loginPage.style.display = 'flex';
        container.style.display = 'none';
    }
}

// 处理登录
function handleLogin() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    
    if (!username || !password) {
        showMessage('请输入用户名和密码', 'error');
        return;
    }
    
    // 获取当前用户数据
    const userData = JSON.parse(localStorage.getItem('volunteerUser'));
    
    // 兼容旧用户名密码，自动更新为新的用户名密码
    if ((username === 'admin' && password === 'admin123') || (username === userData.username && password === userData.password)) {
        // 如果使用旧用户名密码登录，自动更新为新的用户名密码
        if (username === 'admin' && password === 'admin123') {
            localStorage.setItem('volunteerUser', JSON.stringify({
                username: 'index',
                password: 'index'
            }));
        }
        
        currentUser = {
            username: 'index',
            password: 'index'
        };
        showMessage('登录成功', 'success');
        checkLoginStatus();
    } else {
        showMessage('用户名或密码错误，请使用新的用户名密码：index/index', 'error');
    }
}

// 处理登出
function handleLogout() {
    currentUser = null;
    showMessage('已成功登出', 'success');
    checkLoginStatus();
}

// 修改密码
function changePassword() {
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    if (!currentPassword || !newPassword || !confirmPassword) {
        showMessage('请填写所有密码字段', 'error');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        showMessage('两次输入的新密码不一致', 'error');
        return;
    }
    
    const userData = JSON.parse(localStorage.getItem('volunteerUser'));
    
    if (currentPassword !== userData.password) {
        showMessage('当前密码错误', 'error');
        return;
    }
    
    userData.password = newPassword;
    localStorage.setItem('volunteerUser', JSON.stringify(userData));
    
    showMessage('密码修改成功', 'success');
    closeModal('changePasswordModal');
    
    // 清空表单
    document.getElementById('currentPassword').value = '';
    document.getElementById('newPassword').value = '';
    document.getElementById('confirmPassword').value = '';
}

// 切换标签页
function switchTab(tabId) {
    // 更新导航标签状态
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
    
    // 更新内容区域
    document.querySelectorAll('.tab-panel').forEach(panel => {
        panel.classList.remove('active');
    });
    document.getElementById(tabId).classList.add('active');
    
    currentTab = tabId;
    renderPage();
}

// 切换签到类型
function switchSigninType(signinType) {
    // 更新签到类型标签状态
    document.querySelectorAll('.signin-type-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`[data-signin-type="${signinType}"]`).classList.add('active');
    
    currentSigninType = signinType;
    
    if (currentTab === 'signin') {
        renderSigninTable();
    }
}

// 渲染当前页面
function renderPage() {
    switch (currentTab) {
        case 'groups':
            renderGroups();
            break;
        case 'import':
            renderImportPage();
            break;
        case 'signin':
            renderSigninPage();
            break;
        case 'summary':
            renderSummaryPage();
            break;
    }
}

// 渲染分组管理页面
function renderGroups() {
    const groupsGrid = document.getElementById('groupsGrid');
    
    if (groups.length === 0) {
        groupsGrid.innerHTML = '<p style="text-align: center; color: var(--text-light); padding: 40px;">暂无分组，请创建第一个分组</p>';
        return;
    }
    
    groupsGrid.innerHTML = groups.map(group => {
        const groupMembers = members.filter(member => member.groupName === group.name);
        return `
            <div class="group-card">
                <h3><i class="fas fa-layer-group"></i> ${group.name}</h3>
                <p class="group-description">${group.description || '无描述'}</p>
                <p class="group-members">成员数量：${groupMembers.length} 人</p>
                <div class="group-card-actions">
                    <button class="btn btn-primary" onclick="editGroup('${group.id}')">
                        <i class="fas fa-edit"></i> 编辑
                    </button>
                    <button class="btn btn-danger" onclick="deleteGroup('${group.id}')">
                        <i class="fas fa-trash"></i> 删除
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// 渲染成员导入页面
function renderImportPage() {
    // 更新添加成员模态框中的分组选择
    const groupSelect = document.getElementById('addMemberGroupName');
    groupSelect.innerHTML = '<option value="">请选择分组</option>' + 
        groups.map(group => `<option value="${group.name}">${group.name}</option>`).join('');
}

// 渲染签到管理页面
function renderSigninPage() {
    // 更新分组选择
    const groupSelect = document.getElementById('signinGroupSelect');
    groupSelect.innerHTML = '<option value="">全部分组</option>' + 
        groups.map(group => `<option value="${group.name}">${group.name}</option>`).join('');
    
    // 渲染签到表格
    renderSigninTable();
    
    // 初始化自动刷新机制（每小时检查一次，防止日期变化）
    if (!window.signinAutoRefreshInterval) {
        window.signinAutoRefreshInterval = setInterval(() => {
            // 重新渲染签到表格，确保日期是最新的
            renderSigninTable();
        }, 3600000); // 每小时刷新一次
    }
}

// 刷新签到页面
function refreshSigninPage() {
    renderSigninTable();
    showMessage('签到页面已刷新', 'success');
}

// 渲染签到表格
function renderSigninTable() {
    const tableBody = document.getElementById('signinTableBody');
    const selectedGroup = document.getElementById('signinGroupSelect').value;
    
    let filteredMembers = members;
    if (selectedGroup) {
        filteredMembers = members.filter(member => member.groupName === selectedGroup);
    }
    
    if (filteredMembers.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-light); padding: 40px;">暂无成员数据</td></tr>';
        return;
    }
    
    const today = new Date().toISOString().split('T')[0];
    
    tableBody.innerHTML = filteredMembers.map((member, index) => {
        const record = getSigninRecord(member.id, today, currentSigninType);
        
        // 定义状态显示文本和样式
        const statusConfig = {
            'signed': {
                text: '已签到',
                class: 'completed'
            },
            'absence': {
                text: '旷课',
                class: 'absence'
            },
            'leave': {
                text: '请假',
                class: 'leave'
            },
            'pending': {
                text: '未签到',
                class: 'pending'
            }
        };
        
        const currentStatus = record?.status || 'pending';
        const statusInfo = statusConfig[currentStatus];
        
        return `
            <tr>
                <td>${index + 1}</td>
                <td>${member.name}</td>
                <td>${member.studentId || '-'}</td>
                <td>${member.className || '-'}</td>
                <td>
                    <span class="signin-status ${statusInfo.class}">
                        ${statusInfo.text}
                    </span>
                </td>
                <td>${record?.signinTime || '-'}</td>
                <td>
                    ${record ? 
                        `<button class="btn btn-secondary" onclick="cancelSignin('${member.id}', '${today}', '${currentSigninType}')">
                            <i class="fas fa-times"></i> 取消记录
                        </button>` : 
                        `<div style="display: flex; gap: 5px;">
                            <button class="btn btn-success" onclick="signIn('${member.id}', '${today}', '${currentSigninType}')">
                                <i class="fas fa-check"></i> 签到
                            </button>
                            <button class="btn btn-danger" onclick="recordAbsence('${member.id}', '${today}', '${currentSigninType}')">
                                <i class="fas fa-times"></i> 旷课
                            </button>
                            <button class="btn btn-warning" onclick="recordLeave('${member.id}', '${today}', '${currentSigninType}')">
                                <i class="fas fa-exclamation-triangle"></i> 请假
                            </button>
                        </div>`
                    }
                </td>
            </tr>
        `;
    }).join('');
}

// 渲染统计页面
function renderSummaryPage() {
    // 更新分组选择
    const groupSelect = document.getElementById('summaryGroupSelect');
    groupSelect.innerHTML = '<option value="">全部分组</option>' + 
        groups.map(group => `<option value="${group.name}">${group.name}</option>`).join('');
    
    // 设置默认日期范围（最近7天）
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    document.getElementById('startDate').value = startDate;
    document.getElementById('endDate').value = endDate;
}

// 创建分组
function createGroup() {
    const groupName = document.getElementById('groupName').value.trim();
    const groupDescription = document.getElementById('groupDescription').value.trim();
    
    if (!groupName) {
        showMessage('请输入分组名称', 'error');
        return;
    }
    
    if (groups.some(group => group.name === groupName)) {
        showMessage('该分组名称已存在', 'error');
        return;
    }
    
    const newGroup = {
        id: Date.now().toString(),
        name: groupName,
        description: groupDescription,
        createdAt: new Date().toISOString()
    };
    
    groups.push(newGroup);
    saveData();
    
    showMessage('分组创建成功', 'success');
    closeModal('createGroupModal');
    
    // 清空表单
    document.getElementById('groupName').value = '';
    document.getElementById('groupDescription').value = '';
    
    // 重新渲染页面
    if (currentTab === 'groups') {
        renderGroups();
    }
}

// 编辑分组
function editGroup(groupId) {
    const group = groups.find(g => g.id === groupId);
    if (!group) return;
    
    document.getElementById('editGroupId').value = group.id;
    document.getElementById('editGroupName').value = group.name;
    document.getElementById('editGroupDescription').value = group.description;
    
    openModal('editGroupModal');
}

// 更新分组
function updateGroup() {
    const groupId = document.getElementById('editGroupId').value;
    const groupName = document.getElementById('editGroupName').value.trim();
    const groupDescription = document.getElementById('editGroupDescription').value.trim();
    
    if (!groupName) {
        showMessage('请输入分组名称', 'error');
        return;
    }
    
    const existingGroup = groups.find(g => g.name === groupName && g.id !== groupId);
    if (existingGroup) {
        showMessage('该分组名称已存在', 'error');
        return;
    }
    
    const groupIndex = groups.findIndex(g => g.id === groupId);
    if (groupIndex === -1) return;
    
    groups[groupIndex] = {
        ...groups[groupIndex],
        name: groupName,
        description: groupDescription
    };
    
    // 更新成员中的分组名称
    members = members.map(member => {
        if (member.groupName === groups[groupIndex].name) {
            return {
                ...member,
                groupName: groupName
            };
        }
        return member;
    });
    
    saveData();
    
    showMessage('分组更新成功', 'success');
    closeModal('editGroupModal');
    
    // 重新渲染页面
    renderPage();
}

// 删除分组
function deleteGroup(groupId) {
    if (confirm('确定要删除该分组吗？该分组下的所有成员将被移除分组！')) {
        const group = groups.find(g => g.id === groupId);
        if (group) {
            // 更新成员分组
            members = members.map(member => {
                if (member.groupName === group.name) {
                    return {
                        ...member,
                        groupName: ''
                    };
                }
                return member;
            });
            
            // 删除分组
            groups = groups.filter(g => g.id !== groupId);
            saveData();
            
            showMessage('分组删除成功', 'success');
            renderPage();
        }
    }
}

// 添加单个成员
function addSingleMember() {
    const groupName = document.getElementById('addMemberGroupName').value;
    const name = document.getElementById('addMemberName').value.trim();
    const studentId = document.getElementById('addMemberStudentId').value.trim();
    const gender = document.getElementById('addMemberGender').value;
    const className = document.getElementById('addMemberClass').value.trim();
    
    if (!groupName || !name) {
        showMessage('请选择分组并输入姓名', 'error');
        return;
    }
    
    // 检查学号是否重复
    if (studentId && members.some(member => member.studentId === studentId)) {
        showMessage('该学号已存在', 'error');
        return;
    }
    
    const newMember = {
        id: Date.now().toString(),
        groupName: groupName,
        name: name,
        studentId: studentId,
        gender: gender,
        className: className,
        createdAt: new Date().toISOString()
    };
    
    members.push(newMember);
    saveData();
    
    showMessage('成员添加成功', 'success');
    closeModal('addMemberModal');
    
    // 清空表单
    document.getElementById('addMemberGroupName').value = '';
    document.getElementById('addMemberName').value = '';
    document.getElementById('addMemberStudentId').value = '';
    document.getElementById('addMemberGender').value = '';
    document.getElementById('addMemberClass').value = '';
}

// 导入成员
function importMembers() {
    const fileInput = document.getElementById('importFile');
    const file = fileInput.files[0];
    
    if (!file) {
        showMessage('请选择要导入的文件', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);
            
            // 处理导入的数据
            processImportedData(jsonData);
            
        } catch (error) {
            showMessage('文件解析失败，请检查文件格式', 'error');
            console.error('Import error:', error);
        }
    };
    reader.readAsArrayBuffer(file);
}

// 处理导入的数据
function processImportedData(jsonData) {
    let importedCount = 0;
    let existingCount = 0;
    
    jsonData.forEach(item => {
        // 提取必要字段
        const groupName = item['分组'] || item['group'] || '';
        const name = item['姓名'] || item['name'] || '';
        const studentId = item['学号'] || item['studentId'] || '';
        const gender = item['性别'] || item['gender'] || '';
        const className = item['班级'] || item['class'] || '';
        
        if (!name) return;
        
        // 检查成员是否已存在
        const existingMember = members.find(member => 
            member.studentId && studentId && member.studentId === studentId
        );
        
        if (existingMember) {
            existingCount++;
            return;
        }
        
        // 检查分组是否存在，不存在则创建
        if (groupName && !groups.some(group => group.name === groupName)) {
            groups.push({
                id: Date.now().toString(),
                name: groupName,
                description: '',
                createdAt: new Date().toISOString()
            });
        }
        
        // 添加新成员
        const newMember = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            groupName: groupName,
            name: name,
            studentId: studentId,
            gender: gender,
            className: className,
            createdAt: new Date().toISOString()
        };
        
        members.push(newMember);
        importedCount++;
    });
    
    saveData();
    showMessage(`成功导入 ${importedCount} 名成员，${existingCount} 名成员已存在`, 'success');
    renderPage();
}

// 下载模板
function downloadTemplate() {
    const templateData = [
        { '分组': '示例分组1', '姓名': '张三', '学号': '2023001', '性别': '男', '班级': '高三1班' },
        { '分组': '示例分组2', '姓名': '李四', '学号': '2023002', '性别': '女', '班级': '高三2班' }
    ];
    
    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '成员列表');
    XLSX.writeFile(workbook, '成员导入模板.xlsx');
    
    showMessage('模板下载成功', 'success');
}

// 获取签到记录
function getSigninRecord(memberId, date, signinType) {
    return signinRecords.find(record => 
        record.memberId === memberId && 
        record.date === date && 
        record.signinType === signinType
    );
}

// 单个签到
function signIn(memberId, date, signinType) {
    // 添加签到记录
    addSigninRecord(memberId, date, signinType, 'signed');
}

// 记录旷课
function recordAbsence(memberId, date, signinType) {
    // 添加旷课记录
    addSigninRecord(memberId, date, signinType, 'absence');
}

// 记录请假
function recordLeave(memberId, date, signinType) {
    // 添加请假记录
    addSigninRecord(memberId, date, signinType, 'leave');
}

// 添加签到记录
function addSigninRecord(memberId, date, signinType, status) {
    // 检查是否已有记录
    const existingRecord = getSigninRecord(memberId, date, signinType);
    if (existingRecord) {
        showMessage('该成员今日该时段已有记录', 'warning');
        return;
    }
    
    const statusText = {
        'signed': '签到',
        'absence': '旷课',
        'leave': '请假'
    };
    
    // 添加签到记录
    const newRecord = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        memberId: memberId,
        date: date,
        signinType: signinType,
        status: status,
        signinTime: status === 'signed' ? new Date().toLocaleTimeString('zh-CN', { hour12: false }) : '-',
        timestamp: Date.now()
    };
    
    signinRecords.push(newRecord);
    saveData();
    
    showMessage(`${statusText[status]}记录成功`, 'success');
    renderSigninTable();
}

// 取消签到/旷课/请假记录
function cancelSignin(memberId, date, signinType) {
    if (confirm('确定要取消该成员的记录吗？')) {
        signinRecords = signinRecords.filter(record => 
            !(record.memberId === memberId && record.date === date && record.signinType === signinType)
        );
        saveData();
        showMessage('记录已取消', 'success');
        renderSigninTable();
    }
}

// 全部签到
function signInAll() {
    const selectedGroup = document.getElementById('signinGroupSelect').value;
    const today = new Date().toISOString().split('T')[0];
    
    let filteredMembers = members;
    if (selectedGroup) {
        filteredMembers = members.filter(member => member.groupName === selectedGroup);
    }
    
    if (filteredMembers.length === 0) {
        showMessage('暂无成员可签到', 'warning');
        return;
    }
    
    let signinCount = 0;
    let existingCount = 0;
    
    filteredMembers.forEach(member => {
        const existingRecord = getSigninRecord(member.id, today, currentSigninType);
        if (!existingRecord) {
            // 使用addSigninRecord函数确保记录结构一致
            addSigninRecord(member.id, today, currentSigninType, 'signed');
            signinCount++;
        } else {
            existingCount++;
        }
    });
    
    showMessage(`成功签到 ${signinCount} 人，${existingCount} 人已有记录`, 'success');
    renderSigninTable();
}

// 生成统计
function generateSummary() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    const selectedGroup = document.getElementById('summaryGroupSelect').value;
    
    if (!startDate || !endDate) {
        showMessage('请选择开始日期和结束日期', 'error');
        return;
    }
    
    if (new Date(startDate) > new Date(endDate)) {
        showMessage('开始日期不能晚于结束日期', 'error');
        return;
    }
    
    // 筛选成员
    let filteredMembers = members;
    if (selectedGroup) {
        filteredMembers = members.filter(member => member.groupName === selectedGroup);
    }
    
    // 筛选签到记录
    const filteredRecords = signinRecords.filter(record => {
        const recordDate = new Date(record.date);
        return recordDate >= new Date(startDate) && recordDate <= new Date(endDate);
    });
    
    // 计算统计数据
    const stats = calculateStats(filteredMembers, filteredRecords);
    
    // 渲染统计结果
    renderSummaryStats(stats);
    renderSummaryTable(filteredMembers, filteredRecords, startDate, endDate);
    
    // 显示导出按钮
    document.getElementById('summaryExport').style.display = 'block';
}

// 计算统计数据
function calculateStats(members, records) {
    // 过滤出已签到的记录
    const signedRecords = records.filter(r => r.status === 'signed' || !r.status);
    
    // 总签到次数
    const totalSignins = signedRecords.length;
    
    // 总成员数
    const totalMembers = members.length;
    
    // 平均签到次数
    const avgSignins = totalMembers > 0 ? (totalSignins / totalMembers).toFixed(1) : 0;
    
    // 各时间段签到次数
    const noonSignins = signedRecords.filter(r => r.signinType === 'noon').length;
    const afternoonSignins = signedRecords.filter(r => r.signinType === 'afternoon').length;
    const eveningSignins = signedRecords.filter(r => r.signinType === 'evening').length;
    
    return {
        totalMembers,
        totalSignins,
        avgSignins,
        noonSignins,
        afternoonSignins,
        eveningSignins
    };
}

// 渲染统计数据
function renderSummaryStats(stats) {
    const statsContainer = document.getElementById('summaryStats');
    statsContainer.innerHTML = `
        <div class="stat-card">
            <div class="stat-value">${stats.totalMembers}</div>
            <div class="stat-label">总成员数</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${stats.totalSignins}</div>
            <div class="stat-label">总签到次数</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${stats.avgSignins}</div>
            <div class="stat-label">平均签到次数</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${stats.noonSignins}</div>
            <div class="stat-label">中午签到次数</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${stats.afternoonSignins}</div>
            <div class="stat-label">下午签到次数</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${stats.eveningSignins}</div>
            <div class="stat-label">晚上签到次数</div>
        </div>
    `;
}

// 渲染统计表格
function renderSummaryTable(members, records, startDate, endDate) {
    const tableContainer = document.getElementById('summaryTableContainer');
    
    if (members.length === 0) {
        tableContainer.innerHTML = '<p style="text-align: center; color: var(--text-light); padding: 40px;">暂无成员数据</p>';
        return;
    }
    
    // 计算每个成员的课时（只计算签到，不计算请假和旷课）
    const membersStats = members.map((member, index) => {
        // 统计该成员的签到记录数量（只计算signed状态）
        const memberRecords = records.filter(record => 
            record.memberId === member.id && record.status === 'signed'
        );
        
        return {
            index: index + 1,
            className: member.className || '',
            name: member.name,
            hours: memberRecords.length // 每次签到加一课时
        };
    });
    
    // 构建表格HTML，与导出表格保持一致（只显示班级、姓名、课时）
    let tableHTML = `
        <table class="signin-table">
            <thead>
                <tr>
                    <th>序号</th>
                    <th>班级</th>
                    <th>姓名</th>
                    <th>课时</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    // 添加成员行
    membersStats.forEach(stat => {
        tableHTML += `
            <tr>
                <td>${stat.index}</td>
                <td>${stat.className}</td>
                <td>${stat.name}</td>
                <td>${stat.hours}</td>
            </tr>
        `;
    });
    
    tableHTML += `
            </tbody>
        </table>
    `;
    
    tableContainer.innerHTML = tableHTML;
}

// 导出统计表格
function exportSummary() {
    // 获取当前的筛选条件
    const selectedGroup = document.getElementById('summaryGroupSelect').value;
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    
    if (!startDate || !endDate) {
        showMessage('请选择开始日期和结束日期', 'warning');
        return;
    }
    
    // 过滤成员和记录
    let filteredMembers = members;
    if (selectedGroup) {
        filteredMembers = members.filter(member => member.groupName === selectedGroup);
    }
    
    const filteredRecords = signinRecords.filter(record => 
        record.date >= startDate && 
        record.date <= endDate
    );
    
    // 计算每个成员的课时（只计算签到，不计算请假和旷课）
    const membersStats = filteredMembers.map((member, index) => {
        // 统计该成员的签到记录数量（只计算signed状态）
        const memberRecords = filteredRecords.filter(record => 
            record.memberId === member.id && record.status === 'signed'
        );
        
        return {
            index: index + 1,
            className: member.className || '',
            name: member.name,
            hours: memberRecords.length // 每次签到加一课时
        };
    });
    
    // 确保SheetJS库已加载
    if (typeof XLSX === 'undefined') {
        showMessage('导出库未加载，请刷新页面重试', 'error');
        return;
    }
    
    // 准备导出数据，与页面表格保持一致（包含序号、班级、姓名、课时）
    const exportData = [
        ['序号', '班级', '姓名', '课时'] // 表头
    ];
    
    // 添加数据行
    membersStats.forEach(stat => {
        exportData.push([stat.index, stat.className, stat.name, stat.hours]);
    });
    
    // 创建工作簿和工作表
    const ws = XLSX.utils.aoa_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '课时统计');
    
    // 格式化文件名：几月几号到几月几号的课时统计
    const formatDateRange = (dateStr) => {
        const date = new Date(dateStr);
        return `${date.getMonth() + 1}月${date.getDate()}日`;
    };
    
    const fileName = `${formatDateRange(startDate)}到${formatDateRange(endDate)}的课时统计.xlsx`;
    
    // 导出文件
    XLSX.writeFile(wb, fileName);
    
    showMessage('课时统计表格导出成功', 'success');
}

// 获取日期范围数组
function getDateRange(startDate, endDate) {
    const dates = [];
    const currentDate = new Date(startDate);
    const end = new Date(endDate);
    
    while (currentDate <= end) {
        dates.push(currentDate.toISOString().split('T')[0]);
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return dates;
}

// 格式化日期
function formatDate(dateString) {
    const date = new Date(dateString);
    return `${date.getMonth() + 1}/${date.getDate()}`;
}

// 模态框操作
function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

function openCreateGroupModal() {
    openModal('createGroupModal');
}

// 切换密码可见性
function togglePassword() {
    const passwordInput = document.getElementById('password');
    const icon = document.querySelector('.toggle-password i');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        passwordInput.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

// 显示消息通知
function showMessage(message, type = 'success') {
    const messageElement = document.getElementById('message');
    messageElement.textContent = message;
    messageElement.className = `message ${type} show`;
    
    setTimeout(() => {
        messageElement.classList.remove('show');
    }, 3000);
}





// 页面加载完成后初始化
window.addEventListener('DOMContentLoaded', initApp);