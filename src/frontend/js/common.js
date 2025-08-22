// common.js - Funções comuns para todas as páginas do sistema

document.addEventListener('DOMContentLoaded', function() {
    // Verificar se o usuário está logado
    const token = localStorage.getItem('token');
    const currentPage = window.location.pathname.split('/').pop();
    
    // Redirecionar para login se não estiver logado (exceto na página de login ou index)
    if (!token && currentPage !== 'login.html' && currentPage !== 'index.html') {
        window.location.href = 'login.html';
        return;
    }
    
    // Carregar informações do usuário se estiver logado
    if (token) {
        loadUserInfo();
        setupLogout();
        setupSidebarToggle();
    }
});

// Carregar informações do usuário nos elementos da página
function loadUserInfo() {
    const userJson = localStorage.getItem('user');
    if (!userJson) return;
    
    try {
        const user = JSON.parse(userJson);
        
        // Atualizar nome do usuário na sidebar
        const userNameElement = document.getElementById('user-name');
        if (userNameElement) userNameElement.textContent = user.nome || user.email;
        
        // Atualizar função do usuário na sidebar
        const userRoleElement = document.getElementById('user-role');
        if (userRoleElement) userRoleElement.textContent = user.role || 'Usuário';
        
        // Atualizar nome do usuário no cabeçalho
        const headerUserNameElement = document.getElementById('header-user-name');
        if (headerUserNameElement) headerUserNameElement.textContent = user.nome || user.email;
    } catch (error) {
        console.error('Erro ao carregar informações do usuário:', error);
    }
}

// Configurar funcionalidade de logout
function setupLogout() {
    const logoutButton = document.getElementById('logout');
    if (logoutButton) {
        logoutButton.addEventListener('click', function(e) {
            e.preventDefault();
            logout();
        });
    }
}

// Função de logout
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
}

// Configurar toggle da sidebar
function setupSidebarToggle() {
    const sidebarToggle = document.getElementById('sidebar-toggle');
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', function() {
            document.querySelector('.sidebar').classList.toggle('collapsed');
            document.querySelector('.main-content').classList.toggle('expanded');
        });
    }
}