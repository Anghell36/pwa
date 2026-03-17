// ==========================================
// CONFIGURACIÓN PRINCIPAL
// ==========================================
const BACKEND_URL = "https://pwa-backend-tarh.vercel.app";
const stripeAPI = Stripe("pk_test_51T2ymfGTQu1cMhAHq1rupNpg7cadOsRLcnsMenfjXyb28wWnp6PNIgFyICickjSQUrUHLiC3TLlzDjWBqZDU5rHH00CFPexfLX");
const DEFAULT_IMAGE = "https://placehold.co/150?text=Pet+Photo"; // Nueva alternativa funcional

let elements;
let currentImageBase64 = DEFAULT_IMAGE;

// ==========================================
// LÓGICA DE NAVEGACIÓN Y PANTALLAS
// ==========================================
let navTo = function(screenId) {
    document.querySelectorAll('.screen').forEach(s => {
        s.classList.remove('active');
        s.classList.add('hidden');
    });
    
    const target = document.getElementById(screenId);
    if (target) {
        target.classList.remove('hidden');
        target.classList.add('active');
    }

    if (screenId === 'home-screen') {
        loadPets(); 
    } else if (screenId === 'donate-screen') {
        document.getElementById("amount-container").style.display = "block";
        document.getElementById("payment-form").style.display = "none";
        document.getElementById("error-message").textContent = "";
        document.getElementById("custom-amount").value = 50;
    }
};

// ==========================================
// FLUJO DE INICIO (Splash Screen + Sesión)
// ==========================================
window.onload = () => {
    // Respetamos tu Splash Screen por 2.5 segundos antes de evaluar sesión
    setTimeout(() => {
        const userId = localStorage.getItem('userId');
        if (userId) {
            navTo('home-screen'); 
        } else {
            navTo('login-screen'); 
        }
    }, 2500);

    // Logout programado en el avatar del Home
    const avatar = document.querySelector('.user-avatar');
    if (avatar) {
        avatar.style.cursor = "pointer";
        avatar.onclick = () => {
            if(confirm("¿Deseas cerrar tu sesión?")) handleLogout();
        };
    }
};

// ==========================================
// LÓGICA DE LOGIN Y REGISTRO (MONGODB)
// ==========================================

// --- LOGIN ---
const loginForm = document.getElementById('login-form');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-pass').value;
        const btn = loginForm.querySelector('button');
        
        btn.innerText = "Verificando...";
        btn.disabled = true;

        try {
            const res = await fetch(`${BACKEND_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();
            
            if (res.ok) {
                localStorage.setItem('userId', data.userId);
                loginForm.reset();
                navTo('home-screen');
            } else {
                alert(data.error || "Error al iniciar sesión.");
            }
        } catch (error) {
            alert("No se pudo conectar con el servidor.");
        } finally {
            btn.innerText = "Login";
            btn.disabled = false;
        }
    });
}

// --- REGISTRO ---
const registerForm = document.getElementById('register-form');
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('reg-email').value;
        const username = document.getElementById('reg-user').value;
        const fullName = document.getElementById('reg-name').value;
        const password = document.getElementById('reg-pass').value;
        const btn = registerForm.querySelector('button');
        
        btn.innerText = "Creando cuenta...";
        btn.disabled = true;

        try {
            const res = await fetch(`${BACKEND_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, username, fullName, password })
            });
            const data = await res.json();
            
            if (res.ok) {
                alert("¡Cuenta creada exitosamente!");
                localStorage.setItem('userId', data.userId);
                registerForm.reset();
                navTo('home-screen');
            } else {
                alert(data.error || "Error al crear la cuenta.");
            }
        } catch (error) {
            alert("No se pudo conectar con el servidor.");
        } finally {
            btn.innerText = "Create Account";
            btn.disabled = false;
        }
    });
}

function handleLogout() {
    localStorage.removeItem('userId');
    navTo('login-screen');
}

// ==========================================
// LÓGICA DE MASCOTAS (IMAGEN + BACKEND)
// ==========================================

// 1. Manejo de la foto (clic en círculo abre galería)
const previewImg = document.getElementById('preview-img');
if (previewImg) {
    previewImg.addEventListener('click', () => {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.onchange = e => {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = event => {
                currentImageBase64 = event.target.result;
                previewImg.src = currentImageBase64;
            };
            reader.readAsDataURL(file);
        };
        fileInput.click();
    });
}

// 2. Cargar mascotas desde el servidor
async function loadPets() {
    try {
        const res = await fetch(`${BACKEND_URL}/pets`);
        const pets = await res.json();
        renderPets(pets);
    } catch (error) {
        console.error("Error al cargar mascotas:", error);
    }
}

// 3. Renderizar en el Feed y en "My Pets"
function renderPets(pets) {
    const feed = document.getElementById('pet-feed');
    const miniList = document.getElementById('my-pets-list-mini');
    const currentUserId = localStorage.getItem('userId');
    
    if (feed) feed.innerHTML = '';
    if (miniList) miniList.innerHTML = '';

    pets.forEach(pet => {
        const petImg = pet.image || DEFAULT_IMAGE;

        // Feed General
        const card = document.createElement('div');
        card.className = 'pet-card';
        card.style.cssText = "background: white; border-radius: 15px; overflow: hidden; margin-bottom: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); cursor: pointer;";
        card.innerHTML = `
            <img src="${petImg}" alt="pet" style="width: 100%; height: 200px; object-fit: cover;">
            <div class="pet-card-info" style="padding: 15px;">
                <h4 style="margin: 0; font-size: 1.2rem;">${pet.name}</h4>
                <p style="margin: 5px 0 0 0; color: gray;">${pet.genre} • ${pet.breed || 'Sin raza'}</p>
            </div>
        `;
        card.onclick = () => viewPetDetail(pet);
        if (feed) feed.appendChild(card);

        // My Pets (Solo las del usuario logueado)
        if (pet.ownerId === currentUserId && miniList) {
            const avatar = document.createElement('div');
            avatar.className = 'circle';
            avatar.style.cssText = "width: 60px; height: 60px; border-radius: 50%; overflow: hidden; border: 2px solid var(--primary-orange); cursor: pointer; flex-shrink: 0; margin-right: 10px;";
            avatar.innerHTML = `<img src="${petImg}" alt="pet" style="width: 100%; height: 100%; object-fit: cover;">`;
            avatar.onclick = () => viewPetDetail(pet);
            miniList.appendChild(avatar);
        }
    });
}

// 4. Detalle de la mascota
function viewPetDetail(pet) {
    document.getElementById('detail-img').src = pet.image || DEFAULT_IMAGE;
    document.getElementById('detail-name').innerText = pet.name;
    document.getElementById('detail-breed').innerText = `${pet.genre} • ${pet.breed || pet.color}`;
    document.getElementById('detail-desc').innerText = pet.desc || "Sin descripción.";
    navTo('pet-detail-screen');
}

// 5. Guardar nueva mascota
const addPetForm = document.getElementById('add-pet-form');
if(addPetForm) {
    addPetForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = addPetForm.querySelector('button');
        btn.innerText = "Guardando en la nube...";
        btn.disabled = true;

        const newPet = {
            name: document.getElementById('pet-name').value,
            breed: document.getElementById('pet-breed') ? document.getElementById('pet-breed').value : "", // Soporte para el campo breed
            color: document.getElementById('pet-color').value,
            genre: document.getElementById('pet-genre').value,
            age: document.getElementById('pet-age').value,
            desc: document.getElementById('pet-desc').value,
            image: currentImageBase64,
            ownerId: localStorage.getItem('userId')
        };

        try {
            await fetch(`${BACKEND_URL}/pets`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newPet)
            });
            addPetForm.reset();
            currentImageBase64 = DEFAULT_IMAGE;
            if(previewImg) previewImg.src = DEFAULT_IMAGE;
            navTo('home-screen');
        } catch (error) {
            alert("Error al guardar en el servidor.");
        } finally {
            btn.innerText = "Add Pet";
            btn.disabled = false;
        }
    });
}

// ==========================================
// LÓGICA DE PAGOS (STRIPE)
// ==========================================
async function startDonation() {
    const amountInput = document.getElementById("custom-amount").value;
    if (!amountInput || amountInput <= 0) return alert("Ingresa un monto válido.");

    const btnLoad = document.querySelector("#amount-container button");
    btnLoad.innerText = "Conectando...";
    btnLoad.disabled = true;

    try {
        const amountInCents = Math.round(parseFloat(amountInput) * 100);
        const res = await fetch(`${BACKEND_URL}/create-payment-intent`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ amount: amountInCents }),
        });
        
        const { clientSecret } = await res.json();
        elements = stripeAPI.elements({ clientSecret });
        const paymentElement = elements.create("payment");
        document.getElementById("payment-element").innerHTML = ""; 
        paymentElement.mount("#payment-element");

        document.getElementById("amount-container").style.display = "none";
        document.getElementById("payment-form").style.display = "block";
        document.getElementById("submit").innerText = `Donar $${amountInput}.00 MXN`;
    } catch (error) {
        alert("Error con la pasarela de pagos.");
    } finally {
        btnLoad.innerText = "Generar Formato de Pago";
        btnLoad.disabled = false;
    }
}

const paymentForm = document.getElementById("payment-form");
if(paymentForm) {
    paymentForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById("submit");
        submitBtn.disabled = true;
        submitBtn.innerText = "Procesando...";

        try {
            // Analítico: Agregamos redirect: "if_required" para que no recargue la PWA
            const { error, paymentIntent } = await stripeAPI.confirmPayment({
                elements,
                confirmParams: {
                    return_url: window.location.origin + window.location.pathname, 
                },
                redirect: "if_required" // <--- LA MAGIA ESTÁ AQUÍ
            });

            if (error) {
                // Si la tarjeta falla (fondos insuficientes, etc.)
                document.getElementById("error-message").textContent = error.message;
                submitBtn.disabled = false;
                submitBtn.innerText = "Reintentar Pago";
            } else if (paymentIntent && paymentIntent.status === "succeeded") {
                // ¡PAGO EXITOSO!
                alert("¡Gracias por tu donación! El pago se ha realizado con éxito. 🐾");
                
                // Limpiamos el formulario para futuras donaciones
                document.getElementById("payment-form").style.display = "none";
                document.getElementById("amount-container").style.display = "block";
                document.getElementById("custom-amount").value = 50;
                submitBtn.disabled = false;
                
                // Navegamos suavemente al Home sin recargar la página
                navTo('home-screen');
            }
        } catch (err) {
            document.getElementById("error-message").textContent = "Ocurrió un error inesperado.";
            submitBtn.disabled = false;
            submitBtn.innerText = "Reintentar Pago";
        }
    });
}

function toggleChat() {
    const chat = document.getElementById('chatbot-overlay');
    if(chat) chat.classList.toggle('hidden');
}
