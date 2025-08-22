const form = document.getElementById('loginForm');
const messageDiv = document.getElementById('message');

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const senha = document.getElementById('password').value; // backend espera "senha"

    try {
        const response = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, senha }) // enviar campo correto
        });

        const data = await response.json();

        if (response.ok) {
            messageDiv.textContent = data.message;
            messageDiv.className = 'message success';

            // Salva token e usuário no localStorage
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));

            window.location.href = './dashboard.html';
        } else {
            messageDiv.textContent = data.message || 'Erro ao logar';
            messageDiv.className = 'message error';
        }

    } catch (error) {
        messageDiv.textContent = 'Erro de conexão com o servidor';
        messageDiv.className = 'message error';
        console.error(error);
    }
});
