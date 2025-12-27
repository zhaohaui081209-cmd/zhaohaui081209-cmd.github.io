// 全局变量
let currentUser = null;
let currentRole = null;
let currentMemberId = null;

// 初始化数据
function initData() {
    let users = {};
    if (!localStorage.getItem('users')) {
        users = {
            '赵广仁': { password: 'zgr081209', role: 'admin', name: '管理员' },
            '负责人': { password: 'leader123', role: 'leader', name: '负责人' }
        };
        localStorage.setItem('users', JSON.stringify(users));
    }

    if (!localStorage.getItem('members')) {
        const members = [];
        localStorage.setItem('members', JSON.stringify(members));
    }

    if (!localStorage.getItem('attendance')) {
        localStorage.setItem('attendance', JSON.stringify({}));
    }

    if (!localStorage.getItem('groups')) {
        const groups = [];
        localStorage.setItem('groups', JSON.stringify(groups));
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    initData();
    setupEventListeners();
    
    // 设置默认日期
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('attendance-date').value = today;
    document.getElementById('start-date').value = new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0];
    document.getElementById('end-date').value = today;
    
    // 检查登录状态
    const loginState = localStorage.getItem('loginState');
    if (loginState) {
        const state = JSON.parse(loginState);
        currentUser = state.user;
        currentRole = state.role;
        currentMemberId = state.memberId;
        showMainPage();
    }
});

// 设置事件监听器
function setupEventListeners() {
    document.getElementById('role').addEventListener('change', togglePasswordField);
    document.getElementById('login-btn').addEventListener('click', handleLogin);
    document.getElementById('logout-btn').addEventListener('click', handleLogout);
    
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const page = this.dataset.page;
            switchPage(page);
        });
    });
    
    document.getElementById('add-member-btn').addEventListener('click', showAddMemberForm);
    document.getElementById('cancel-member-btn').addEventListener('click', hideAddMemberForm);
    document.getElementById('save-member-btn').addEventListener('click', saveMember);
    document.getElementById('delete-all-members-btn').addEventListener('click', deleteAllMembers);
    
    document.getElementById('attendance-date').addEventListener('change', loadAttendanceData);
    document.getElementById('export-btn').addEventListener('click', exportData);
    document.getElementById('summary-btn').addEventListener('click', generateSummary);
    
    // 搜索功能
    document.getElementById('search-members').addEventListener('input', searchMembers);
    
    // 文件上传
    setupFileUpload();
    setupAttendanceFileUpload();
    
    // 负责人管理事件
    document.getElementById('add-leader-btn').addEventListener('click', showAddLeaderForm);
    document.getElementById('cancel-leader-btn').addEventListener('click', hideAddLeaderForm);
    document.getElementById('save-leader-btn').addEventListener('click', saveLeader);
    document.getElementById('cancel-edit-leader-btn').addEventListener('click', hideEditLeaderForm);
    document.getElementById('save-edit-leader-btn').addEventListener('click', saveEditLeader);
    
    // 分组管理事件
document.getElementById('add-group-btn').addEventListener('click', showAddGroupForm);
document.getElementById('cancel-group-btn').addEventListener('click', hideAddGroupForm);
document.getElementById('save-group-btn').addEventListener('click', saveGroup);
document.getElementById('delete-group-btn').addEventListener('click', showDeleteGroupForm);
document.getElementById('delete-all-groups-btn').addEventListener('click', deleteAllGroups);
    
    // 密码修改事件
    document.getElementById('change-password-btn').addEventListener('click', showChangePasswordForm);
    document.getElementById('cancel-password-btn').addEventListener('click', hideChangePasswordForm);
    document.getElementById('save-password-btn').addEventListener('click', savePassword);
}

// 显示添加负责人表单
function showAddLeaderForm() {
    document.getElementById('add-leader-form').classList.remove('hidden');
    generateFloorOptions(); // 生成楼层选项
    document.getElementById('leader-username').focus();
}

// 隐藏添加负责人表单
function hideAddLeaderForm() {
    document.getElementById('add-leader-form').classList.add('hidden');
    document.getElementById('leader-username').value = '';
    document.getElementById('leader-name').value = '';
    document.getElementById('leader-password').value = '';
}

// 生成楼层选项
function generateFloorOptions(selectId = 'leader-floors') {
    const groups = JSON.parse(localStorage.getItem('groups') || '[]');
    const select = document.getElementById(selectId);
    
    // 获取所有唯一的楼层
    const floors = [...new Set(groups.map(group => group.floor).filter(Boolean))].sort();
    
    // 清空当前选项
    select.innerHTML = '';
    
    // 添加楼层选项
    floors.forEach(floor => {
        const option = document.createElement('option');
        option.value = floor;
        option.textContent = floor;
        select.appendChild(option);
    });
}

// 显示编辑负责人表单
function showEditLeaderForm(username) {
    const users = JSON.parse(localStorage.getItem('users') || '{}');
    const user = users[username];
    
    if (!user || user.role !== 'leader') {
        alert('负责人不存在');
        return;
    }
    
    // 填充表单数据
    document.getElementById('edit-leader-original-username').value = username;
    document.getElementById('edit-leader-username').value = username;
    document.getElementById('edit-leader-name').value = user.name;
    document.getElementById('edit-leader-password').value = '';
    
    // 生成楼层选项并选中已管理的楼层
    generateFloorOptions('edit-leader-floors');
    const select = document.getElementById('edit-leader-floors');
    const managedFloors = user.managedFloors || [];
    
    Array.from(select.options).forEach(option => {
        if (managedFloors.includes(option.value)) {
            option.selected = true;
        }
    });
    
    // 显示表单
    document.getElementById('edit-leader-form').classList.remove('hidden');
    document.getElementById('edit-leader-username').focus();
}

// 隐藏编辑负责人表单
function hideEditLeaderForm() {
    document.getElementById('edit-leader-form').classList.add('hidden');
    document.getElementById('edit-leader-original-username').value = '';
    document.getElementById('edit-leader-username').value = '';
    document.getElementById('edit-leader-name').value = '';
    document.getElementById('edit-leader-password').value = '';
}

// 保存编辑后的负责人信息
function saveEditLeader() {
    const originalUsername = document.getElementById('edit-leader-original-username').value;
    const username = document.getElementById('edit-leader-username').value.trim();
    const name = document.getElementById('edit-leader-name').value.trim();
    const password = document.getElementById('edit-leader-password').value;
    const floorsSelect = document.getElementById('edit-leader-floors');
    const selectedFloors = Array.from(floorsSelect.selectedOptions).map(option => option.value);
    
    if (!username || !name) {
        alert('请填写完整信息');
        return;
    }
    
    const users = JSON.parse(localStorage.getItem('users') || '{}');
    const groups = JSON.parse(localStorage.getItem('groups') || '[]');
    
    // 检查用户名是否已存在（如果修改了用户名）
    if (username !== originalUsername && users[username]) {
        alert('该用户名已存在');
        return;
    }
    
    // 获取旧的用户信息
    const oldUser = users[originalUsername];
    
    // 创建更新后的用户信息
    const updatedUser = {
        ...oldUser,
        name,
        managedFloors: selectedFloors
    };
    
    // 如果提供了新密码，则更新密码
    if (password) {
        updatedUser.password = password;
    }
    
    // 删除旧的用户记录
    delete users[originalUsername];
    
    // 添加新的用户记录（可能使用新的用户名）
    users[username] = updatedUser;
    
    // 更新分组中的负责人引用（如果用户名发生了变化）
    if (username !== originalUsername) {
        const updatedGroups = groups.map(group => {
            if (group.leader === originalUsername) {
                return { ...group, leader: username };
            }
            return group;
        });
        localStorage.setItem('groups', JSON.stringify(updatedGroups));
    }
    
    // 保存更新后的用户信息
    localStorage.setItem('users', JSON.stringify(users));
    
    loadLeaders();
    hideEditLeaderForm();
    
    // 更新分组表单中的负责人下拉列表
    updateGroupLeaderDropdown();
}

// 保存负责人
function saveLeader() {
    const username = document.getElementById('leader-username').value.trim();
    const name = document.getElementById('leader-name').value.trim();
    const password = document.getElementById('leader-password').value;
    const floorsSelect = document.getElementById('leader-floors');
    const selectedFloors = Array.from(floorsSelect.selectedOptions).map(option => option.value);
    
    if (!username || !name || !password) {
        alert('请填写完整信息');
        return;
    }
    
    const users = JSON.parse(localStorage.getItem('users') || '{}');
    
    if (users[username]) {
        alert('该用户名已存在');
        return;
    }
    
    users[username] = { password, role: 'leader', name, managedFloors: selectedFloors };
    localStorage.setItem('users', JSON.stringify(users));
    
    loadLeaders();
    hideAddLeaderForm();
    
    // 更新分组表单中的负责人下拉列表
    updateGroupLeaderDropdown();
}

// 删除负责人
function deleteLeader(username) {
    if (!confirm(`确定要删除负责人${username}吗？`)) {
        return;
    }
    
    const users = JSON.parse(localStorage.getItem('users') || '{}');
    const groups = JSON.parse(localStorage.getItem('groups') || '[]');
    
    // 删除负责人账号
    delete users[username];
    localStorage.setItem('users', JSON.stringify(users));
    
    // 更新分组的负责人信息（将删除的负责人设为无）
    const updatedGroups = groups.map(group => {
        if (group.leader === username) {
            return { ...group, leader: '' };
        }
        return group;
    });
    localStorage.setItem('groups', JSON.stringify(updatedGroups));
    
    loadLeaders();
    loadGroups();
    
    // 更新分组表单中的负责人下拉列表
    updateGroupLeaderDropdown();
}

// 加载负责人列表
function loadLeaders() {
    const users = JSON.parse(localStorage.getItem('users') || '{}');
    const groups = JSON.parse(localStorage.getItem('groups') || '[]');
    const tbody = document.getElementById('leaders-list');
    
    tbody.innerHTML = '';
    
    // 筛选出负责人角色的用户
    const leaders = Object.keys(users).filter(username => users[username].role === 'leader');
    
    leaders.forEach(username => {
        const user = users[username];
        // 获取负责人管理的楼层
        const managedFloors = user.managedFloors || [];
        const floorInfo = managedFloors.join(', ');
        
        // 找出该负责人管理的分组
        const managedGroups = groups.filter(group => managedFloors.includes(group.floor));
        const groupInfo = managedGroups.map(group => `${group.name} (${group.floor})`).join(', ');
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${username}</td>
            <td>${user.name}</td>
            <td>${floorInfo || '无'}</td>
            <td>${groupInfo || '无'}</td>
            <td>
                <button class="manage-btn" onclick="showEditLeaderForm('${username}')">管理</button>
                <button class="delete-btn" onclick="deleteLeader('${username}')">删除</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// 显示添加分组表单
function showAddGroupForm() {
    document.getElementById('add-group-form').classList.remove('hidden');
    document.getElementById('new-group-name').focus();
    updateGroupLeaderDropdown();
}

// 隐藏添加分组表单
function hideAddGroupForm() {
    document.getElementById('add-group-form').classList.add('hidden');
    document.getElementById('new-group-name').value = '';
    document.getElementById('new-group-floor').value = '';
    document.getElementById('new-group-leader').value = '';
}

// 保存分组
function saveGroup() {
    // 检查权限：只有管理员才能添加分组
    if (currentRole !== 'admin') {
        alert('只有管理员才能添加分组');
        return;
    }
    
    const name = document.getElementById('new-group-name').value.trim();
    const floor = document.getElementById('new-group-floor').value.trim();
    const leader = document.getElementById('new-group-leader').value;
    
    if (!name) {
        alert('请输入分组名称');
        return;
    }
    
    if (!floor) {
        alert('请输入楼层');
        return;
    }
    
    const groups = JSON.parse(localStorage.getItem('groups') || '[]');
    
    if (groups.some(group => group.name === name)) {
        alert('该分组名称已存在');
        return;
    }
    
    const newGroup = { name, floor, leader: leader || '' };
    groups.push(newGroup);
    localStorage.setItem('groups', JSON.stringify(groups));
    
    loadGroups();
    hideAddGroupForm();
    
    // 更新成员表单中的分组下拉列表
    updateGroupDropdown();
}

// 显示删除分组表单
function showDeleteGroupForm() {
    // 检查权限：只有管理员才能删除分组
    if (currentRole !== 'admin') {
        alert('只有管理员才能删除分组');
        return;
    }
    
    const groups = JSON.parse(localStorage.getItem('groups') || '[]');
    const deleteForm = document.getElementById('delete-group-form');
    
    // 如果表单不存在，创建它
    if (!deleteForm) {
        const membersPage = document.querySelector('#members-page .content');
        const form = document.createElement('div');
        form.id = 'delete-group-form';
        form.className = 'form hidden';
        form.innerHTML = `
            <h3>删除分组</h3>
            <div class="form-group">
                <label for="delete-group-select">选择要删除的分组</label>
                <select id="delete-group-select"></select>
            </div>
            <div class="form-actions">
                <button id="confirm-delete-group-btn">确认删除</button>
                <button id="cancel-delete-group-btn">取消</button>
            </div>
        `;
        membersPage.appendChild(form);
        
        // 添加事件监听器
        document.getElementById('confirm-delete-group-btn').addEventListener('click', deleteGroup);
        document.getElementById('cancel-delete-group-btn').addEventListener('click', hideDeleteGroupForm);
    }
    
    // 填充分组选项
    const select = document.getElementById('delete-group-select');
    select.innerHTML = '';
    
    groups.forEach(group => {
        const option = document.createElement('option');
        option.value = group.name;
        option.textContent = `${group.name} (${group.floor})`;
        select.appendChild(option);
    });
    
    // 显示表单
    document.getElementById('delete-group-form').classList.remove('hidden');
}

// 隐藏删除分组表单
function hideDeleteGroupForm() {
    const deleteForm = document.getElementById('delete-group-form');
    if (deleteForm) {
        deleteForm.classList.add('hidden');
    }
}

// 删除分组
function deleteGroup() {
    const groupName = document.getElementById('delete-group-select').value;
    
    if (!groupName) {
        alert('请选择要删除的分组');
        return;
    }
    
    if (!confirm(`确定要删除分组"${groupName}"吗？`)) {
        return;
    }
    
    // 获取当前分组和成员数据
    const groups = JSON.parse(localStorage.getItem('groups') || '[]');
    const members = JSON.parse(localStorage.getItem('members') || '[]');
    
    // 获取要删除的分组信息
    const groupToDelete = groups.find(group => group.name === groupName);
    if (!groupToDelete) {
        alert('分组不存在');
        return;
    }
    
    const groupFloor = groupToDelete.floor;
    
    // 删除分组
    const updatedGroups = groups.filter(group => group.name !== groupName);
    localStorage.setItem('groups', JSON.stringify(updatedGroups));
    
    // 检查是否还有其他分组使用相同的楼层
    const hasOtherGroupWithSameFloor = updatedGroups.some(group => group.floor === groupFloor);
    
    // 更新成员数据，将属于该分组的成员设为未分组，并且如果没有其他分组使用该楼层，则清除成员的楼层信息
    const updatedMembers = members.map(member => {
        let updatedMember = { ...member };
        
        // 如果成员属于该分组，设为未分组
        if (updatedMember.group === groupName) {
            updatedMember.group = '';
        }
        
        // 如果没有其他分组使用该楼层，且成员的楼层是该楼层，则清除楼层信息
        if (!hasOtherGroupWithSameFloor && updatedMember.floor === groupFloor) {
            updatedMember.floor = '';
        }
        
        return updatedMember;
    });
    localStorage.setItem('members', JSON.stringify(updatedMembers));
    
    // 更新界面
    loadGroups();
    loadMembersData();
    hideDeleteGroupForm();
    
    // 更新下拉列表和筛选器
    updateGroupDropdown();
    updateGroupFilter();
    updateStatisticsGroupFilter();
}

// 一键删除所有分组
function deleteAllGroups() {
    if (!confirm("确定要删除所有分组吗？此操作不可恢复！")) {
        return;
    }
    
    // 清空所有分组
    localStorage.setItem('groups', JSON.stringify([]));
    
    // 更新成员数据，将所有成员设为未分组并清除楼层信息
    const members = JSON.parse(localStorage.getItem('members') || '[]');
    const updatedMembers = members.map(member => ({ ...member, group: '', floor: '' }));
    localStorage.setItem('members', JSON.stringify(updatedMembers));
    
    // 更新界面
    loadGroups();
    loadMembersData();
    updateGroupDropdown();
    updateGroupFilter();
    updateStatisticsGroupFilter();
    
    alert("所有分组和楼层信息已成功删除");
}

// 加载分组
function loadGroups() {
    const groups = JSON.parse(localStorage.getItem('groups') || '[]');
    
    // 更新成员表单中的分组下拉列表
    updateGroupDropdown();
    
    // 更新分组表单中的负责人下拉列表
    updateGroupLeaderDropdown();
}

// 更新成员表单中的分组下拉列表
function updateGroupDropdown() {
    const groups = JSON.parse(localStorage.getItem('groups') || '[]');
    const select = document.getElementById('new-member-group');
    
    // 保存当前选中的值
    const currentValue = select.value;
    
    // 清空下拉列表
    select.innerHTML = '<option value="">未分组</option>';
    
    // 添加分组选项
    groups.forEach(group => {
        const option = document.createElement('option');
        option.value = group.name;
        option.textContent = group.name;
        select.appendChild(option);
    });
    
    // 恢复当前选中的值
    select.value = currentValue;
}

// 更新分组表单中的负责人下拉列表
function updateGroupLeaderDropdown() {
    const users = JSON.parse(localStorage.getItem('users') || '{}');
    const select = document.getElementById('new-group-leader');
    
    // 保存当前选中的值
    const currentValue = select.value;
    
    // 清空下拉列表
    select.innerHTML = '<option value="">无</option>';
    
    // 添加负责人选项
    Object.keys(users).forEach(username => {
        if (users[username].role === 'leader') {
            const option = document.createElement('option');
            option.value = username;
            option.textContent = users[username].name;
            select.appendChild(option);
        }
    });
    
    // 恢复当前选中的值
    select.value = currentValue;
}

// 切换密码字段显示
function togglePasswordField() {
    const role = document.getElementById('role').value;
    const passwordGroup = document.getElementById('password-group');
    
    if (role === 'member') {
        passwordGroup.style.display = 'none';
    } else {
        passwordGroup.style.display = 'block';
    }
}

// 处理登录
function handleLogin() {
    const role = document.getElementById('role').value;
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('login-error');
    
    errorDiv.textContent = '';
    
    if (!username) {
        errorDiv.textContent = '请输入用户名';
        return;
    }
    
    if (role !== 'member' && !password) {
        errorDiv.textContent = '请输入密码';
        return;
    }
    
    const users = JSON.parse(localStorage.getItem('users') || '{}');
    const members = JSON.parse(localStorage.getItem('members') || '[]');
    
    if (role === 'member') {
        const member = members.find(m => m.name === username);
        if (!member) {
            errorDiv.textContent = '成员不存在';
            return;
        }
        currentUser = username;
        currentRole = 'member';
        currentMemberId = member.id;
    } else {
        const user = users[username];
        if (!user || user.password !== password || user.role !== role) {
            errorDiv.textContent = '用户名或密码错误';
            return;
        }
        currentUser = username;
        currentRole = role;
    }
    
    // 保存登录状态
    localStorage.setItem('loginState', JSON.stringify({ user: currentUser, role: currentRole, memberId: currentMemberId }));
    
    // 刷新页面
    window.location.reload();
}

// 显示主页面
function showMainPage() {
    document.getElementById('login-page').style.display = 'none';
    document.getElementById('main-page').style.display = 'block';
    document.getElementById('current-user').textContent = `欢迎, ${currentUser}`;
    
    checkRoleVisibility();
    loadDashboardData();
    loadMembersData();
    loadAttendanceData();
    loadMemberInfo();
    loadGroups();
    loadLeaders();
    initFilters();
    
    switchPage('dashboard');
    
    // 确保页面滚动到顶部
    window.scrollTo(0, 0);
}

// 检查角色可见性
function checkRoleVisibility() {
    if (currentRole === 'member') {
        document.getElementById('members-nav').style.display = 'none';
        document.getElementById('attendance-nav').style.display = 'none';
        document.getElementById('statistics-nav').style.display = 'none';
        document.getElementById('leaders-nav').style.display = 'none';
        document.getElementById('change-password-btn').classList.add('hidden');
    } else if (currentRole === 'leader') {
        document.getElementById('members-nav').style.display = 'inline-block';
        document.getElementById('attendance-nav').style.display = 'inline-block';
        document.getElementById('statistics-nav').style.display = 'inline-block';
        document.getElementById('leaders-nav').style.display = 'none';
        document.getElementById('change-password-btn').classList.add('hidden');
        
        // 负责人不能添加分组和成员，不显示删除所有人按钮
        document.getElementById('add-member-btn').style.display = 'none';
        document.getElementById('add-group-btn').style.display = 'none';
        document.getElementById('delete-all-members-btn').style.display = 'none';
    } else {
        document.getElementById('members-nav').style.display = 'inline-block';
        document.getElementById('attendance-nav').style.display = 'inline-block';
        document.getElementById('statistics-nav').style.display = 'inline-block';
        document.getElementById('leaders-nav').style.display = 'inline-block';
        document.getElementById('change-password-btn').classList.remove('hidden');
        
        // 管理员可以看到所有按钮
        document.getElementById('add-member-btn').style.display = 'inline-block';
        document.getElementById('add-group-btn').style.display = 'inline-block';
        document.getElementById('delete-all-members-btn').style.display = 'inline-block';
    }
}

// 显示密码修改表单
function showChangePasswordForm() {
    document.getElementById('admin-password-form').classList.remove('hidden');
    document.getElementById('current-password').focus();
}

// 隐藏密码修改表单
function hideChangePasswordForm() {
    document.getElementById('admin-password-form').classList.add('hidden');
    document.getElementById('current-password').value = '';
    document.getElementById('new-password').value = '';
    document.getElementById('confirm-password').value = '';
}

// 保存密码修改
function savePassword() {
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    
    // 验证输入
    if (!currentPassword) {
        alert('请输入当前密码');
        return;
    }
    
    if (!newPassword) {
        alert('请输入新密码');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        alert('两次输入的新密码不一致');
        return;
    }
    
    // 获取当前用户信息
    const users = JSON.parse(localStorage.getItem('users') || '{}');
    const adminUser = users[currentUser];
    
    // 验证当前密码
    if (adminUser.password !== currentPassword) {
        alert('当前密码输入错误');
        return;
    }
    
    // 更新密码
    adminUser.password = newPassword;
    users[currentUser] = adminUser;
    localStorage.setItem('users', JSON.stringify(users));
    
    alert('密码修改成功');
    hideChangePasswordForm();
}

// 退出登录
function handleLogout() {
    currentUser = null;
    currentRole = null;
    currentMemberId = null;
    
    // 清除登录状态
    localStorage.removeItem('loginState');
    
    document.getElementById('login-page').style.display = 'flex';
    document.getElementById('main-page').style.display = 'none';
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
    document.getElementById('login-error').textContent = '';
}

// 切换页面
function switchPage(pageName) {
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.content').forEach(content => content.classList.remove('active'));
    
    document.querySelector(`[data-page="${pageName}"]`).classList.add('active');
    document.getElementById(pageName).classList.add('active');
    
    if (pageName === 'member-info' && currentRole === 'member') {
        loadMemberInfo();
    } else if (pageName === 'members') {
        initFilters();
        loadMembersData();
    } else if (pageName === 'statistics') {
        updateStatisticsGroupFilter();
    }
}

// 显示添加成员表单
function showAddMemberForm() {
    document.getElementById('add-member-form').classList.remove('hidden');
    document.getElementById('new-member-name').focus();
}

// 隐藏添加成员表单
function hideAddMemberForm() {
    document.getElementById('add-member-form').classList.add('hidden');
    document.getElementById('new-member-name').value = '';
    document.getElementById('new-member-id').value = '';
}

// 保存成员
function saveMember() {
    const name = document.getElementById('new-member-name').value.trim();
    const id = document.getElementById('new-member-id').value.trim();
    const group = document.getElementById('new-member-group').value;
    const floor = document.getElementById('new-member-floor').value;
    
    if (!name || !id) {
        alert('请填写完整信息');
        return;
    }
    
    const members = JSON.parse(localStorage.getItem('members') || '[]');
    
    if (members.some(m => m.id === id)) {
        alert('该学号/ID已存在');
        return;
    }
    
    const newMember = { id, name, hours: 0, group: group || '', floor: floor || '' };
    members.push(newMember);
    localStorage.setItem('members', JSON.stringify(members));
    
    loadMembersData();
    hideAddMemberForm();
    
    // 添加到签到记录
    updateAttendanceForNewMember(newMember);
}

// 为新成员更新签到记录
function updateAttendanceForNewMember(member) {
    const attendance = JSON.parse(localStorage.getItem('attendance') || '{}');
    const today = new Date().toISOString().split('T')[0];
    
    if (!attendance[today]) {
        attendance[today] = {};
    }
    
    if (!attendance[today][member.id]) {
        attendance[today][member.id] = 'absent';
    }
    
    localStorage.setItem('attendance', JSON.stringify(attendance));
}

// 加载成员数据
function loadMembersData() {
    let members = JSON.parse(localStorage.getItem('members') || '[]');
    const groups = JSON.parse(localStorage.getItem('groups') || '[]');
    const users = JSON.parse(localStorage.getItem('users') || '{}');
    const tbody = document.getElementById('members-list');
    
    // 过滤数据：如果是负责人，只显示自己负责的分组
    if (currentRole === 'leader') {
        const user = users[currentUser];
        const managedFloors = user.managedFloors || [];
        const leaderGroups = groups.filter(group => managedFloors.includes(group.floor));
        const groupNames = leaderGroups.map(group => group.name);
        members = members.filter(member => member.group && groupNames.includes(member.group));
    }
    
    // 应用筛选
    members = applyFilters(members, groups);
    
    tbody.innerHTML = '';
    
    members.forEach(member => {
        // 查找成员所在分组的楼层信息
        let floor = member.floor || '';
        if (!floor && member.group) {
            const group = groups.find(g => g.name === member.group);
            if (group && group.floor) {
                floor = group.floor;
            }
        }
        
        // 获取所有楼层选项
        const floors = [...new Set(groups.map(group => group.floor).filter(Boolean))].sort();
        
        // 生成楼层选择下拉菜单
        let floorOptions = '<option value="">未选择</option>';
        floors.forEach(f => {
            floorOptions += `<option value="${f}" ${floor === f ? 'selected' : ''}>${f}</option>`;
        });
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${member.name}</td>
            <td>${member.id}</td>
            <td>
                ${currentRole === 'admin' ? 
                    `<select class="floor-select" onchange="updateMemberFloor('${member.id}', this.value)">
                        ${floorOptions}
                    </select>` : 
                    `${floor || '未分组'}`
                }
            </td>
            <td>${member.group || '未分组'}</td>
            <td>${calculateMemberHours(member.id)}</td>
            <td><button class="delete-btn" onclick="deleteMember('${member.id}')">删除</button></td>
        `;
        tbody.appendChild(row);
    });
}

// 初始化筛选器
function initFilters() {
    const filterFloor = document.getElementById('filter-floor');
    const groups = JSON.parse(localStorage.getItem('groups') || '[]');
    
    // 获取所有唯一的楼层
    const floors = [...new Set(groups.map(group => group.floor).filter(Boolean))].sort();
    
    // 清空并添加楼层选项
    filterFloor.innerHTML = '<option value="">所有楼层</option>';
    floors.forEach(floor => {
        filterFloor.appendChild(new Option(floor, floor));
    });
    
    // 初始化分组筛选
    updateGroupFilter();
}

// 应用筛选
function applyFilters(members, groups) {
    const filterFloor = document.getElementById('filter-floor');
    const filterGroup = document.getElementById('filter-group');
    const searchTerm = document.getElementById('search-members').value.toLowerCase();
    
    let filteredMembers = members;
    
    // 应用楼层筛选
    const selectedFloor = filterFloor.value;
    if (selectedFloor) {
        filteredMembers = filteredMembers.filter(member => {
            // 获取成员的楼层信息
            let memberFloor = member.floor;
            if (!memberFloor && member.group) {
                const group = groups.find(g => g.name === member.group);
                if (group) {
                    memberFloor = group.floor;
                }
            }
            return memberFloor === selectedFloor;
        });
    }
    
    // 应用分组筛选
    const selectedGroup = filterGroup.value;
    if (selectedGroup) {
        filteredMembers = filteredMembers.filter(member => member.group === selectedGroup);
    }
    
    // 应用搜索筛选
    if (searchTerm) {
        filteredMembers = filteredMembers.filter(member => 
            member.name.toLowerCase().includes(searchTerm) || 
            member.id.toLowerCase().includes(searchTerm)
        );
    }
    
    return filteredMembers;
}

// 更新分组筛选选项
function updateGroupFilter() {
    const filterFloor = document.getElementById('filter-floor');
    const filterGroup = document.getElementById('filter-group');
    const groups = JSON.parse(localStorage.getItem('groups') || '[]');
    
    const selectedFloor = filterFloor.value;
    
    // 清空分组选项
    filterGroup.innerHTML = '<option value="">所有分组</option>';
    
    // 根据选择的楼层过滤分组
    let filteredGroups = groups;
    if (selectedFloor) {
        filteredGroups = groups.filter(group => group.floor === selectedFloor);
    }
    
    // 添加分组选项
    filteredGroups.forEach(group => {
        filterGroup.appendChild(new Option(group.name, group.name));
    });
    
    // 重新加载成员数据以应用筛选
    loadMembersData();
}

// 清除筛选
function clearFilters() {
    document.getElementById('filter-floor').value = '';
    document.getElementById('filter-group').value = '';
    document.getElementById('search-members').value = '';
    updateGroupFilter();
    loadMembersData();
}

// 更新统计页面的分组筛选选项
function updateStatisticsGroupFilter() {
    const filterFloor = document.getElementById('statistics-filter-floor');
    const filterGroup = document.getElementById('statistics-filter-group');
    const groups = JSON.parse(localStorage.getItem('groups') || '[]');
    
    const selectedFloor = filterFloor.value;
    
    // 清空分组选项
    filterGroup.innerHTML = '<option value="">所有分组</option>';
    
    // 根据选择的楼层过滤分组
    let filteredGroups = groups;
    if (selectedFloor) {
        filteredGroups = groups.filter(group => group.floor === selectedFloor);
    }
    
    // 添加分组选项
    filteredGroups.forEach(group => {
        filterGroup.appendChild(new Option(group.name, group.name));
    });
}

// 清除统计页面筛选
function clearStatisticsFilters() {
    document.getElementById('statistics-filter-floor').value = '';
    document.getElementById('statistics-filter-group').value = '';
    updateStatisticsGroupFilter();
    generateSummary();
}

// 更新成员楼层
function updateMemberFloor(memberId, floor) {
    if (currentRole !== 'admin') {
        alert('只有管理员才能修改成员楼层');
        return;
    }
    
    let members = JSON.parse(localStorage.getItem('members') || '[]');
    const memberIndex = members.findIndex(m => m.id === memberId);
    
    if (memberIndex !== -1) {
        members[memberIndex].floor = floor || '';
        localStorage.setItem('members', JSON.stringify(members));
        loadMembersData();
    }
}

// 删除成员
function deleteMember(memberId) {
    // 检查权限：负责人不能删除成员
    if (currentRole === 'leader') {
        alert('负责人没有权限删除成员');
        return;
    }
    
    if (confirm('确定要删除该成员吗？')) {
        let members = JSON.parse(localStorage.getItem('members') || '[]');
        members = members.filter(m => m.id !== memberId);
        localStorage.setItem('members', JSON.stringify(members));
        
        // 从签到记录中删除
        const attendance = JSON.parse(localStorage.getItem('attendance') || '{}');
        Object.keys(attendance).forEach(date => {
            delete attendance[date][memberId];
        });
        localStorage.setItem('attendance', JSON.stringify(attendance));
        
        loadMembersData();
        loadAttendanceData();
    }
}

// 加载签到数据
function loadAttendanceData() {
    const date = document.getElementById('attendance-date').value;
    let members = JSON.parse(localStorage.getItem('members') || '[]');
    const groups = JSON.parse(localStorage.getItem('groups') || '[]');
    const users = JSON.parse(localStorage.getItem('users') || '{}');
    const attendance = JSON.parse(localStorage.getItem('attendance') || '{}');
    const tbody = document.getElementById('attendance-list');
    
    // 过滤数据：如果是负责人，只显示自己负责的分组
    if (currentRole === 'leader') {
        const user = users[currentUser];
        const managedFloors = user.managedFloors || [];
        const leaderGroups = groups.filter(group => managedFloors.includes(group.floor));
        const groupNames = leaderGroups.map(group => group.name);
        members = members.filter(member => member.group && groupNames.includes(member.group));
    }
    
    tbody.innerHTML = '';
    
    if (!attendance[date]) {
        attendance[date] = {};
    }
    
    members.forEach(member => {
        if (!attendance[date][member.id]) {
            attendance[date][member.id] = 'absent';
        }
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${member.name}</td>
            <td>${member.id}</td>
            <td>
                <select class="status-select" onchange="updateAttendance('${member.id}', this.value, '${date}')">
                    <option value="present" ${attendance[date][member.id] === 'present' ? 'selected' : ''}>签到</option>
                    <option value="leave" ${attendance[date][member.id] === 'leave' ? 'selected' : ''}>请假</option>
                    <option value="absent" ${attendance[date][member.id] === 'absent' ? 'selected' : ''}>旷课</option>
                </select>
            </td>
            <td><button onclick="resetAttendance('${member.id}', '${date}')">重置</button></td>
        `;
        tbody.appendChild(row);
    });
    
    localStorage.setItem('attendance', JSON.stringify(attendance));
}

// 更新签到状态
function updateAttendance(memberId, status, date) {
    const attendance = JSON.parse(localStorage.getItem('attendance') || '{}');
    
    if (!attendance[date]) {
        attendance[date] = {};
    }
    
    attendance[date][memberId] = status;
    localStorage.setItem('attendance', JSON.stringify(attendance));
    
    // 更新成员课时
    updateMemberHours(memberId);
    
    // 更新仪表盘数据
    if (date === new Date().toISOString().split('T')[0]) {
        loadDashboardData();
    }
}

// 重置签到状态
function resetAttendance(memberId, date) {
    updateAttendance(memberId, 'absent', date);
}

// 更新成员课时
function updateMemberHours(memberId) {
    const hours = calculateMemberHours(memberId);
    const members = JSON.parse(localStorage.getItem('members') || '[]');
    const memberIndex = members.findIndex(m => m.id === memberId);
    
    if (memberIndex !== -1) {
        members[memberIndex].hours = hours;
        localStorage.setItem('members', JSON.stringify(members));
    }
}

// 计算成员课时
function calculateMemberHours(memberId) {
    const attendance = JSON.parse(localStorage.getItem('attendance') || '{}');
    let hours = 0;
    
    Object.keys(attendance).forEach(date => {
        if (attendance[date][memberId] === 'present') {
            hours += 1;
        }
    });
    
    return hours;
}

// 加载仪表盘数据
function loadDashboardData() {
    const today = new Date().toISOString().split('T')[0];
    const attendance = JSON.parse(localStorage.getItem('attendance') || '{}');
    let members = JSON.parse(localStorage.getItem('members') || '[]');
    const groups = JSON.parse(localStorage.getItem('groups') || '[]');
    
    // 过滤数据：如果是负责人，只显示自己负责的分组
    if (currentRole === 'leader') {
        const users = JSON.parse(localStorage.getItem('users') || '{}');
        const user = users[currentUser];
        const managedFloors = user.managedFloors || [];
        const leaderGroups = groups.filter(group => managedFloors.includes(group.floor));
        const groupNames = leaderGroups.map(group => group.name);
        members = members.filter(member => member.group && groupNames.includes(member.group));
    }
    
    let present = 0, leave = 0, absent = 0, totalHours = 0;
    
    if (attendance[today]) {
        members.forEach(member => {
            const status = attendance[today][member.id];
            if (status) {
                switch (status) {
                    case 'present': present++; break;
                    case 'leave': leave++; break;
                    case 'absent': absent++; break;
                }
            }
        });
    }
    
    // 计算总课时
    members.forEach(member => {
        totalHours += calculateMemberHours(member.id);
    });
    
    document.getElementById('today-attendance').textContent = present;
    document.getElementById('today-leave').textContent = leave;
    document.getElementById('today-absent').textContent = absent;
    document.getElementById('total-hours').textContent = totalHours;
}

// 加载个人信息
function loadMemberInfo() {
    if (currentRole !== 'member') return;
    
    const members = JSON.parse(localStorage.getItem('members') || '[]');
    const member = members.find(m => m.id === currentMemberId);
    const attendance = JSON.parse(localStorage.getItem('attendance') || '{}');
    
    if (member) {
        document.getElementById('member-name').textContent = member.name;
        document.getElementById('member-id').textContent = member.id;
        document.getElementById('member-hours').textContent = calculateMemberHours(member.id);
        
        // 计算签到记录统计
        let presentCount = 0, leaveCount = 0, absentCount = 0;
        const records = [];
        
        Object.keys(attendance).forEach(date => {
            const status = attendance[date][member.id];
            if (status) {
                records.push({ date, status });
                
                switch (status) {
                    case 'present': presentCount++; break;
                    case 'leave': leaveCount++; break;
                    case 'absent': absentCount++; break;
                }
            }
        });
        
        document.getElementById('member-attendance').textContent = presentCount;
        document.getElementById('member-leave').textContent = leaveCount;
        document.getElementById('member-absent').textContent = absentCount;
        
        // 显示签到记录
        const tbody = document.getElementById('member-records-list');
        tbody.innerHTML = '';
        
        records.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        records.forEach(record => {
            const statusText = {
                present: '签到',
                leave: '请假',
                absent: '旷课'
            }[record.status];
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${record.date}</td>
                <td>${statusText}</td>
            `;
            tbody.appendChild(row);
        });
    }
}

// 设置文件上传
function setupFileUpload() {
    const dropArea = document.getElementById('drop-area');
    const fileInput = document.getElementById('file-input');
    const browseBtn = document.getElementById('browse-btn');
    
    console.log('setupFileUpload called');
    console.log('dropArea:', dropArea);
    console.log('fileInput:', fileInput);
    console.log('browseBtn:', browseBtn);
    
    // 设置成员管理页面的文件上传区域
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
        console.log(`Added ${eventName} listener to dropArea`);
    });
    
    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, highlight, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, unhighlight, false);
    });
    
    dropArea.addEventListener('drop', handleDrop, false);
    browseBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFiles, false);
    

}

// 文件上传辅助函数
function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

function highlight() {
    document.getElementById('drop-area').classList.add('drag-over');
}

function unhighlight() {
    document.getElementById('drop-area').classList.remove('drag-over');
}

function handleDrop(e) {
    console.log('handleDrop called');
    const dt = e.dataTransfer;
    const files = dt.files;
    console.log('Dropped files:', files);
    handleFiles({ target: { files } });
}

function handleFiles(e) {
    console.log('handleFiles called');
    console.log('Event:', e);
    const file = e.target.files[0];
    console.log('Selected file:', file);
    if (!file) return;
    
    const fileName = file.name;
    console.log('File name:', fileName);
    if (fileName.endsWith('.csv')) {
        console.log('Parsing CSV file');
        parseCSV(file);
    } else if (fileName.endsWith('.xlsx')) {
        console.log('Parsing Excel file');
        parseExcel(file);
    } else {
        alert('请上传CSV或Excel文件');
    }
}

// 解析CSV文件
function parseCSV(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const text = e.target.result;
        const lines = text.split('\n');
        const members = [];
        
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            const [name, id, group, floor] = line.split(',').map(item => item.trim());
            if (name && id) {
                members.push({ name, id, group: group || '', floor: floor || '' });
            }
        }
        
        addMembersFromData(members);
    };
    reader.readAsText(file);
}

// 从分组名称中提取楼层信息
function extractFloorFromGroupName(groupName) {
    // 尝试匹配常见的楼层模式，如"一楼", "二楼", "1楼", "2楼", "地下一层", "B1楼"等
    const patterns = [
        // 匹配"X楼"格式，如"1楼", "2楼", "10楼"
        /^(\d+)楼/, 
        // 匹配"X层"格式，如"1层", "2层", "10层"
        /^(\d+)层/, 
        // 匹配"X-F", "X-FL", "X-L"等格式，如"1-F", "2-FL", "3-L"
        /^(\d+)-?(F|FL|L)/, 
        // 匹配"X#"格式，如"1#", "2#", "10#"
        /^(\d+)#/, 
        // 匹配"地下X层", "地下X楼", "B1", "B2"等格式
        /^(地下(\d+)(楼|层))|(B(\d+))/, 
        // 匹配"一楼", "二楼", "三楼"等中文数字格式
        /^(一|二|三|四|五|六|七|八|九|十|十一|十二)(楼|层)/
    ];
    
    // 中文数字转阿拉伯数字映射
    const chineseNumMap = {
        "一": 1, "二": 2, "三": 3, "四": 4, "五": 5,
        "六": 6, "七": 7, "八": 8, "九": 9, "十": 10,
        "十一": 11, "十二": 12
    };
    
    for (const pattern of patterns) {
        const match = groupName.match(pattern);
        if (match) {
            // 处理"地下X层"或"B1"等格式
            if (match[1] === "地下") {
                return `地下${match[2]}楼`;
            } else if (match[4] === "B") {
                return `地下${match[5]}楼`;
            }
            
            // 处理中文数字
            if (chineseNumMap[match[1]]) {
                return `${chineseNumMap[match[1]]}楼`;
            }
            
            // 处理其他格式
            if (match[1]) {
                return `${match[1]}楼`;
            }
        }
    }
    
    // 如果没有匹配到任何模式，返回默认值
    return "";
}

// 解析Excel文件
function parseExcel(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        
        // 获取工作表的范围
        const range = XLSX.utils.decode_range(firstSheet['!ref']);
        const members = [];
        
        // 检查表格格式：是列式格式（有明确列标题）还是行式格式（楼层+分组+成员列表）
        let isColumnFormat = false;
        const firstRow = range.s.r;
        
        // 检查第一行是否包含列标题，扩展可能的标题列表
        const possibleHeaders = ['姓名', '名字', '名称', '学生', '成员', '学号', 'ID', '编号', '工号', '楼层', '层', '楼', '分组', '组', '团队', '签到状况'];
        let headerCount = 0;
        let hasNameHeader = false;
        
        for (let C = 0; C <= range.e.c; C++) {
            const cell = firstSheet[XLSX.utils.encode_cell({r: firstRow, c: C})];
            if (cell && cell.v) {
                const cellValue = String(cell.v).trim();
                // 检查是否包含姓名相关的标题
                if (cellValue.includes('姓名') || cellValue.includes('名字') || cellValue.includes('名称') || cellValue.includes('学生') || cellValue.includes('成员')) {
                    hasNameHeader = true;
                }
                // 支持模糊匹配（如"姓名"或"学生姓名"）
                if (possibleHeaders.some(header => cellValue.includes(header))) {
                    headerCount++;
                }
            }
        }
        
        // 如果找到2个或更多可能的列标题，并且包含姓名列，则认为是列式格式
        if (headerCount >= 2 && hasNameHeader) {
            isColumnFormat = true;
        } else {
            // 如果没有找到足够的列标题，或者没有姓名列，尝试以行式格式解析
            isColumnFormat = false;
        }
        
        // 先尝试列式格式解析
        if (isColumnFormat) {
            // 列式格式解析
            // 先获取列标题的位置
            const headers = {};
            
            // 检查是否是特定的表头顺序：姓名，学号，楼层，分组
            const specificHeaders = ['姓名', '学号', '楼层', '分组'];
            let isSpecificFormat = true;
            
            // 检查前4列是否符合特定顺序
            for (let C = 0; C < Math.min(4, range.e.c + 1); C++) {
                const cell = firstSheet[XLSX.utils.encode_cell({r: firstRow, c: C})];
                if (cell && cell.v) {
                    const header = String(cell.v).trim();
                    const expectedHeader = specificHeaders[C];
                    
                    if (expectedHeader === '姓名' && !(header.includes('姓名') || header.includes('名字') || header.includes('名称') || header.includes('学生') || header.includes('成员'))) {
                        isSpecificFormat = false;
                        break;
                    } else if (expectedHeader === '学号' && !(header.includes('学号') || header.includes('ID') || header.includes('编号') || header.includes('工号'))) {
                        isSpecificFormat = false;
                        break;
                    } else if (expectedHeader === '楼层' && !(header.includes('楼层') || header.includes('层') || header.includes('楼'))) {
                        isSpecificFormat = false;
                        break;
                    } else if (expectedHeader === '分组' && !(header.includes('分组') || header.includes('组') || header.includes('团队'))) {
                        isSpecificFormat = false;
                        break;
                    }
                } else {
                    isSpecificFormat = false;
                    break;
                }
            }
            
            if (isSpecificFormat) {
                // 如果是特定格式，直接使用前4列作为对应字段
                headers['姓名'] = 0;
                headers['学号'] = 1;
                headers['楼层'] = 2;
                headers['分组'] = 3;
            } else {
                // 否则使用原来的模糊匹配方法
                for (let C = 0; C <= range.e.c; C++) {
                    const cell = firstSheet[XLSX.utils.encode_cell({r: firstRow, c: C})];
                    if (cell && cell.v) {
                        const header = String(cell.v).trim();
                        // 支持模糊匹配，增加对更多姓名相关标题的识别
                        if (header.includes('姓名') || header.includes('名字') || header.includes('名称') || header.includes('学生') || header.includes('成员')) {
                            headers['姓名'] = C;
                        }
                        if (header.includes('学号') || header.includes('ID') || header.includes('编号') || header.includes('工号')) {
                            headers['学号'] = C;
                        }
                        if (header.includes('楼层') || header.includes('层') || header.includes('楼')) {
                            headers['楼层'] = C;
                        }
                        if (header.includes('分组') || header.includes('组') || header.includes('团队')) {
                            headers['分组'] = C;
                        }
                    }
                }
            }
            
            // 确保姓名列存在
            if (headers['姓名'] !== undefined) {
                // 遍历数据行（从第二行开始）
                for (let R = firstRow + 1; R <= range.e.r; R++) {
                    const nameCell = firstSheet[XLSX.utils.encode_cell({r: R, c: headers['姓名']})];
                    if (nameCell && nameCell.v) {
                        const name = String(nameCell.v).trim();
                        if (name) {
                            // 获取学号（如果有）
                            let id = '';
                            if (headers['学号']) {
                                const idCell = firstSheet[XLSX.utils.encode_cell({r: R, c: headers['学号']})];
                                if (idCell && idCell.v) {
                                    id = String(idCell.v).trim();
                                }
                            }
                            
                            // 获取楼层（如果有）
                            let floor = '';
                            if (headers['楼层']) {
                                const floorCell = firstSheet[XLSX.utils.encode_cell({r: R, c: headers['楼层']})];
                                if (floorCell && floorCell.v) {
                                    floor = String(floorCell.v).trim();
                                }
                            }
                            
                            // 获取分组（如果有）
                            let group = '';
                            if (headers['分组']) {
                                const groupCell = firstSheet[XLSX.utils.encode_cell({r: R, c: headers['分组']})];
                                if (groupCell && groupCell.v) {
                                    group = String(groupCell.v).trim();
                                }
                            }
                            
                            // 如果没有ID，生成临时ID
                            if (!id) {
                                id = `temp_${R}_${headers['姓名']}`;
                            }
                            
                            // 如果没有楼层信息，尝试从分组名称中提取
                            if (!floor && group) {
                                floor = extractFloorFromGroupName(group);
                            }
                            
                            members.push({ 
                                name, 
                                id, 
                                group, 
                                floor 
                            });
                        }
                    }
                }
            } else {
                // 如果没有找到姓名列，重置成员列表并尝试行式格式解析
                members.length = 0;
                isColumnFormat = false;
            }
        }
        
        // 如果列式格式解析失败或没有数据，尝试行式格式解析
        if (!isColumnFormat || members.length === 0) {
            // 行式格式解析
            // 遍历每一行
            for (let R = range.s.r; R <= range.e.r; R++) {
                // 获取楼层（第一列）和分组（第二列）
                const floorCell = firstSheet[XLSX.utils.encode_cell({r: R, c: 0})];
                const groupCell = firstSheet[XLSX.utils.encode_cell({r: R, c: 1})];
                
                // 检查是否是有效的楼层/分组行
                if (groupCell && groupCell.v) {
                    let floor = '';
                    let group = String(groupCell.v).trim();
                    
                    // 如果第一列有值，作为楼层
                    if (floorCell && floorCell.v) {
                        floor = String(floorCell.v).trim();
                    } else {
                        // 从分组名称中提取楼层信息
                        floor = extractFloorFromGroupName(group);
                    }
                    
                    // 从第三列开始提取成员姓名
                    for (let C = 2; C <= range.e.c; C++) {
                        const nameCell = firstSheet[XLSX.utils.encode_cell({r: R, c: C})];
                        if (nameCell && nameCell.v) {
                            const name = String(nameCell.v).trim();
                            if (name) { // 确保姓名不为空
                                // 生成临时ID
                                const id = `temp_${R}_${C}`;
                                
                                members.push({ 
                                    name, 
                                    id, 
                                    group, 
                                    floor 
                                });
                            }
                        }
                    }
                }
            }
        }
        
        if (members.length > 0) {
            addMembersFromData(members);
        } else {
            alert('未找到有效的成员数据，请检查Excel文件格式是否正确。');
        }
    };
    reader.readAsArrayBuffer(file);
}

// 批量添加成员
function addMembersFromData(membersData) {
    // 检查权限：只有管理员才能添加成员
    if (currentRole !== 'admin') {
        alert('只有管理员才能添加成员');
        return;
    }
    
    if (membersData.length === 0) {
        alert('未找到有效的成员数据');
        return;
    }
    
    const existingMembers = JSON.parse(localStorage.getItem('members') || '[]');
    const existingIds = new Set(existingMembers.map(m => m.id));
    
    const newMembers = membersData.filter(m => !existingIds.has(m.id));
    
    if (newMembers.length === 0) {
        alert('所有成员已存在');
        return;
    }
    
    // 处理分组信息，确保所有分组存在
    const existingGroups = JSON.parse(localStorage.getItem('groups') || '[]');
    const existingGroupNames = new Set(existingGroups.map(g => g.name));
    const newGroups = [];
    
    newMembers.forEach(member => {
        if (member.group && member.group !== '' && !existingGroupNames.has(member.group)) {
            // 从分组名称中提取楼层信息（如果有的话）
        let floor = extractFloorFromGroupName(member.group);
        // 如果提取失败，使用默认楼层
        if (!floor) {
            floor = '1'; // 默认楼层
        }
            
            newGroups.push({ name: member.group, floor, leader: '' });
            existingGroupNames.add(member.group);
        }
    });
    
    // 添加新分组
    if (newGroups.length > 0) {
        const updatedGroups = [...existingGroups, ...newGroups];
        localStorage.setItem('groups', JSON.stringify(updatedGroups));
        
        // 更新分组下拉列表
        updateGroupDropdown();
        updateGroupLeaderDropdown();
    }
    
    const membersToAdd = newMembers.map(m => ({ ...m, hours: 0 }));
    const updatedMembers = [...existingMembers, ...membersToAdd];
    localStorage.setItem('members', JSON.stringify(updatedMembers));
    
    // 更新签到记录
    membersToAdd.forEach(member => {
        updateAttendanceForNewMember(member);
    });
    
    loadMembersData();
    loadAttendanceData();
    loadGroups();
    
    let message = `成功添加${newMembers.length}名成员`;
    if (newGroups.length > 0) {
        message += `，创建了${newGroups.length}个新分组`;
    }
    alert(message);
}

// 导出数据
function exportData() {
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    
    if (!startDate || !endDate) {
        alert('请选择日期范围');
        return;
    }
    
    let members = JSON.parse(localStorage.getItem('members') || '[]');
    const groups = JSON.parse(localStorage.getItem('groups') || '[]');
    
    // 过滤数据：如果是负责人，只显示自己负责的分组
    if (currentRole === 'leader') {
        const leaderGroups = groups.filter(group => group.leader === currentUser);
        const groupNames = leaderGroups.map(group => group.name);
        members = members.filter(member => member.group && groupNames.includes(member.group));
    }
    
    // 应用筛选条件
    const filterFloor = document.getElementById('statistics-filter-floor').value;
    const filterGroup = document.getElementById('statistics-filter-group').value;
    
    if (filterFloor) {
        // 先获取该楼层的所有分组
        const floorGroups = groups.filter(group => group.floor === filterFloor).map(group => group.name);
        // 过滤成员：属于该楼层的分组
        members = members.filter(member => member.group && floorGroups.includes(member.group));
    }
    
    if (filterGroup) {
        // 过滤成员：属于该分组
        members = members.filter(member => member.group === filterGroup);
    }
    
    const attendance = JSON.parse(localStorage.getItem('attendance') || '{}');
    
    // 按楼层和分组排序成员
    members.sort((a, b) => {
        // 先按楼层排序
        const floorA = a.floor || getGroupFloor(a.group) || '';
        const floorB = b.floor || getGroupFloor(b.group) || '';
        
        if (floorA && floorB) {
            const floorNumA = parseInt(floorA.replace(/[^\d]/g, '')) || 0;
            const floorNumB = parseInt(floorB.replace(/[^\d]/g, '')) || 0;
            if (floorNumA !== floorNumB) {
                return floorNumA - floorNumB;
            }
        } else if (floorA) {
            return -1;
        } else if (floorB) {
            return 1;
        }
        
        // 再按分组排序
        if (a.group && b.group) {
            return a.group.localeCompare(b.group);
        }
        return 0;
    });
    
    // 辅助函数：根据分组获取楼层
    function getGroupFloor(groupName) {
        if (!groupName) return '';
        const groups = JSON.parse(localStorage.getItem('groups') || '[]');
        const group = groups.find(g => g.name === groupName);
        return group ? group.floor : '';
    }
    
    let csvContent = '姓名,学号/ID,总课时';
    
    // 获取日期范围
    const dates = Object.keys(attendance).filter(date => {
        return date >= startDate && date <= endDate;
    }).sort();
    
    // 添加日期列
    dates.forEach(date => {
        csvContent += `,${date}`;
    });
    csvContent += '\n';
    
    // 添加成员数据
    members.forEach(member => {
        let row = `${member.name},${member.id},${calculateMemberHours(member.id)}`;
        
        dates.forEach(date => {
            const status = attendance[date]?.[member.id] || 'absent';
            row += `,${status === 'present' ? '签到' : status === 'leave' ? '请假' : '旷课'}`;
        });
        
        csvContent += row + '\n';
    });
    
    // 下载CSV文件
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `签到记录_${startDate}_${endDate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// 生成今日总结
function generateSummary() {
    const today = new Date().toISOString().split('T')[0];
    const attendance = JSON.parse(localStorage.getItem('attendance') || '{}');
    let members = JSON.parse(localStorage.getItem('members') || '[]');
    const groups = JSON.parse(localStorage.getItem('groups') || '[]');
    
    // 过滤数据：如果是负责人，只显示自己负责的分组
    if (currentRole === 'leader') {
        const leaderGroups = groups.filter(group => group.leader === currentUser);
        const groupNames = leaderGroups.map(group => group.name);
        members = members.filter(member => member.group && groupNames.includes(member.group));
    }
    
    // 应用筛选条件
    const filterFloor = document.getElementById('statistics-filter-floor').value;
    const filterGroup = document.getElementById('statistics-filter-group').value;
    
    if (filterFloor) {
        // 先获取该楼层的所有分组
        const floorGroups = groups.filter(group => group.floor === filterFloor).map(group => group.name);
        // 过滤成员：属于该楼层的分组
        members = members.filter(member => member.group && floorGroups.includes(member.group));
    }
    
    if (filterGroup) {
        // 过滤成员：属于该分组
        members = members.filter(member => member.group === filterGroup);
    }
    
    // 按楼层和分组排序成员
    members.sort((a, b) => {
        // 先按楼层排序
        const floorA = a.floor || getGroupFloor(a.group) || '';
        const floorB = b.floor || getGroupFloor(b.group) || '';
        
        if (floorA && floorB) {
            const floorNumA = parseInt(floorA.replace(/[^\d]/g, '')) || 0;
            const floorNumB = parseInt(floorB.replace(/[^\d]/g, '')) || 0;
            if (floorNumA !== floorNumB) {
                return floorNumA - floorNumB;
            }
        } else if (floorA) {
            return -1;
        } else if (floorB) {
            return 1;
        }
        
        // 再按分组排序
        if (a.group && b.group) {
            return a.group.localeCompare(b.group);
        }
        return 0;
    });
    
    // 辅助函数：根据分组获取楼层
    function getGroupFloor(groupName) {
        if (!groupName) return '';
        const groups = JSON.parse(localStorage.getItem('groups') || '[]');
        const group = groups.find(g => g.name === groupName);
        return group ? group.floor : '';
    }
    
    const todayAttendance = attendance[today] || {};
    let present = 0, leave = 0, absent = 0;
    
    members.forEach(member => {
        const status = todayAttendance[member.id] || 'absent';
        switch (status) {
            case 'present': present++; break;
            case 'leave': leave++; break;
            case 'absent': absent++; break;
        }
    });
    
    // 生成成员列表HTML，每5个成员换行
    function generateMemberList(membersList) {
        if (!membersList.length) return '<p>无</p>';
        
        let html = '<div class="member-list">';
        let count = 0;
        
        membersList.forEach(member => {
            html += `<span class="member-item">${member.name} (${member.id})</span>`;
            count++;
            if (count % 5 === 0) {
                html += '<br>';
            }
        });
        
        html += '</div>';
        return html;
    }
    
    // 获取不同状态的成员
    const presentMembers = members.filter(m => todayAttendance[m.id] === 'present');
    const leaveMembers = members.filter(m => todayAttendance[m.id] === 'leave');
    const absentMembers = members.filter(m => !todayAttendance[m.id] || todayAttendance[m.id] === 'absent');
    
    // 生成HTML格式的总结
    const summaryHTML = `
        <div class="summary-container">
            <h3>今日签到总结 (${today})</h3>
            <div class="summary-stats">
                <div class="stat-item">
                    <span class="stat-label">总人数：</span>
                    <span class="stat-value">${members.length}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">签到人数：</span>
                    <span class="stat-value present">${present}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">请假人数：</span>
                    <span class="stat-value leave">${leave}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">旷课人数：</span>
                    <span class="stat-value absent">${absent}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">出勤率：</span>
                    <span class="stat-value">${((present / members.length) * 100).toFixed(1)}%</span>
                </div>
            </div>
            
            <div class="summary-details">
                <h4>详细记录</h4>
                
                <div class="detail-section">
                    <h5>签到成员</h5>
                    ${generateMemberList(presentMembers)}
                </div>
                
                <div class="detail-section">
                    <h5>请假成员</h5>
                    ${generateMemberList(leaveMembers)}
                </div>
                
                <div class="detail-section">
                    <h5>旷课成员</h5>
                    ${generateMemberList(absentMembers)}
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('statistics-result').innerHTML = summaryHTML;
}

// 设置签到文件上传
function setupAttendanceFileUpload() {
    const dropArea = document.getElementById('attendance-import-area');
    const fileInput = document.getElementById('attendance-file-input');
    const browseBtn = document.getElementById('attendance-browse-btn');
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
    });
    
    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, highlightAttendance, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, unhighlightAttendance, false);
    });
    
    dropArea.addEventListener('drop', handleAttendanceDrop, false);
    browseBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleAttendanceFiles, false);
}

// 签到文件上传辅助函数
function highlightAttendance() {
    document.getElementById('attendance-import-area').classList.add('drag-over');
}

function unhighlightAttendance() {
    document.getElementById('attendance-import-area').classList.remove('drag-over');
}

function handleAttendanceDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    handleAttendanceFiles({ target: { files } });
}

function handleAttendanceFiles(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const fileName = file.name;
    if (fileName.endsWith('.csv')) {
        parseAttendanceCSV(file);
    } else if (fileName.endsWith('.xlsx')) {
        parseAttendanceExcel(file);
    } else {
        alert('请上传CSV或Excel文件');
    }
}

// 解析签到CSV文件
function parseAttendanceCSV(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const text = e.target.result;
        const lines = text.split('\n');
        const attendanceData = [];
        
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            const [name, id, status] = line.split(',').map(item => item.trim());
            if (name && id && status) {
                attendanceData.push({ name, id, status });
            }
        }
        
        importAttendanceData(attendanceData);
    };
    reader.readAsText(file);
}

// 解析签到Excel文件
function parseAttendanceExcel(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet);
        
        const attendanceData = jsonData.map(row => {
            const name = row['姓名'] || row['name'] || row[Object.keys(row)[0]];
            const id = row['学号/ID'] || row['学号'] || row['ID'] || row['id'] || row[Object.keys(row)[1]];
            const status = row['签到状态'] || row['状态'] || row['status'] || row[Object.keys(row)[2]];
            return { 
                name: String(name).trim(), 
                id: String(id).trim(), 
                status: String(status).trim().toLowerCase() 
            };
        }).filter(item => item.name && item.id && item.status);
        
        importAttendanceData(attendanceData);
    };
    reader.readAsArrayBuffer(file);
}

// 导入签到数据
function importAttendanceData(attendanceData) {
    if (attendanceData.length === 0) {
        alert('未找到有效的签到数据');
        return;
    }
    
    let members = JSON.parse(localStorage.getItem('members') || '[]');
    const groups = JSON.parse(localStorage.getItem('groups') || '[]');
    const date = document.getElementById('attendance-date').value;
    const attendance = JSON.parse(localStorage.getItem('attendance') || '{}');
    
    // 过滤数据：如果是负责人，只显示自己负责的分组
    if (currentRole === 'leader') {
        const leaderGroups = groups.filter(group => group.leader === currentUser);
        const groupNames = leaderGroups.map(group => group.name);
        members = members.filter(member => member.group && groupNames.includes(member.group));
    }
    
    if (!attendance[date]) {
        attendance[date] = {};
    }
    
    let importedCount = 0;
    let notFoundCount = 0;
    
    attendanceData.forEach(item => {
        // 查找对应的成员
        const member = members.find(m => m.id === item.id || m.name === item.name);
        
        if (member) {
            // 标准化状态
            let normalizedStatus = 'absent';
            if (item.status.includes('签到') || item.status.includes('present') || item.status.includes('attend')) {
                normalizedStatus = 'present';
            } else if (item.status.includes('请假') || item.status.includes('leave')) {
                normalizedStatus = 'leave';
            } else if (item.status.includes('旷课') || item.status.includes('absent')) {
                normalizedStatus = 'absent';
            }
            
            attendance[date][member.id] = normalizedStatus;
            importedCount++;
        } else {
            notFoundCount++;
        }
    });
    
    // 保存签到数据
    localStorage.setItem('attendance', JSON.stringify(attendance));
    
    // 更新成员课时
    members.forEach(member => {
        updateMemberHours(member.id);
    });
    
    // 重新加载签到数据
    loadAttendanceData();
    
    // 更新仪表盘数据
    if (date === new Date().toISOString().split('T')[0]) {
        loadDashboardData();
    }
    
    alert(`成功导入${importedCount}条签到记录，${notFoundCount}条记录未找到对应的成员`);
}

// 一键删除所有人
function deleteAllMembers() {
    if (!confirm('确定要删除所有成员吗？此操作不可恢复！')) {
        return;
    }
    
    // 清空成员数据
    localStorage.setItem('members', JSON.stringify([]));
    
    // 清空签到数据
    localStorage.setItem('attendance', JSON.stringify({}));
    
    // 重新加载数据
    loadMembersData();
    loadAttendanceData();
    loadDashboardData();
    
    alert('已成功删除所有成员及其签到记录');
}

// 搜索成员
function searchMembers() {
    const searchTerm = document.getElementById('search-members').value.trim().toLowerCase();
    let members = JSON.parse(localStorage.getItem('members') || '[]');
    const groups = JSON.parse(localStorage.getItem('groups') || '[]');
    const tbody = document.getElementById('members-list');
    
    // 过滤数据：如果是负责人，只显示自己负责的分组
    if (currentRole === 'leader') {
        const leaderGroups = groups.filter(group => group.leader === currentUser);
        const groupNames = leaderGroups.map(group => group.name);
        members = members.filter(member => member.group && groupNames.includes(member.group));
    }
    
    tbody.innerHTML = '';
    
    const filteredMembers = searchTerm ? 
        members.filter(member => 
            member.name.toLowerCase().includes(searchTerm) || 
            member.id.toLowerCase().includes(searchTerm) ||
            (member.group && member.group.toLowerCase().includes(searchTerm))
        ) : 
        members;
    
    filteredMembers.forEach(member => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${member.name}</td>
            <td>${member.id}</td>
            <td>${member.group || '未分组'}</td>
            <td>${calculateMemberHours(member.id)}</td>
            <td><button class="delete-btn" onclick="deleteMember('${member.id}')">删除</button></td>
        `;
        tbody.appendChild(row);
    });
}
