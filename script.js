// 全局变量
let currentUser = null;
let currentRole = null;
let currentMemberId = null;

// 初始化数据
function initData() {
    // 检查是否已有数据
    if (!localStorage.getItem('users')) {
        // 初始用户数据
        const users = {
            '20081209': { password: '081209', role: 'admin', name: '管理员' },
            'fangjian': { password: 'fangjian', role: 'leader', name: '负责人' }
        };
        localStorage.setItem('users', JSON.stringify(users));
    }

    if (!localStorage.getItem('members')) {
        // 初始成员数据（空数组，无示范成员）
        const members = [];
        localStorage.setItem('members', JSON.stringify(members));
    }

    if (!localStorage.getItem('attendance')) {
        localStorage.setItem('attendance', JSON.stringify({}));
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    initData();
    setupEventListeners();
    checkRoleVisibility();
});

// 设置事件监听器
function setupEventListeners() {
    // 登录相关
    document.getElementById('role').addEventListener('change', togglePasswordField);
    document.getElementById('login-btn').addEventListener('click', handleLogin);
    document.getElementById('logout-btn').addEventListener('click', handleLogout);

    // 导航相关
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const page = this.dataset.page;
            switchPage(page);
        });
    });

    // 成员管理相关
    document.getElementById('add-member-btn').addEventListener('click', showAddMemberForm);
    document.getElementById('save-member-btn').addEventListener('click', saveMember);
    document.getElementById('cancel-member-btn').addEventListener('click', hideAddMemberForm);

    // 签到管理相关
    document.getElementById('attendance-date').addEventListener('change', loadAttendanceData);

    // 统计导出相关
    document.getElementById('export-btn').addEventListener('click', exportData);
    document.getElementById('summary-btn').addEventListener('click', generateSummary);

    // 拖放文件相关
    const dropArea = document.getElementById('drop-area');
    const fileInput = document.getElementById('file-input');
    const browseBtn = document.getElementById('browse-btn');

    // 拖放事件监听器
    dropArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropArea.classList.add('dragover');
    });

    dropArea.addEventListener('dragleave', () => {
        dropArea.classList.remove('dragover');
    });

    dropArea.addEventListener('drop', (e) => {
        e.preventDefault();
        dropArea.classList.remove('dragover');
        const files = e.dataTransfer.files;
        handleFiles(files);
    });

    // 浏览文件按钮事件
    browseBtn.addEventListener('click', () => {
        fileInput.click();
    });

    // 文件选择事件
    fileInput.addEventListener('change', () => {
        const files = fileInput.files;
        handleFiles(files);
    });

    // 设置当前日期
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('attendance-date').value = today;
    document.getElementById('start-date').value = today;
    document.getElementById('end-date').value = today;
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

    if (role === 'admin' || role === 'leader') {
        // 管理员和负责人登录
        const users = JSON.parse(localStorage.getItem('users')) || {};
        const user = users[username];

        if (user && user.password === password && user.role === role) {
            currentUser = user.name;
            currentRole = role;
            showMainPage();
        } else {
            errorDiv.textContent = '用户名或密码错误';
        }
    } else if (role === 'member') {
        // 成员登录
        const members = JSON.parse(localStorage.getItem('members')) || [];
        const member = members.find(m => m.name === username);

        if (member) {
            currentUser = member.name;
            currentRole = role;
            currentMemberId = member.id;
            showMainPage();
        } else {
            errorDiv.textContent = '姓名未被收录';
        }
    }
}

// 处理退出登录
function handleLogout() {
    currentUser = null;
    currentRole = null;
    currentMemberId = null;
    document.getElementById('login-page').classList.add('active');
    document.getElementById('main-page').classList.remove('active');
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
    document.getElementById('login-error').textContent = '';
}

// 显示主页面
function showMainPage() {
    document.getElementById('login-page').classList.remove('active');
    document.getElementById('main-page').classList.add('active');
    document.getElementById('current-user').textContent = `${currentUser} (${getRoleName(currentRole)})`;
    
    // 根据角色显示不同内容
    checkRoleVisibility();
    
    // 默认显示仪表盘
    switchPage('dashboard');
}

// 获取角色名称
function getRoleName(role) {
    const roleNames = {
        admin: '管理员',
        leader: '负责人',
        member: '成员'
    };
    return roleNames[role] || role;
}

// 根据角色显示/隐藏导航
function checkRoleVisibility() {
    // 成员只能看到仪表盘和个人信息
    if (currentRole === 'member') {
        document.getElementById('members-nav').style.display = 'none';
        document.getElementById('attendance-nav').style.display = 'none';
        document.getElementById('statistics-nav').style.display = 'none';
        document.getElementById('add-member-btn').style.display = 'none';
        document.getElementById('drop-area').style.display = 'none';
        switchPage('member-info');
    } else if (currentRole === 'leader') {
        // 负责人可以看到成员列表和签到管理，但不能添加成员
        document.getElementById('members-nav').style.display = 'block';
        document.getElementById('attendance-nav').style.display = 'block';
        document.getElementById('statistics-nav').style.display = 'block';
        document.getElementById('add-member-btn').style.display = 'none';
        document.getElementById('drop-area').style.display = 'none';
    } else {
        // 管理员可以看到所有功能
        document.getElementById('members-nav').style.display = 'block';
        document.getElementById('attendance-nav').style.display = 'block';
        document.getElementById('statistics-nav').style.display = 'block';
        document.getElementById('add-member-btn').style.display = 'block';
        document.getElementById('drop-area').style.display = 'block';
    }
}

// 切换页面
function switchPage(pageName) {
    // 限制成员权限：成员只能访问仪表盘和个人信息
    if (currentRole === 'member' && (pageName === 'attendance' || pageName === 'members' || pageName === 'statistics')) {
        pageName = 'member-info';
    }
    
    // 更新导航按钮状态
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-page="${pageName}"]`).classList.add('active');

    // 隐藏所有内容
    document.querySelectorAll('.content').forEach(content => {
        content.classList.remove('active');
    });

    // 显示选中的内容
    if (pageName === 'member-info') {
        document.getElementById('member-info').classList.add('active');
        loadMemberInfo();
    } else {
        document.getElementById(pageName).classList.add('active');
    }

    // 根据页面加载数据
    if (pageName === 'dashboard') {
        loadDashboardData();
    } else if (pageName === 'members') {
        loadMembersData();
    } else if (pageName === 'attendance') {
        loadAttendanceData();
    }
}

// 加载仪表盘数据
function loadDashboardData() {
    const today = new Date().toISOString().split('T')[0];
    const attendance = JSON.parse(localStorage.getItem('attendance')) || {};
    const todayData = attendance[today] || {};
    const members = JSON.parse(localStorage.getItem('members')) || [];

    let attendanceCount = 0;
    let leaveCount = 0;
    let absentCount = 0;
    let totalHours = 0;

    // 计算今日数据
    Object.values(todayData).forEach(status => {
        if (status === 'attendance') attendanceCount++;
        if (status === 'leave') leaveCount++;
        if (status === 'absent') absentCount++;
    });

    // 计算总课时
    members.forEach(member => {
        totalHours += member.hours;
    });

    // 更新页面
    document.getElementById('today-attendance').textContent = attendanceCount;
    document.getElementById('today-leave').textContent = leaveCount;
    document.getElementById('today-absent').textContent = absentCount;
    document.getElementById('total-hours').textContent = totalHours;
}

// 显示添加成员表单
function showAddMemberForm() {
    document.getElementById('add-member-form').classList.remove('hidden');
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
    const studentId = document.getElementById('new-member-id').value.trim();

    if (!name || !studentId) {
        alert('请填写完整信息');
        return;
    }

    const members = JSON.parse(localStorage.getItem('members')) || [];
    
    // 检查是否已存在
    if (members.some(m => m.name === name || m.studentId === studentId)) {
        alert('成员已存在');
        return;
    }

    // 添加新成员
    const newMember = {
        id: Date.now(),
        name: name,
        studentId: studentId,
        hours: 0
    };

    members.push(newMember);
    localStorage.setItem('members', JSON.stringify(members));

    alert('成员添加成功');
    hideAddMemberForm();
    loadMembersData();
}

// 加载成员数据
function loadMembersData() {
    const members = JSON.parse(localStorage.getItem('members')) || [];
    const tbody = document.getElementById('members-list');

    tbody.innerHTML = '';

    members.forEach(member => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${member.name}</td>
            <td>${member.studentId}</td>
            <td>${member.hours}</td>
            <td>
                ${currentRole === 'admin' ? `<button class="action-btn delete-btn" onclick="deleteMember(${member.id})">删除</button>` : ''}
            </td>
        `;
        tbody.appendChild(row);
    });
}

// 删除成员
function deleteMember(id) {
    // 只有管理员可以删除成员
    if (currentRole !== 'admin') {
        alert('您没有权限执行此操作');
        return;
    }
    
    if (confirm('确定要删除这个成员吗？')) {
        const members = JSON.parse(localStorage.getItem('members')) || [];
        const updatedMembers = members.filter(m => m.id !== id);
        localStorage.setItem('members', JSON.stringify(updatedMembers));
        loadMembersData();
    }
}

// 加载签到数据
function loadAttendanceData() {
    const date = document.getElementById('attendance-date').value;
    const members = JSON.parse(localStorage.getItem('members')) || [];
    const attendance = JSON.parse(localStorage.getItem('attendance')) || {};
    const dateData = attendance[date] || {};
    const tbody = document.getElementById('attendance-list');

    tbody.innerHTML = '';

    members.forEach(member => {
        const status = dateData[member.id] || '未签到';
        const row = document.createElement('tr');
        
        // 检查是否有签到记录
        const hasStatus = status !== '未签到';
        
        row.innerHTML = `
            <td>${member.name}</td>
            <td>${member.studentId}</td>
            <td>${getStatusText(status)}</td>
            <td>
                <button class="action-btn" onclick="updateAttendance(${member.id}, 'attendance', '${date}')">签到</button>
                <button class="action-btn" onclick="updateAttendance(${member.id}, 'leave', '${date}')">请假</button>
                <button class="action-btn" onclick="updateAttendance(${member.id}, 'absent', '${date}')">旷课</button>
                ${hasStatus ? `<button class="action-btn cancel-btn" onclick="updateAttendance(${member.id}, 'cancel', '${date}')">取消</button>` : ''}
            </td>
        `;
        tbody.appendChild(row);
    });
}

// 获取状态文本
function getStatusText(status) {
    const statusTexts = {
        attendance: '已签到',
        leave: '请假',
        absent: '旷课',
        '未签到': '未签到'
    };
    return statusTexts[status] || status;
}

// 更新签到状态
function updateAttendance(memberId, status, date) {
    // 只有管理员和负责人可以更新签到状态
    if (currentRole !== 'admin' && currentRole !== 'leader') {
        alert('您没有权限执行此操作');
        return;
    }
    
    const attendance = JSON.parse(localStorage.getItem('attendance')) || {};
    const members = JSON.parse(localStorage.getItem('members')) || [];

    // 初始化日期数据
    if (!attendance[date]) {
        attendance[date] = {};
    }

    // 获取之前的状态
    const previousStatus = attendance[date][memberId];

    // 处理取消签到情况
    if (status === 'cancel') {
        // 如果之前是签到状态，需要减去课时
        if (previousStatus === 'attendance') {
            const memberIndex = members.findIndex(m => m.id === memberId);
            if (memberIndex !== -1) {
                members[memberIndex].hours -= 1;
                localStorage.setItem('members', JSON.stringify(members));
            }
        }
        // 移除签到记录
        delete attendance[date][memberId];
        // 如果当天没有记录了，移除当天数据
        if (Object.keys(attendance[date]).length === 0) {
            delete attendance[date];
        }
    } else {
        // 记录新状态
        attendance[date][memberId] = status;
        
        // 如果是签到，增加课时
        if (status === 'attendance' && previousStatus !== 'attendance') {
            const memberIndex = members.findIndex(m => m.id === memberId);
            if (memberIndex !== -1) {
                members[memberIndex].hours += 1;
                localStorage.setItem('members', JSON.stringify(members));
            }
        } else if (status !== 'attendance' && previousStatus === 'attendance') {
            // 如果之前是签到，现在改为其他状态，需要减去课时
            const memberIndex = members.findIndex(m => m.id === memberId);
            if (memberIndex !== -1) {
                members[memberIndex].hours -= 1;
                localStorage.setItem('members', JSON.stringify(members));
            }
        }
    }

    localStorage.setItem('attendance', JSON.stringify(attendance));

    // 重新加载数据
    loadAttendanceData();
    loadDashboardData();
}

// 加载成员信息
function loadMemberInfo() {
    const members = JSON.parse(localStorage.getItem('members')) || [];
    const attendance = JSON.parse(localStorage.getItem('attendance')) || {};
    const member = members.find(m => m.name === currentUser);

    if (member) {
        // 统计数据
        let attendanceCount = 0;
        let leaveCount = 0;
        let absentCount = 0;
        const records = [];

        // 遍历所有日期
        for (const [date, data] of Object.entries(attendance)) {
            const status = data[member.id];
            if (status) {
                records.push({ date, status });
                if (status === 'attendance') attendanceCount++;
                if (status === 'leave') leaveCount++;
                if (status === 'absent') absentCount++;
            }
        }

        // 更新页面
        document.getElementById('member-name').textContent = member.name;
        document.getElementById('member-id').textContent = member.studentId;
        document.getElementById('member-hours').textContent = member.hours;
        document.getElementById('member-attendance').textContent = attendanceCount;
        document.getElementById('member-leave').textContent = leaveCount;
        document.getElementById('member-absent').textContent = absentCount;

        // 加载签到记录
        const tbody = document.getElementById('member-records-list');
        tbody.innerHTML = '';

        // 按日期排序
        records.sort((a, b) => new Date(b.date) - new Date(a.date));

        records.forEach(record => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${record.date}</td>
                <td>${getStatusText(record.status)}</td>
            `;
            tbody.appendChild(row);
        });
    }
}

// 导出数据
function exportData() {
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    const members = JSON.parse(localStorage.getItem('members')) || [];
    const attendance = JSON.parse(localStorage.getItem('attendance')) || {};

    // 生成CSV内容
    let csv = '姓名,学号/ID,总课时,签到次数,请假次数,旷课次数\n';

    members.forEach(member => {
        let attendanceCount = 0;
        let leaveCount = 0;
        let absentCount = 0;

        // 统计指定日期范围内的数据
        for (const [date, data] of Object.entries(attendance)) {
            if (date >= startDate && date <= endDate) {
                const status = data[member.id];
                if (status === 'attendance') attendanceCount++;
                if (status === 'leave') leaveCount++;
                if (status === 'absent') absentCount++;
            }
        }

        csv += `${member.name},${member.studentId},${member.hours},${attendanceCount},${leaveCount},${absentCount}\n`;
    });

    // 创建下载链接
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `志愿活动统计_${startDate}_${endDate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// 生成今日总结
function generateSummary() {
    const today = new Date().toISOString().split('T')[0];
    const attendance = JSON.parse(localStorage.getItem('attendance')) || {};
    const todayData = attendance[today] || {};
    const members = JSON.parse(localStorage.getItem('members')) || [];

    let attendanceCount = 0;
    let leaveCount = 0;
    let absentCount = 0;
    let notSignedCount = members.length;

    // 计算今日数据
    Object.values(todayData).forEach(status => {
        notSignedCount--;
        if (status === 'attendance') attendanceCount++;
        if (status === 'leave') leaveCount++;
        if (status === 'absent') absentCount++;
    });

    // 生成总结文本
    let summary = `今日志愿活动总结（${today}）\n`;
    summary += `总人数：${members.length}\n`;
    summary += `签到人数：${attendanceCount}\n`;
    summary += `请假人数：${leaveCount}\n`;
    summary += `旷课人数：${absentCount}\n`;
    summary += `未签到人数：${notSignedCount}\n\n`;
    summary += `详细情况：\n`;

    members.forEach(member => {
        const status = todayData[member.id] || '未签到';
        summary += `${member.name}（${member.studentId}）：${getStatusText(status)}\n`;
    });

    // 显示总结
    const resultDiv = document.getElementById('statistics-result');
    resultDiv.innerHTML = `
        <h3>今日总结</h3>
        <pre>${summary}</pre>
        <button onclick="downloadSummary('${summary}')">下载总结</button>
    `;
}

// 下载总结
function downloadSummary(summary) {
    const today = new Date().toISOString().split('T')[0];
    const blob = new Blob([summary], { type: 'text/plain;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `志愿活动总结_${today}.txt`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// 设置自动总结定时器
function setupAutoSummary() {
    const now = new Date();
    const targetTime = new Date();
    targetTime.setHours(21, 0, 0, 0); // 晚上9点

    // 如果当前时间已经超过晚上9点，设置到明天
    if (now > targetTime) {
        targetTime.setDate(targetTime.getDate() + 1);
    }

    const delay = targetTime - now;

    // 设置定时器
    setTimeout(function() {
        generateSummary();
        // 每天重复
        setInterval(generateSummary, 24 * 60 * 60 * 1000);
    }, delay);
}

// 启动自动总结
setupAutoSummary();

// 暴露一些函数到全局，以便在HTML中调用
window.deleteMember = deleteMember;
window.updateAttendance = updateAttendance;
window.downloadSummary = downloadSummary;

// 处理上传的文件
function handleFiles(files) {
    // 只有管理员可以批量添加成员
    if (currentRole !== 'admin') {
        alert('您没有权限执行此操作');
        return;
    }
    
    if (files.length === 0) return;
    
    const file = files[0];
    const fileName = file.name;
    const fileExtension = fileName.split('.').pop().toLowerCase();
    
    // 检查文件类型
    if (fileExtension === 'xlsx' || fileExtension === 'xls') {
        parseExcelFile(file);
    } else if (fileExtension === 'csv') {
        parseCSVFile(file);
    } else {
        alert('不支持的文件类型，请上传Excel(.xlsx)或CSV文件');
    }
}

// 解析Excel文件
function parseExcelFile(file) {
    const reader = new FileReader();
    
    reader.onload = function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        processMemberData(jsonData);
    };
    
    reader.onerror = function() {
        alert('解析Excel文件失败');
    };
    
    reader.readAsArrayBuffer(file);
}

// 解析CSV文件
function parseCSVFile(file) {
    const reader = new FileReader();
    
    reader.onload = function(e) {
        const text = e.target.result;
        const jsonData = XLSX.utils.csv_to_json(text);
        
        processMemberData(jsonData);
    };
    
    reader.onerror = function() {
        alert('解析CSV文件失败');
    };
    
    reader.readAsText(file);
}

// 处理解析后的成员数据
function processMemberData(jsonData) {
    if (jsonData.length === 0) {
        alert('文件中没有数据');
        return;
    }
    
    // 检查数据结构，寻找包含姓名和学号/ID的列
    const firstRow = jsonData[0];
    const columns = Object.keys(firstRow);
    
    // 尝试匹配可能的姓名列和学号/ID列
    let nameColumn = '';
    let idColumn = '';
    
    // 查找姓名列
    const namePatterns = ['姓名', 'name', 'Name', 'NAME'];
    for (const col of columns) {
        if (namePatterns.some(pattern => col.includes(pattern))) {
            nameColumn = col;
            break;
        }
    }
    
    // 查找学号/ID列
    const idPatterns = ['学号', 'ID', 'id', 'Id', 'studentId', 'StudentID', '学生ID'];
    for (const col of columns) {
        if (idPatterns.some(pattern => col.includes(pattern))) {
            idColumn = col;
            break;
        }
    }
    
    if (!nameColumn || !idColumn) {
        alert('无法识别文件中的姓名和学号/ID列，请确保文件包含这些信息');
        return;
    }
    
    // 提取成员数据
    const membersToAdd = [];
    for (const row of jsonData) {
        const name = row[nameColumn]?.toString().trim();
        const studentId = row[idColumn]?.toString().trim();
        
        if (name && studentId) {
            membersToAdd.push({ name, studentId });
        }
    }
    
    if (membersToAdd.length === 0) {
        alert('没有找到有效的成员数据');
        return;
    }
    
    // 批量添加成员
    addMembersFromData(membersToAdd);
}

// 从数据中批量添加成员
function addMembersFromData(membersToAdd) {
    const members = JSON.parse(localStorage.getItem('members')) || [];
    let addedCount = 0;
    let existingCount = 0;
    
    // 获取当前最大ID
    const maxId = members.length > 0 ? Math.max(...members.map(m => m.id)) : 0;
    
    // 检查现有成员，避免重复添加
    const existingStudentIds = new Set(members.map(m => m.studentId));
    
    for (let i = 0; i < membersToAdd.length; i++) {
        const { name, studentId } = membersToAdd[i];
        
        if (!existingStudentIds.has(studentId)) {
            const newMember = {
                id: maxId + i + 1,
                name,
                studentId,
                hours: 0
            };
            
            members.push(newMember);
            existingStudentIds.add(studentId);
            addedCount++;
        } else {
            existingCount++;
        }
    }
    
    // 保存更新后的成员数据
    localStorage.setItem('members', JSON.stringify(members));
    
    // 更新成员列表显示
    loadMembersData();
    
    // 显示添加结果
    let message = `成功添加 ${addedCount} 名新成员`;
    if (existingCount > 0) {
        message += `，${existingCount} 名成员已存在`;
    }
    alert(message);
}