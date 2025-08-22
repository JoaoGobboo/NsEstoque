// Checar token
const token = localStorage.getItem('token');

if (!token) {
    window.location.href = './login.html';
} else {
    fetch('http://localhost:3000/api/auth/me', {
        headers: { 'Authorization': 'Bearer ' + token }
    })
    .then(res => {
        if (!res.ok) throw new Error('Token inválido');
        return res.json();
    })
    .then(data => {
        const userDiv = document.getElementById('user-info');
        userDiv.innerHTML = `
            <p><strong>Nome:</strong> ${data.user.nome}</p>
            <p><strong>Email:</strong> ${data.user.email}</p>
            <p><strong>Tipo:</strong> ${data.user.tipo}</p>
        `;
    })
    .catch(err => {
        console.error(err);
        localStorage.removeItem('token');
        window.location.href = './login.html';
    });
}

// Logout
document.getElementById('logout').addEventListener('click', () => {
    localStorage.removeItem('token');
    window.location.href = './login.html';
});

// Redirecionamento Gerenciar Usuários
document.getElementById('manage-users').addEventListener('click', () => {
    window.location.href = './users.html';
});

// Carregar produtos
async function loadProducts() {
    const token = localStorage.getItem('token');
    if (!token) return window.location.href = './login.html';

    try {
        const res = await fetch('http://localhost:3000/api/products', {
            headers: { 'Authorization': 'Bearer ' + token }
        });

        if (!res.ok) throw new Error('Erro ao buscar produtos');

        const data = await res.json();
        const tbody = document.querySelector('#products-table tbody');
        tbody.innerHTML = '';

        data.products.forEach(p => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${p.id}</td>
                <td>${p.nome}</td>
                <td>${p.categoria}</td>
                <td>${p.quantidade}</td>
                <td>${p.preco_compra}</td>
                <td>${p.preco_venda}</td>
                <td>${p.descricao}</td>
                <td>${p.data_criacao}</td>
                <td>${p.data_atualizacao}</td>
                <td><button class="edit-product" data-id="${p.id}">Editar</button></td>
                <td><button class="delete-product" data-id="${p.id}">Excluir</button></td>
            `;
            tbody.appendChild(tr);
        });

        // Eventos de editar
        document.querySelectorAll('.edit-product').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.id;
                window.location.href = `edit-product.html?id=${id}`;
            });
        });

        // Eventos de excluir
        document.querySelectorAll('.delete-product').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.dataset.id;
                if (confirm('Tem certeza que deseja excluir este produto?')) {
                    try {
                        const res = await fetch(`http://localhost:3000/api/products/${id}`, {
                            method: 'DELETE',
                            headers: { 'Authorization': 'Bearer ' + token }
                        });
                        if (!res.ok) throw new Error('Erro ao excluir produto');
                        loadProducts();
                    } catch (err) {
                        alert('Erro ao excluir produto');
                        console.error(err);
                    }
                }
            });
        });

    } catch (err) {
        console.error(err);
    }
}

loadProducts();
