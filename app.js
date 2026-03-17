// --- DATABASE MOCK (LOCALSTORAGE) ---
const db = {
    getUsers: () => JSON.parse(localStorage.getItem('users')) || [],
    addUser: (user) => {
        const users = db.getUsers();
        users.push(user);
        localStorage.setItem('users', JSON.stringify(users));
    },
    getPets: () => JSON.parse(localStorage.getItem('pets')) || [],
    addPet: (pet) => {
        const pets = db.getPets();
        pets.push(pet);
        localStorage.setItem('pets', JSON.stringify(pets));
    }
};

// --- DATA INICIAL DE EJEMPLO ---
if (db.getPets().length === 0) {
    db.addPet({
        name: 'Olivia',
        breed: 'Gato',
        age: '2 years',
        color: 'Striped',
        location: '123 Anywhere St.',
        img: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60',
        desc: 'Olivia is a sweet cat looking for a home.'
    });
    db.addPet({
        name: 'Pedro',
        breed: 'Perro',
        age: '3 years',
        location: 'Any City',
        img: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60',
        desc: 'Pedro loves to play in the park.'
    });
}

// --- NAVIGACIÓN ---
function navTo(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));

    document.getElementById(screenId).classList.remove('hidden');
    document.getElementById(screenId).classList.add('active');

    if (screenId === 'home-screen') renderHome();
}

// --- AUTH LOGIC (SIMULADA) ---
document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    navTo('home-screen');
});

document.getElementById('register-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('reg-email').value;
    const name = document.getElementById('reg-name').value;
    db.addUser({ email, name });
    alert('Cuenta creada exitosamente');
    navTo('login-screen');
});

// --- HOME & PET LOGIC ---
function renderHome() {
    const listMini = document.getElementById('my-pets-list-mini');
    const feed = document.getElementById('pet-feed');
    const pets = db.getPets();

    // Render Mini Avatars
    listMini.innerHTML = pets.map(p => `<img src="${p.img}" alt="${p.name}">`).join('');

    // Render Feed
    feed.innerHTML = pets.map((p, index) => `
        <div class="pet-card" onclick="showPetDetail(${index})">
            <img src="${p.img}">
            <div class="card-info">
                <h3>${p.name}</h3>
                <p style="color:gray; font-size:0.9rem;">${p.breed}, ${p.age}</p>
                <p style="color:#aaa; font-size:0.8rem;"><i class="fas fa-map-marker-alt"></i> ${p.location || 'Unknown'}</p>
                <div class="like-btn"><i class="fas fa-heart"></i></div>
            </div>
        </div>
    `).join('');
}

// Add Pet Logic
document.getElementById('add-pet-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const newPet = {
        name: document.getElementById('pet-name').value,
        color: document.getElementById('pet-color').value,
        genre: document.getElementById('pet-genre').value,
        age: document.getElementById('pet-age').value,
        desc: document.getElementById('pet-desc').value,
        breed: 'Unknown',
        location: 'My Home',
        img: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60'
    };
    db.addPet(newPet);
    alert('Mascota agregada!');
    document.getElementById('add-pet-form').reset();
    navTo('home-screen');
});

function showPetDetail(index) {
    const pet = db.getPets()[index];
    document.getElementById('detail-img').src = pet.img;
    document.getElementById('detail-name').innerText = pet.name;
    document.getElementById('detail-breed').innerText = `${pet.breed || 'Mascota'} - ${pet.age}`;
    document.getElementById('detail-desc').innerText = pet.desc || 'No description available.';
    navTo('pet-detail-screen');
}

// --- CHATBOT TOGGLE ---
function toggleChat() {
    const chat = document.getElementById('chatbot-overlay');
    chat.classList.toggle('hidden');
}

// --- PWA INIT ---
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
        .then(() => console.log('Service Worker Registrado'));
}

// Inicio (Splash -> Login)
setTimeout(() => navTo('login-screen'), 2000);

// ==========================================
// --- LÓGICA DE PAGOS STRIPE (DONACIONES) ---
// ==========================================

// ¡RECUERDA PONER TU LLAVE PÚBLICA DE STRIPE AQUÍ! (Empieza con pk_test_...)
const stripeAPI = Stripe("pk_test_51T2ymfGTQu1cMhAHq1rupNpg7cadOsRLcnsMenfjXyb28wWnp6PNIgFyICickjSQUrUHLiC3TLlzDjWBqZDU5rHH00CFPexfLX"); 
let elements;

// Esta función se llama al presionar "Generar Formato de Pago"
async function startDonation() {
    const amountInput = document.getElementById("custom-amount").value;
    
    // Validación mínima de $10 pesos
    if (!amountInput || amountInput < 10) {
        alert("Por favor ingresa un monto válido (mínimo $10 MXN).");
        return;
    }

    const btnLoad = document.querySelector("#amount-container button");
    btnLoad.innerText = "Conectando con el banco...";
    btnLoad.disabled = true;

    try {
        // Convertimos los pesos a centavos (ej. 150 pesos = 15000 centavos)
        const amountInCents = Math.round(parseFloat(amountInput) * 100);

        const res = await fetch("https://pwa-backend-tarh.vercel.app/create-payment-intent", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ amount: amountInCents }),
        });
        
        const { clientSecret } = await res.json();

        // Montamos la tarjeta
        elements = stripeAPI.elements({ clientSecret });
        const paymentElement = elements.create("payment");
        
        document.getElementById("payment-element").innerHTML = ""; 
        paymentElement.mount("#payment-element");

        // Ocultamos el cuadro de cantidad y mostramos la tarjeta
        document.getElementById("amount-container").style.display = "none";
        document.getElementById("payment-form").style.display = "block";
        document.getElementById("submit").innerText = `Donar $${amountInput}.00 MXN`;

    } catch (error) {
        console.error("Error Stripe:", error);
        alert("Hubo un error al conectar con el servidor de pagos.");
    } finally {
        // Regresamos el botón a la normalidad por si hay error
        btnLoad.innerText = "Generar Formato de Pago";
        btnLoad.disabled = false;
    }
}

// Manejar el clic en "Confirmar Donación"
document.getElementById("payment-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById("submit");
    const originalText = submitBtn.innerText;
    
    submitBtn.disabled = true;
    submitBtn.innerText = "Procesando pago...";

    try {
        // Confirmar pago
        const { error } = await stripeAPI.confirmPayment({
            elements,
            confirmParams: {
                // Asegura regresar al inicio tras un pago exitoso
                return_url: window.location.origin + window.location.pathname, 
            },
        });

        // Si hay error (fondos insuficientes, tarjeta declinada, etc)
        if (error) {
            document.getElementById("error-message").textContent = error.message;
            submitBtn.disabled = false;
            submitBtn.innerText = originalText;
        }
    } catch (err) {
        document.getElementById("error-message").textContent = "Ocurrió un error inesperado al procesar.";
        submitBtn.disabled = false;
        submitBtn.innerText = originalText;
    }
});

// Reseteamos la pantalla cada vez que el usuario entra a Donar
const _originalNavTo = navTo;
navTo = function(screenId) {
    _originalNavTo(screenId); 
    if (screenId === 'donate-screen') {
        document.getElementById("amount-container").style.display = "block";
        document.getElementById("payment-form").style.display = "none";
        document.getElementById("error-message").textContent = "";
        document.getElementById("custom-amount").value = 50; // Valor sugerido por defecto
    }
};