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

// Inicializar Stripe con tu Publishable Key (reemplaza con tu llave PÚBLICA de Stripe)
const stripeAPI = Stripe("pk_test_tu_llave_publica_aqui");
let elements;

// Función para inicializar el formulario cuando el usuario entra a donar
async function initStripePayment() {
    try {
        // CAMBIA ESTA URL POR TU ENLACE REAL DE VERCEL
        const res = await fetch("https://pwa-backend-tarh.vercel.app/create-payment-intent", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ amount: 5000 }), // $50.00 MXN en centavos
        });
        
        const { clientSecret } = await res.json();

        // Montar los elementos visuales de tarjeta de crédito
        elements = stripeAPI.elements({ clientSecret });
        const paymentElement = elements.create("payment");
        
        // Limpiar por si ya había uno cargado antes y montarlo
        document.getElementById("payment-element").innerHTML = ""; 
        paymentElement.mount("#payment-element");

    } catch (error) {
        console.error("Error inicializando Stripe:", error);
        document.getElementById("error-message").textContent = "Error al conectar con el servidor de pagos.";
    }
}

// Manejar el envío del formulario de pago
document.getElementById("payment-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    document.getElementById("submit").disabled = true;
    document.getElementById("submit").innerText = "Procesando...";

    // Confirmar el pago
    const { error } = await stripeAPI.confirmPayment({
        elements,
        confirmParams: {
            return_url: window.location.origin + "/index.html", // A donde ir tras el éxito
        },
    });

    if (error) {
        // Si la tarjeta falla
        document.getElementById("error-message").textContent = error.message;
        document.getElementById("submit").disabled = false;
        document.getElementById("submit").innerText = "Donar $50.00 MXN";
    }
});

// Interceptar la función navTo original para inicializar Stripe solo cuando entramos a donate-screen
const _originalNavTo = navTo;
navTo = function(screenId) {
    _originalNavTo(screenId); // Llama a tu función original para ocultar/mostrar pantallas
    if (screenId === 'donate-screen') {
        initStripePayment(); // Solo carga Stripe si el usuario decide donar
    }
};