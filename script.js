// 全局变量
let currentUser = null;
let leanCloudUserId = null;
let currentTab = 'groups';
let currentSigninType = 'morning';
let groups = [];
let members = [];
let signinRecords = [];

// 1. 初始化LeanCloud
AV.init({
  appId: "NEc3ywaj6xCcfCjJcwe9LNYI-gzGzoHsz",
  appKey: "GQx2LdCtkHwNjrMWJe7EELtB",
  serverURL: "https://e1-api.leancloud.cn"
});

// 初始化应用
async function initApp() {
    // 加载本地数据
    loadData();
    
    // 初始化事件监听
    initEventListeners();
    
    // 检查是否已登录
    checkLoginStatus();
    
    // 第二步：匿名登录获取LeanCloud用户ID
    leanCloudUserId = await userLogin();
    if (leanCloudUserId) {
        console.log("LeanCloud登录成功，用户唯一ID：", leanCloudUserId);
        // 第三步：开启跨设备实时同步
        syncUserOperations(leanCloudUserId);
    }
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
    const userData = localStorage.getItem('volunteerUser');
    if (!userData) {
        // 默认管理员账号
        localStorage.setItem('volunteerUser', JSON.stringify({
            username: 'admin',
            password: 'admin123'
        }));
    }
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
    
    // 监听操作按钮点击
    const operationBtn = document.getElementById('my-operation-btn');
    if (operationBtn) {
        operationBtn.addEventListener('click', () => {
            // 记录操作到LeanCloud
            if (leanCloudUserId) {
                uploadUserOperation(leanCloudUserId, "点击了测试操作按钮（可自定义描述）");
                showMessage('操作已记录', 'success');
            } else {
                showMessage('LeanCloud未登录，无法记录操作', 'warning');
            }
        });
    }
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
    
    const userData = JSON.parse(localStorage.getItem('volunteerUser'));
    
    if (username === userData.username && password === userData.password) {
        currentUser = userData;
        showMessage('登录成功', 'success');
        checkLoginStatus();
    } else {
        showMessage('用户名或密码错误', 'error');
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
    const morningSignins = signedRecords.filter(r => r.signinType === 'morning').length;
    const afternoonSignins = signedRecords.filter(r => r.signinType === 'afternoon').length;
    const eveningSignins = signedRecords.filter(r => r.signinType === 'evening').length;
    
    return {
        totalMembers,
        totalSignins,
        avgSignins,
        morningSignins,
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
            <div class="stat-value">${stats.morningSignins}</div>
            <div class="stat-label">上午签到次数</div>
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
    
    // 生成日期范围数组
    const dateRange = getDateRange(startDate, endDate);
    
    // 构建表格HTML
    let tableHTML = `
        <table class="signin-table">
            <thead>
                <tr>
                    <th>序号</th>
                    <th>姓名</th>
                    <th>学号</th>
                    <th>班级</th>
                    <th>分组</th>
    `;
    
    // 添加日期列
    dateRange.forEach(date => {
        tableHTML += `<th colspan="3">${formatDate(date)}</th>`;
    });
    
    tableHTML += `
                    <th>总签到次数</th>
                </tr>
                <tr>
                    <th></th>
                    <th></th>
                    <th></th>
                    <th></th>
                    <th></th>
    `;
    
    // 添加时间段子列
    dateRange.forEach(() => {
        tableHTML += `
                    <th>上午</th>
                    <th>下午</th>
                    <th>晚上</th>
        `;
    });
    
    tableHTML += `
                    <th></th>
                </tr>
            </thead>
            <tbody>
    `;
    
    // 添加成员行
    members.forEach((member, index) => {
        let totalSignins = 0;
        
        tableHTML += `
            <tr>
                <td>${index + 1}</td>
                <td>${member.name}</td>
                <td>${member.studentId || '-'}</td>
                <td>${member.className || '-'}</td>
                <td>${member.groupName || '-'}</td>
        `;
        
        // 填充每日签到状态
            dateRange.forEach(date => {
                const morningRecord = records.find(r => 
                    r.memberId === member.id && r.date === date && r.signinType === 'morning'
                );
                const afternoonRecord = records.find(r => 
                    r.memberId === member.id && r.date === date && r.signinType === 'afternoon'
                );
                const eveningRecord = records.find(r => 
                    r.memberId === member.id && r.date === date && r.signinType === 'evening'
                );
                
                // 统计总签到次数，只计算已签到状态
                if (morningRecord && (morningRecord.status === 'signed' || !morningRecord.status)) totalSignins++;
                if (afternoonRecord && (afternoonRecord.status === 'signed' || !afternoonRecord.status)) totalSignins++;
                if (eveningRecord && (eveningRecord.status === 'signed' || !eveningRecord.status)) totalSignins++;
                
                // 确定每个时段的显示图标
                const getStatusIcon = (record) => {
                    if (!record) return '-';
                    switch (record.status) {
                        case 'signed':
                            return '<i class="fas fa-check" style="color: var(--success-color);"></i>';
                        case 'absence':
                            return '<i class="fas fa-times" style="color: var(--danger-color);"></i>';
                        case 'leave':
                            return '<i class="fas fa-exclamation-triangle" style="color: var(--warning-color);"></i>';
                        default:
                            return '-';
                    }
                };
                
                tableHTML += `
                    <td>${getStatusIcon(morningRecord)}</td>
                    <td>${getStatusIcon(afternoonRecord)}</td>
                    <td>${getStatusIcon(eveningRecord)}</td>
                `;
            });
        
        tableHTML += `
                <td>${totalSignins}</td>
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
    // 这里简化处理，实际项目中可以使用SheetJS库导出更复杂的表格
    showMessage('导出功能开发中...', 'warning');
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

// 2. 匿名登录：获取唯一用户ID
async function userLogin() {
  try {
    const user = await AV.User.loginAnonymously();
    const userId = user.id;
    console.log("登录成功，用户唯一ID：", userId);
    return userId;
  } catch (error) {
    console.error("登录失败：", error);
    // 不显示alert，避免影响用户体验
    return null;
  }
}

// 3. 上传操作记录到数据库
async function uploadUserOperation(userId, operationContent) {
  if (!userId) return;
  
  try {
    // 序列化数据为JSON字符串
    const dataToUpload = {
      groups: groups,
      members: members,
      signinRecords: signinRecords,
      operation: operationContent,
      timestamp: new Date().toISOString()
    };
    
    const Operation = AV.Object.extend("UserOperations");
    const operation = new Operation();
    operation.set("userId", userId);
    operation.set("content", JSON.stringify(dataToUpload));
    operation.set("time", new Date());
    operation.set("device", navigator.userAgent);
    await operation.save();
    console.log("操作记录上传成功");
  } catch (error) {
    console.error("操作记录上传失败：", error);
  }
}

// 4. 实时同步操作记录
async function syncUserOperations(userId) {
  if (!userId) return;
  
  try {
    const query = new AV.Query("UserOperations");
    query.equalTo("userId", userId);
    query.descending("time");
    
    // 实时监听数据变化
    query.subscribe().then(subscription => {
      subscription.on("create", (operation) => {
        console.log("新同步操作记录：", operation.toJSON());
        handleSyncData(operation);
      });
      subscription.on("update", (operation) => {
        console.log("操作记录更新：", operation.toJSON());
        handleSyncData(operation);
      });
    });
    
    // 页面加载时，获取最新的一条记录用于同步
    const latestRecord = await query.first();
    if (latestRecord) {
      handleSyncData(latestRecord);
    }
    
  } catch (error) {
    console.error("同步操作记录失败：", error);
  }
}

// 处理同步数据
function handleSyncData(operation) {
  try {
    const data = operation.toJSON();
    if (data.content) {
      const syncData = JSON.parse(data.content);
      // 合并数据，避免覆盖本地未同步的最新操作
      mergeSyncData(syncData);
      // 重新渲染页面
      renderPage();
      console.log("数据同步成功");
    }
  } catch (error) {
    console.error("处理同步数据失败：", error);
  }
}

// 合并同步数据
function mergeSyncData(syncData) {
  if (!syncData) return;
  
  // 合并分组数据
  if (syncData.groups) {
    syncData.groups.forEach(syncGroup => {
      const existingIndex = groups.findIndex(group => group.id === syncGroup.id);
      if (existingIndex >= 0) {
        // 更新现有分组
        groups[existingIndex] = syncGroup;
      } else {
        // 添加新分组
        groups.push(syncGroup);
      }
    });
  }
  
  // 合并成员数据
  if (syncData.members) {
    syncData.members.forEach(syncMember => {
      const existingIndex = members.findIndex(member => member.id === syncMember.id);
      if (existingIndex >= 0) {
        // 更新现有成员
        members[existingIndex] = syncMember;
      } else {
        // 添加新成员
        members.push(syncMember);
      }
    });
  }
  
  // 合并签到记录
  if (syncData.signinRecords) {
    syncData.signinRecords.forEach(syncRecord => {
      const existingIndex = signinRecords.findIndex(record => 
        record.memberId === syncRecord.memberId && 
        record.date === syncRecord.date && 
        record.signinType === syncRecord.signinType
      );
      if (existingIndex >= 0) {
        // 更新现有记录
        signinRecords[existingIndex] = syncRecord;
      } else {
        // 添加新记录
        signinRecords.push(syncRecord);
      }
    });
  }
  
  // 保存到本地存储
  saveData();
}

// 5. 重写saveData函数，添加云同步功能
function saveData() {
    localStorage.setItem('volunteerGroups', JSON.stringify(groups));
    localStorage.setItem('volunteerMembers', JSON.stringify(members));
    localStorage.setItem('volunteerSigninRecords', JSON.stringify(signinRecords));
    
    // 上传到LeanCloud
    if (leanCloudUserId) {
        uploadUserOperation(leanCloudUserId, "数据更新");
    }
}

// 6. 渲染操作记录到页面
function renderOperationRecords(records) {
    // 对应HTML中的操作记录容器ID：operation-list
    const container = document.getElementById("operation-list");
    if (!container) return;
    
    // 清空原有内容，渲染新记录
    container.innerHTML = records.map((item, index) => `
        <div class="operation-item" style="padding: 10px; border-bottom: 1px solid #eee; margin: 10px 0; background-color: #f9f9f9; border-radius: 8px;">
            <p><strong>操作${index + 1}：</strong>${item.content}</p>
            <p><strong>操作时间：</strong>${new Date(item.time).toLocaleString()}</p>
            <p><strong>设备信息：</strong>${item.device.slice(0, 60)}...</p>
        </div>
    `).join("");
}

// 页面加载完成后初始化
window.addEventListener('DOMContentLoaded', initApp);