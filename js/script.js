// 全局变量
let currentUser = null;
let currentRole = null;
let currentMemberId = null;

// Supabase配置
const supabaseUrl = 'https://pqwgqxbpwcektohqhsjz.supabase.co';
const supabaseKey = 'sb_publishable_E3dOWJHt419QJAU693HVAA_j2dsh7v3';

// 创建Supabase客户端
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

// 初始化数据
async function initData() {
    try {
        // 检查默认管理员用户是否存在
        const { data: adminData, error: adminError } = await supabase
            .from('users')
            .select('*')
            .eq('username', '赵广仁')
            .single();

        if (adminError && adminError.code !== 'PGRST116') { // PGRST116表示没有找到记录
            console.error('检查管理员用户时出错:', adminError);
            return;
        }

        // 如果管理员用户不存在，创建它
        if (!adminData) {
            const { error: insertAdminError } = await supabase
                .from('users')
                .insert([
                    { username: '赵广仁', password: '081209', role: 'admin', name: '管理员' }
                ]);

            if (insertAdminError) {
                console.error('创建管理员用户时出错:', insertAdminError);
            }
        }

        // 检查默认负责人用户是否存在
        const { data: leaderData, error: leaderError } = await supabase
            .from('users')
            .select('*')
            .eq('username', '负责人')
            .single();

        if (leaderError && leaderError.code !== 'PGRST116') {
            console.error('检查负责人用户时出错:', leaderError);
            return;
        }

        // 如果负责人用户不存在，创建它
        if (!leaderData) {
            const { error: insertLeaderError } = await supabase
                .from('users')
                .insert([
                    { username: '负责人', password: 'leader123', role: 'leader', name: '负责人' }
                ]);

            if (insertLeaderError) {
                console.error('创建负责人用户时出错:', insertLeaderError);
            }
        }
    } catch (error) {
        console.error('初始化数据时出错:', error);
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', async function() {
    await initData();
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
async function saveGroup() {
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
    
    try {
        // 检查分组是否已存在
        const { data: existingGroup, error: checkError } = await supabase
            .from('groups')
            .select('*')
            .eq('name', name)
            .single();
        
        if (existingGroup) {
            alert('该分组名称已存在');
            return;
        }
        
        // 添加新分组
        const newGroup = { name, floor, leader: leader || '' };
        const { error: insertError } = await supabase
            .from('groups')
            .insert([newGroup]);
        
        if (insertError) {
            console.error('添加分组时出错:', insertError);
            alert('添加分组失败，请稍后重试');
            return;
        }
        
        await loadGroups();
        hideAddGroupForm();
        
        // 更新成员表单中的分组下拉列表
        await updateGroupDropdown();
    } catch (error) {
        console.error('保存分组时出错:', error);
        alert('保存分组失败，请稍后重试');
    }
}

// 显示删除分组表单
async function showDeleteGroupForm() {
    // 检查权限：只有管理员才能删除分组
    if (currentRole !== 'admin') {
        alert('只有管理员才能删除分组');
        return;
    }
    
    try {
        // 从Supabase获取分组列表
        const { data: groups, error: groupsError } = await supabase
            .from('groups')
            .select('*');
        
        if (groupsError) {
            console.error('获取分组列表时出错:', groupsError);
            alert('获取分组列表失败，请稍后重试');
            return;
        }
        
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
        
        (groups || []).forEach(group => {
            const option = document.createElement('option');
            option.value = group.name;
            option.textContent = `${group.name} (${group.floor})`;
            select.appendChild(option);
        });
        
        // 显示表单
        document.getElementById('delete-group-form').classList.remove('hidden');
    } catch (error) {
        console.error('显示删除分组表单时出错:', error);
        alert('显示删除分组表单失败，请稍后重试');
    }
}

// 隐藏删除分组表单
function hideDeleteGroupForm() {
    const deleteForm = document.getElementById('delete-group-form');
    if (deleteForm) {
        deleteForm.classList.add('hidden');
    }
}

// 删除分组
async function deleteGroup() {
    const groupName = document.getElementById('delete-group-select').value;
    
    if (!groupName) {
        alert('请选择要删除的分组');
        return;
    }
    
    if (!confirm(`确定要删除分组"${groupName}"吗？`)) {
        return;
    }
    
    try {
        // 获取要删除的分组信息
        const { data: groupToDelete, error: groupError } = await supabase
            .from('groups')
            .select('*')
            .eq('name', groupName)
            .single();
        
        if (groupError || !groupToDelete) {
            alert('分组不存在');
            return;
        }
        
        const groupFloor = groupToDelete.floor;
        
        // 检查是否还有其他分组使用相同的楼层
        const { data: otherGroups, error: otherGroupsError } = await supabase
            .from('groups')
            .select('*')
            .eq('floor', groupFloor)
            .neq('name', groupName);
        
        if (otherGroupsError) {
            console.error('检查其他分组时出错:', otherGroupsError);
            alert('删除分组失败，请稍后重试');
            return;
        }
        
        const hasOtherGroupWithSameFloor = (otherGroups || []).length > 0;
        
        // 删除分组
        const { error: deleteGroupError } = await supabase
            .from('groups')
            .delete()
            .eq('name', groupName);
        
        if (deleteGroupError) {
            console.error('删除分组时出错:', deleteGroupError);
            alert('删除分组失败，请稍后重试');
            return;
        }
        
        // 更新成员数据，将属于该分组的成员设为未分组
        const { error: updateMembersError } = await supabase
            .from('members')
            .update({ group: '' })
            .eq('group', groupName);
        
        if (updateMembersError) {
            console.error('更新成员分组信息时出错:', updateMembersError);
            alert('删除分组失败，请稍后重试');
            return;
        }
        
        // 如果没有其他分组使用该楼层，清除该楼层所有成员的楼层信息
        if (!hasOtherGroupWithSameFloor) {
            const { error: clearFloorError } = await supabase
                .from('members')
                .update({ floor: '' })
                .eq('floor', groupFloor);
            
            if (clearFloorError) {
                console.error('清除成员楼层信息时出错:', clearFloorError);
                // 这里不返回，因为主要的分组删除已经完成
            }
        }
        
        // 更新界面
        await loadGroups();
        await loadMembersData();
        hideDeleteGroupForm();
        
        // 更新下拉列表和筛选器
        await updateGroupDropdown();
        await updateGroupFilter();
        await updateStatisticsGroupFilter();
    } catch (error) {
        console.error('删除分组时出错:', error);
        alert('删除分组失败，请稍后重试');
    }
}

// 一键删除所有分组
async function deleteAllGroups() {
    if (!confirm("确定要删除所有分组吗？此操作不可恢复！")) {
        return;
    }
    
    try {
        // 删除所有分组
        const { error: deleteGroupsError } = await supabase
            .from('groups')
            .delete();
        
        if (deleteGroupsError) {
            console.error('删除所有分组时出错:', deleteGroupsError);
            alert('删除分组失败，请稍后重试');
            return;
        }
        
        // 更新所有成员，设为未分组并清除楼层信息
        const { error: updateMembersError } = await supabase
            .from('members')
            .update({ group: '', floor: '' });
        
        if (updateMembersError) {
            console.error('更新成员信息时出错:', updateMembersError);
            alert('删除分组失败，请稍后重试');
            return;
        }
        
        // 更新界面
        await loadGroups();
        await loadMembersData();
        await updateGroupDropdown();
        await updateGroupFilter();
        await updateStatisticsGroupFilter();
        
        alert("所有分组和楼层信息已成功删除");
    } catch (error) {
        console.error('一键删除所有分组时出错:', error);
        alert('删除分组失败，请稍后重试');
    }
}

// 加载分组
async function loadGroups() {
    try {
        // 更新成员表单中的分组下拉列表
        await updateGroupDropdown();
        
        // 更新分组表单中的负责人下拉列表
        await updateGroupLeaderDropdown();
    } catch (error) {
        console.error('加载分组时出错:', error);
    }
}

// 更新成员表单中的分组下拉列表
async function updateGroupDropdown() {
    try {
        // 从Supabase获取分组列表
        const { data: groups, error: groupsError } = await supabase
            .from('groups')
            .select('*');
        
        if (groupsError) {
            console.error('获取分组列表时出错:', groupsError);
            return;
        }
        
        const select = document.getElementById('new-member-group');
        
        // 保存当前选中的值
        const currentValue = select.value;
        
        // 清空下拉列表
        select.innerHTML = '<option value="">未分组</option>';
        
        // 添加分组选项
        (groups || []).forEach(group => {
            const option = document.createElement('option');
            option.value = group.name;
            option.textContent = group.name;
            select.appendChild(option);
        });
        
        // 恢复当前选中的值
        select.value = currentValue;
    } catch (error) {
        console.error('更新分组下拉列表时出错:', error);
    }
}

// 更新分组表单中的负责人下拉列表
async function updateGroupLeaderDropdown() {
    try {
        // 从Supabase获取负责人列表
        const { data: leaders, error: leadersError } = await supabase
            .from('users')
            .select('*')
            .eq('role', 'leader');
        
        if (leadersError) {
            console.error('获取负责人列表时出错:', leadersError);
            return;
        }
        
        const select = document.getElementById('new-group-leader');
        
        // 保存当前选中的值
        const currentValue = select.value;
        
        // 清空下拉列表
        select.innerHTML = '<option value="">无</option>';
        
        // 添加负责人选项
        (leaders || []).forEach(leader => {
            const option = document.createElement('option');
            option.value = leader.username;
            option.textContent = leader.name;
            select.appendChild(option);
        });
        
        // 恢复当前选中的值
        select.value = currentValue;
    } catch (error) {
        console.error('更新负责人下拉列表时出错:', error);
    }
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
async function handleLogin() {
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
    
    try {
        if (role === 'member') {
            // 查询成员信息
            const { data: members, error: memberError } = await supabase
                .from('members')
                .select('*')
                .eq('name', username)
                .single();
            
            if (memberError || !members) {
                errorDiv.textContent = '成员不存在';
                return;
            }
            
            currentUser = username;
            currentRole = 'member';
            currentMemberId = members.id;
        } else {
            // 查询管理员或负责人信息
            const { data: users, error: userError } = await supabase
                .from('users')
                .select('*')
                .eq('username', username)
                .single();
            
            if (userError || !users || users.password !== password || users.role !== role) {
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
    } catch (error) {
        console.error('登录时出错:', error);
        errorDiv.textContent = '登录时发生错误，请稍后重试';
    }
}

// 显示主页面
async function showMainPage() {
    document.getElementById('login-page').style.display = 'none';
    document.getElementById('main-page').style.display = 'block';
    document.getElementById('current-user').textContent = `欢迎, ${currentUser}`;
    
    checkRoleVisibility();
    await loadDashboardData();
    await loadMembersData();
    await loadAttendanceData();
    await loadMemberInfo();
    await loadGroups();
    loadLeaders();
    await initFilters();
    
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
async function switchPage(pageName) {
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.content').forEach(content => content.classList.remove('active'));
    
    document.querySelector(`[data-page="${pageName}"]`).classList.add('active');
    document.getElementById(pageName).classList.add('active');
    
    if (pageName === 'member-info' && currentRole === 'member') {
        loadMemberInfo();
    } else if (pageName === 'members') {
        await initFilters();
        await loadMembersData();
    } else if (pageName === 'statistics') {
        await updateStatisticsGroupFilter();
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
async function saveMember() {
    const name = document.getElementById('new-member-name').value.trim();
    const id = document.getElementById('new-member-id').value.trim();
    const group = document.getElementById('new-member-group').value;
    const floor = document.getElementById('new-member-floor').value;
    
    if (!name || !id) {
        alert('请填写完整信息');
        return;
    }
    
    try {
        // 检查成员是否已存在
        const { data: existingMember, error: checkError } = await supabase
            .from('members')
            .select('*')
            .eq('id', id)
            .single();
        
        if (existingMember) {
            alert('该学号/ID已存在');
            return;
        }
        
        // 创建新成员
        const newMember = { id, name, hours: 0, group: group || '', floor: floor || '' };
        const { error: insertError } = await supabase
            .from('members')
            .insert([newMember]);
        
        if (insertError) {
            console.error('添加成员时出错:', insertError);
            alert('添加成员失败，请稍后重试');
            return;
        }
        
        loadMembersData();
        hideAddMemberForm();
        
        // 添加到签到记录
        updateAttendanceForNewMember(newMember);
    } catch (error) {
        console.error('保存成员时出错:', error);
        alert('保存成员失败，请稍后重试');
    }
}

// 为新成员更新签到记录
async function updateAttendanceForNewMember(member) {
    try {
        const today = new Date().toISOString().split('T')[0];
        
        // 检查今天的签到记录是否已存在
        const { data: existingRecord, error: checkError } = await supabase
            .from('attendance')
            .select('*')
            .eq('member_id', member.id)
            .eq('date', today)
            .single();
        
        if (checkError && checkError.code !== 'PGRST116') { // PGRST116表示没有找到记录
            console.error('检查签到记录时出错:', checkError);
            return;
        }
        
        // 如果记录不存在，创建新记录
        if (!existingRecord) {
            const { error: insertError } = await supabase
                .from('attendance')
                .insert([{ member_id: member.id, date: today, status: 'absent' }]);
            
            if (insertError) {
                console.error('为新成员添加签到记录时出错:', insertError);
            }
        }
    } catch (error) {
        console.error('为新成员更新签到记录时出错:', error);
    }
}

// 加载成员数据
async function loadMembersData() {
    try {
        // 从Supabase加载成员数据
        const { data: members, error: membersError } = await supabase
            .from('members')
            .select('*');
        
        if (membersError) {
            console.error('加载成员数据时出错:', membersError);
            return;
        }
        
        // 从Supabase加载分组数据
        const { data: groups, error: groupsError } = await supabase
            .from('groups')
            .select('*');
        
        if (groupsError) {
            console.error('加载分组数据时出错:', groupsError);
            return;
        }
        
        // 从Supabase加载用户数据
        const { data: users, error: usersError } = await supabase
            .from('users')
            .select('*');
        
        if (usersError) {
            console.error('加载用户数据时出错:', usersError);
            return;
        }
        
        // 将数组转换为对象，以便与原有代码兼容
        const usersObj = {};
        users.forEach(user => {
            usersObj[user.username] = user;
        });
        
        const tbody = document.getElementById('members-list');
        
        // 过滤数据：如果是负责人，只显示自己负责的分组
        let filteredMembers = members;
        if (currentRole === 'leader') {
            const user = usersObj[currentUser];
            const managedFloors = user.managedFloors || [];
            const leaderGroups = groups.filter(group => managedFloors.includes(group.floor));
            const groupNames = leaderGroups.map(group => group.name);
            filteredMembers = members.filter(member => member.group && groupNames.includes(member.group));
        }
        
        // 应用筛选
        filteredMembers = applyFilters(filteredMembers, groups);
        
        tbody.innerHTML = '';
        
        filteredMembers.forEach(member => {
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
    } catch (error) {
        console.error('加载成员数据时出错:', error);
    }
}

// 初始化筛选器
async function initFilters() {
    try {
        const filterFloor = document.getElementById('filter-floor');
        
        // 从Supabase加载分组数据
        const { data: groups, error: groupsError } = await supabase
            .from('groups')
            .select('*');
        
        if (groupsError) {
            console.error('加载分组数据时出错:', groupsError);
            return;
        }
        
        // 获取所有唯一的楼层
        const floors = [...new Set(groups.map(group => group.floor).filter(Boolean))].sort();
        
        // 清空并添加楼层选项
        filterFloor.innerHTML = '<option value="">所有楼层</option>';
        floors.forEach(floor => {
            filterFloor.appendChild(new Option(floor, floor));
        });
        
        // 初始化分组筛选
        await updateGroupFilter();
    } catch (error) {
        console.error('初始化筛选器时出错:', error);
    }
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
async function updateGroupFilter() {
    try {
        const filterFloor = document.getElementById('filter-floor');
        const filterGroup = document.getElementById('filter-group');
        
        // 从Supabase加载分组数据
        const { data: groups, error: groupsError } = await supabase
            .from('groups')
            .select('*');
        
        if (groupsError) {
            console.error('加载分组数据时出错:', groupsError);
            return;
        }
        
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
        await loadMembersData();
    } catch (error) {
        console.error('更新分组筛选时出错:', error);
    }
}

// 清除筛选
async function clearFilters() {
    document.getElementById('filter-floor').value = '';
    document.getElementById('filter-group').value = '';
    document.getElementById('search-members').value = '';
    await updateGroupFilter();
    await loadMembersData();
}

// 更新统计页面的分组筛选选项
async function updateStatisticsGroupFilter() {
    try {
        const filterFloor = document.getElementById('statistics-filter-floor');
        const filterGroup = document.getElementById('statistics-filter-group');
        
        // 从Supabase加载分组数据
        const { data: groups, error: groupsError } = await supabase
            .from('groups')
            .select('*');
        
        if (groupsError) {
            console.error('加载分组数据时出错:', groupsError);
            return;
        }
        
        const selectedFloor = filterFloor.value;
        
        // 清空分组选项
        filterGroup.innerHTML = '<option value="">所有分组</option>';
        
        // 根据选择的楼层过滤分组
        let filteredGroups = groups || [];
        if (selectedFloor) {
            filteredGroups = filteredGroups.filter(group => group.floor === selectedFloor);
        }
        
        // 添加分组选项
        filteredGroups.forEach(group => {
            filterGroup.appendChild(new Option(group.name, group.name));
        });
    } catch (error) {
        console.error('更新统计页面分组筛选时出错:', error);
    }
}

// 清除统计页面筛选
async function clearStatisticsFilters() {
    document.getElementById('statistics-filter-floor').value = '';
    document.getElementById('statistics-filter-group').value = '';
    await updateStatisticsGroupFilter();
    generateSummary();
}

// 更新成员楼层
async function updateMemberFloor(memberId, floor) {
    if (currentRole !== 'admin') {
        alert('只有管理员才能修改成员楼层');
        return;
    }
    
    try {
        const { error: updateError } = await supabase
            .from('members')
            .update({ floor: floor || '' })
            .eq('id', memberId);
        
        if (updateError) {
            console.error('更新成员楼层时出错:', updateError);
            alert('更新成员楼层失败，请稍后重试');
            return;
        }
        
        await loadMembersData();
    } catch (error) {
        console.error('更新成员楼层时出错:', error);
        alert('更新成员楼层失败，请稍后重试');
    }
}

// 删除成员
async function deleteMember(memberId) {
    // 检查权限：负责人不能删除成员
    if (currentRole === 'leader') {
        alert('负责人没有权限删除成员');
        return;
    }
    
    if (confirm('确定要删除该成员吗？')) {
        try {
            // 从Supabase中删除成员
            const { error: deleteMemberError } = await supabase
                .from('members')
                .delete()
                .eq('id', memberId);
            
            if (deleteMemberError) {
                console.error('删除成员时出错:', deleteMemberError);
                alert('删除成员失败，请稍后重试');
                return;
            }
            
            // 从签到记录中删除
            const { error: deleteAttendanceError } = await supabase
                .from('attendance')
                .delete()
                .eq('member_id', memberId);
            
            if (deleteAttendanceError) {
                console.error('删除成员签到记录时出错:', deleteAttendanceError);
            }
            
            await loadMembersData();
            loadAttendanceData();
        } catch (error) {
            console.error('删除成员时出错:', error);
            alert('删除成员失败，请稍后重试');
        }
    }
}

// 加载签到数据
async function loadAttendanceData() {
    try {
        const date = document.getElementById('attendance-date').value;
        const tbody = document.getElementById('attendance-list');
        
        // 从Supabase获取成员数据
        const { data: members, error: membersError } = await supabase
            .from('members')
            .select('*');
        
        if (membersError) {
            console.error('加载成员数据时出错:', membersError);
            return;
        }
        
        // 从Supabase获取分组数据
        const { data: groups, error: groupsError } = await supabase
            .from('groups')
            .select('*');
        
        if (groupsError) {
            console.error('加载分组数据时出错:', groupsError);
            return;
        }
        
        // 从Supabase获取用户数据
        const { data: users, error: usersError } = await supabase
            .from('users')
            .select('*');
        
        if (usersError) {
            console.error('加载用户数据时出错:', usersError);
            return;
        }
        
        // 从Supabase获取签到数据
        const { data: attendanceRecords, error: attendanceError } = await supabase
            .from('attendance')
            .select('*')
            .eq('date', date);
        
        if (attendanceError) {
            console.error('加载签到数据时出错:', attendanceError);
            return;
        }
        
        // 将签到记录转换为与原代码兼容的格式
        const attendanceMap = {};
        attendanceRecords.forEach(record => {
            attendanceMap[record.member_id] = record.status;
        });
        
        // 将用户数组转换为对象，以便与原有代码兼容
        const usersObj = {};
        users.forEach(user => {
            usersObj[user.username] = user;
        });
        
        // 过滤数据：如果是负责人，只显示自己负责的分组
        let filteredMembers = members;
        if (currentRole === 'leader') {
            const user = usersObj[currentUser];
            const managedFloors = user.managedFloors || [];
            const leaderGroups = groups.filter(group => managedFloors.includes(group.floor));
            const groupNames = leaderGroups.map(group => group.name);
            filteredMembers = members.filter(member => member.group && groupNames.includes(member.group));
        }
        
        tbody.innerHTML = '';
        
        filteredMembers.forEach(member => {
            // 设置默认状态为absent
            const status = attendanceMap[member.id] || 'absent';
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${member.name}</td>
                <td>${member.id}</td>
                <td>
                    <select class="status-select" onchange="updateAttendance('${member.id}', this.value, '${date}')">
                        <option value="present" ${status === 'present' ? 'selected' : ''}>签到</option>
                        <option value="leave" ${status === 'leave' ? 'selected' : ''}>请假</option>
                        <option value="absent" ${status === 'absent' ? 'selected' : ''}>旷课</option>
                    </select>
                </td>
                <td><button onclick="resetAttendance('${member.id}', '${date}')">重置</button></td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('加载签到数据时出错:', error);
        alert('加载签到数据失败，请稍后重试');
    }
}

// 更新签到状态
async function updateAttendance(memberId, status, date) {
    try {
        // 检查签到记录是否已存在
        const { data: existingRecord, error: checkError } = await supabase
            .from('attendance')
            .select('*')
            .eq('member_id', memberId)
            .eq('date', date)
            .single();
        
        if (checkError && checkError.code !== 'PGRST116') { // PGRST116表示没有找到记录
            console.error('检查签到记录时出错:', checkError);
            return;
        }
        
        // 插入或更新签到记录
        if (existingRecord) {
            // 更新已有记录
            const { error: updateError } = await supabase
                .from('attendance')
                .update({ status })
                .eq('member_id', memberId)
                .eq('date', date);
            
            if (updateError) {
                console.error('更新签到记录时出错:', updateError);
                return;
            }
        } else {
            // 创建新记录
            const { error: insertError } = await supabase
                .from('attendance')
                .insert([{ member_id: memberId, date, status }]);
            
            if (insertError) {
                console.error('添加签到记录时出错:', insertError);
                return;
            }
        }
        
        // 更新成员课时
        await updateMemberHours(memberId);
        
        // 更新仪表盘数据
        if (date === new Date().toISOString().split('T')[0]) {
            await loadDashboardData();
        }
    } catch (error) {
        console.error('更新签到状态时出错:', error);
        alert('更新签到状态失败，请稍后重试');
    }
}

// 重置签到状态
async function resetAttendance(memberId, date) {
    await updateAttendance(memberId, 'absent', date);
}

// 更新成员课时
async function updateMemberHours(memberId) {
    try {
        // 计算课时数
        const hours = await calculateMemberHours(memberId);
        
        // 更新Supabase中的成员课时
        const { error: updateError } = await supabase
            .from('members')
            .update({ hours })
            .eq('id', memberId);
        
        if (updateError) {
            console.error('更新成员课时时出错:', updateError);
            return;
        }
    } catch (error) {
        console.error('更新成员课时时出错:', error);
    }
}

// 计算成员课时
async function calculateMemberHours(memberId) {
    try {
        // 从Supabase获取该成员的所有签到记录
        const { data: attendanceRecords, error: attendanceError } = await supabase
            .from('attendance')
            .select('*')
            .eq('member_id', memberId)
            .eq('status', 'present');
        
        if (attendanceError) {
            console.error('计算成员课时时出错:', attendanceError);
            return 0;
        }
        
        // 返回签到次数
        return attendanceRecords.length;
    } catch (error) {
        console.error('计算成员课时时出错:', error);
        return 0;
    }
}

// 加载仪表盘数据
async function loadDashboardData() {
    const today = new Date().toISOString().split('T')[0];
    
    try {
        // 从Supabase获取成员数据
        const { data: members, error: membersError } = await supabase
            .from('members')
            .select('*');
        
        if (membersError) {
            console.error('加载成员数据时出错:', membersError);
            return;
        }
        
        // 从Supabase获取分组数据
        const { data: groups, error: groupsError } = await supabase
            .from('groups')
            .select('*');
        
        if (groupsError) {
            console.error('加载分组数据时出错:', groupsError);
            return;
        }
        
        // 从Supabase获取用户数据
        const { data: users, error: usersError } = await supabase
            .from('users')
            .select('*');
        
        if (usersError) {
            console.error('加载用户数据时出错:', usersError);
            return;
        }
        
        // 从Supabase获取今日签到数据
        const { data: todayAttendanceRecords, error: attendanceError } = await supabase
            .from('attendance')
            .select('*')
            .eq('date', today);
        
        if (attendanceError) {
            console.error('加载签到数据时出错:', attendanceError);
            return;
        }
        
        // 将签到记录转换为与原代码兼容的格式
        const todayAttendance = {};
        todayAttendanceRecords.forEach(record => {
            todayAttendance[record.member_id] = record.status;
        });
        
        // 将用户数组转换为对象，以便与原有代码兼容
        const usersObj = {};
        users.forEach(user => {
            usersObj[user.username] = user;
        });
        
        // 过滤数据：如果是负责人，只显示自己负责的分组
        let filteredMembers = members;
        if (currentRole === 'leader') {
            const user = usersObj[currentUser];
            const managedFloors = user.managedFloors || [];
            const leaderGroups = groups.filter(group => managedFloors.includes(group.floor));
            const groupNames = leaderGroups.map(group => group.name);
            filteredMembers = members.filter(member => member.group && groupNames.includes(member.group));
        }
        
        let present = 0, leave = 0, absent = 0, totalHours = 0;
        
        filteredMembers.forEach(member => {
            const status = todayAttendance[member.id];
            if (status) {
                switch (status) {
                    case 'present': present++; break;
                    case 'leave': leave++; break;
                    case 'absent': absent++; break;
                }
            }
        });
        
        // 计算总课时
        for (const member of filteredMembers) {
            totalHours += await calculateMemberHours(member.id);
        }
        
        document.getElementById('today-attendance').textContent = present;
        document.getElementById('today-leave').textContent = leave;
        document.getElementById('today-absent').textContent = absent;
        document.getElementById('total-hours').textContent = totalHours;
    } catch (error) {
        console.error('加载仪表盘数据时出错:', error);
        alert('加载仪表盘数据失败，请稍后重试');
    }
}

// 加载个人信息
async function loadMemberInfo() {
    if (currentRole !== 'member') return;
    
    try {
        // 从Supabase获取成员数据
        const { data: member, error: memberError } = await supabase
            .from('members')
            .select('*')
            .eq('id', currentMemberId)
            .single();
        
        if (memberError) {
            console.error('加载成员数据时出错:', memberError);
            return;
        }
        
        if (member) {
            document.getElementById('member-name').textContent = member.name;
            document.getElementById('member-id').textContent = member.id;
            document.getElementById('member-hours').textContent = await calculateMemberHours(member.id);
            
            // 从Supabase获取该成员的所有签到记录
            const { data: attendanceRecords, error: attendanceError } = await supabase
                .from('attendance')
                .select('*')
                .eq('member_id', currentMemberId);
            
            if (attendanceError) {
                console.error('加载签到记录时出错:', attendanceError);
                return;
            }
            
            // 计算签到记录统计
            let presentCount = 0, leaveCount = 0, absentCount = 0;
            const records = [];
            
            attendanceRecords.forEach(record => {
                const { date, status } = record;
                records.push({ date, status });
                
                switch (status) {
                    case 'present': presentCount++; break;
                    case 'leave': leaveCount++; break;
                    case 'absent': absentCount++; break;
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
    } catch (error) {
        console.error('加载个人信息时出错:', error);
        alert('加载个人信息失败，请稍后重试');
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
async function exportData() {
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    
    if (!startDate || !endDate) {
        alert('请选择日期范围');
        return;
    }
    
    try {
        // 从Supabase获取分组数据
        const { data: groups, error: groupsError } = await supabase
            .from('groups')
            .select('*');
        
        if (groupsError) {
            console.error('获取分组数据时出错:', groupsError);
            alert('获取数据失败，请稍后重试');
            return;
        }
        
        // 从Supabase获取成员数据
        let { data: members, error: membersError } = await supabase
            .from('members')
            .select('*');
        
        if (membersError) {
            console.error('获取成员数据时出错:', membersError);
            alert('获取数据失败，请稍后重试');
            return;
        }
        
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
        
        // 从Supabase获取签到数据
        const { data: attendanceRecords, error: attendanceError } = await supabase
            .from('attendance')
            .select('*')
            .gte('date', startDate)
            .lte('date', endDate);
        
        if (attendanceError) {
            console.error('获取签到数据时出错:', attendanceError);
            alert('获取数据失败，请稍后重试');
            return;
        }
        
        // 将签到记录转换为与原代码兼容的格式（date -> memberId -> status）
        const attendance = {};
        attendanceRecords.forEach(record => {
            if (!attendance[record.date]) {
                attendance[record.date] = {};
            }
            attendance[record.date][record.member_id] = record.status;
        });
        
        // 按楼层和分组排序成员
        members.sort((a, b) => {
            // 先按楼层排序
            const floorA = a.floor || getGroupFloor(a.group, groups) || '';
            const floorB = b.floor || getGroupFloor(b.group, groups) || '';
            
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
        function getGroupFloor(groupName, groups) {
            if (!groupName || !groups) return '';
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
        for (const member of members) {
            // 计算总课时
            const hours = await calculateMemberHours(member.id);
            let row = `${member.name},${member.id},${hours}`;
            
            dates.forEach(date => {
                const status = attendance[date]?.[member.id] || 'absent';
                row += `,${status === 'present' ? '签到' : status === 'leave' ? '请假' : '旷课'}`;
            });
            
            csvContent += row + '\n';
        }
        
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
    } catch (error) {
        console.error('导出数据时出错:', error);
        alert('导出数据失败，请稍后重试');
    }
}

// 生成今日总结
async function generateSummary() {
    const today = new Date().toISOString().split('T')[0];
    
    try {
        // 从Supabase获取分组数据
        const { data: groups, error: groupsError } = await supabase
            .from('groups')
            .select('*');
        
        if (groupsError) {
            console.error('获取分组数据时出错:', groupsError);
            alert('获取数据失败，请稍后重试');
            return;
        }
        
        // 从Supabase获取成员数据
        let { data: members, error: membersError } = await supabase
            .from('members')
            .select('*');
        
        if (membersError) {
            console.error('获取成员数据时出错:', membersError);
            alert('获取数据失败，请稍后重试');
            return;
        }
        
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
        
        // 从Supabase获取今日签到数据
        const { data: todayAttendanceRecords, error: attendanceError } = await supabase
            .from('attendance')
            .select('*')
            .eq('date', today);
        
        if (attendanceError) {
            console.error('获取签到数据时出错:', attendanceError);
            alert('获取数据失败，请稍后重试');
            return;
        }
        
        // 将签到记录转换为与原代码兼容的格式（memberId -> status）
        const todayAttendance = {};
        todayAttendanceRecords.forEach(record => {
            todayAttendance[record.member_id] = record.status;
        });
        
        // 按楼层和分组排序成员
        members.sort((a, b) => {
            // 先按楼层排序
            const floorA = a.floor || getGroupFloor(a.group, groups) || '';
            const floorB = b.floor || getGroupFloor(b.group, groups) || '';
            
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
        function getGroupFloor(groupName, groups) {
            if (!groupName || !groups) return '';
            const group = groups.find(g => g.name === groupName);
            return group ? group.floor : '';
        }
        
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
    } catch (error) {
        console.error('生成总结时出错:', error);
        alert('生成总结失败，请稍后重试');
    }
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
async function deleteAllMembers() {
    if (!confirm('确定要删除所有成员吗？此操作不可恢复！')) {
        return;
    }
    
    try {
        // 删除所有签到记录
        const { error: attendanceError } = await supabase
            .from('attendance')
            .delete();
        
        if (attendanceError) {
            console.error('删除签到记录时出错:', attendanceError);
            alert('删除签到记录失败，请稍后重试');
            return;
        }
        
        // 删除所有成员
        const { error: membersError } = await supabase
            .from('members')
            .delete();
        
        if (membersError) {
            console.error('删除成员时出错:', membersError);
            alert('删除成员失败，请稍后重试');
            return;
        }
        
        // 重新加载数据
        await loadMembersData();
        await loadAttendanceData();
        await loadDashboardData();
        
        alert('已成功删除所有成员及其签到记录');
    } catch (error) {
        console.error('删除所有成员时出错:', error);
        alert('删除所有成员失败，请稍后重试');
    }
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