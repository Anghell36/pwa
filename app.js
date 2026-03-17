// ==========================================
// CONFIGURACIÓN PRINCIPAL
// ==========================================
// Esta es la URL de tu servidor en Vercel
const BACKEND_URL = "https://pwa-backend-tarh.vercel.app";

// ==========================================
// LÓGICA DE NAVEGACIÓN Y PANTALLAS
// ==========================================
let navTo = function(screenId) {
    // 1. Ocultar todas las pantallas
    document.querySelectorAll('.screen').forEach(s => {
        s.classList.remove('active');
        s.classList.add('hidden');
    });
    
    // 2. Mostrar la pantalla solicitada
    const target = document.getElementById(screenId);
    if (target) {
        target.classList.remove('hidden');
        target.classList.add('active');
    }

    // 3. Casos especiales al cambiar de pantalla
    if (screenId === 'home-screen') {
        loadPets(); // Recargar las mascotas desde la base de datos al ir al inicio
    } else if (screenId === 'donate-screen') {
        // Resetear la pantalla de donación
        document.getElementById("amount-container").style.display = "block";
        document.getElementById("payment-form").style.display = "none";
        document.getElementById("error-message").textContent = "";
        document.getElementById("custom-amount").value = 50;
    }
};

// Función para mostrar/ocultar el chatbot
function toggleChat() {
    const chat = document.getElementById('chatbot-overlay');
    chat.classList.toggle('hidden');
}

// ==========================================
// LÓGICA DE MASCOTAS (CONECTADA A MONGODB)
// ==========================================
let currentImageBase64 = "https://via.placeholder.com/150"; // Imagen por defecto

// 1. Subir una foto al hacer clic en el círculo de "Add Pet"
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

// 2. Descargar las mascotas desde Vercel (GET)
async function loadPets() {
    try {
        const res = await fetch(`${BACKEND_URL}/pets`);
        const pets = await res.json();
        renderPets(pets);
    } catch (error) {
        console.error("Error al cargar mascotas desde el servidor:", error);
    }
}

// 3. Dibujar las mascotas en el HTML
function renderPets(pets) {
    const feed = document.getElementById('pet-feed');
    const miniList = document.getElementById('my-pets-list-mini');
    
    if (feed) feed.innerHTML = '';
    if (miniList) miniList.innerHTML = '';

    pets.forEach(pet => {
        // Tarjeta grande del feed
        const card = document.createElement('div');
        card.className = 'pet-card';
        card.style.cssText = "background: white; border-radius: 15px; overflow: hidden; margin-bottom: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); cursor: pointer;";
        card.innerHTML = `
            <img src="${pet.image || 'https://via.placeholder.com/150'}" alt="pet" style="width: 100%; height: 200px; object-fit: cover;">
            <div class="pet-card-info" style="padding: 15px;">
                <h4 style="margin: 0; font-size: 1.2rem;">${pet.name}</h4>
                <p style="margin: 5px 0 0 0; color: gray;">${pet.genre} • ${pet.age}</p>
            </div>
        `;
        card.onclick = () => viewPetDetail(pet);
        if (feed) feed.appendChild(card);

        // Circulo pequeño de "My Pets"
        const avatar = document.createElement('div');
        avatar.className = 'circle';
        avatar.style.cssText = "width: 60px; height: 60px; border-radius: 50%; overflow: hidden; border: 2px solid var(--primary-orange); cursor: pointer;";
        avatar.innerHTML = `<img src="${pet.image || 'https://via.placeholder.com/150'}" alt="pet" style="width: 100%; height: 100%; object-fit: cover;">`;
        avatar.onclick = () => viewPetDetail(pet);
        if (miniList) miniList.appendChild(avatar);
    });
}

// 4. Ver los detalles de una mascota específica
function viewPetDetail(pet) {
    document.getElementById('detail-img').src = pet.image || 'https://via.placeholder.com/150';
    document.getElementById('detail-name').innerText = pet.name;
    document.getElementById('detail-breed').innerText = `${pet.genre} • ${pet.color}`;
    document.getElementById('detail-desc').innerText = pet.desc || "Sin descripción.";
    navTo('pet-detail-screen');
}

// 5. Enviar una mascota nueva a Vercel (POST)
const addPetForm = document.getElementById('add-pet-form');
if(addPetForm) {
    addPetForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = addPetForm.querySelector('button');
        btn.innerText = "Guardando en la nube...";
        btn.disabled = true;

        const newPet = {
            name: document.getElementById('pet-name').value,
            color: document.getElementById('pet-color').value,
            genre: document.getElementById('pet-genre').value,
            age: document.getElementById('pet-age').value,
            desc: document.getElementById('pet-desc').value,
            image: currentImageBase64
        };

        try {
            await fetch(`${BACKEND_URL}/pets`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newPet)
            });
            alert("¡Mascota guardada en la base de datos con éxito!");
            addPetForm.reset();
            currentImageBase64 = "https://via.placeholder.com/150";
            previewImg.src = currentImageBase64;
            navTo('home-screen'); // Esto llamará a loadPets() automáticamente
        } catch (error) {
            console.error("Error al guardar:", error);
            alert("Hubo un error al guardar la mascota en la nube.");
        } finally {
            btn.innerText = "Add Pet";
            btn.disabled = false;
        }
    });
}

// Cargar las mascotas apenas se abre la aplicación
window.onload = () => {
    loadPets();
};


// ==========================================
// LÓGICA DE PAGOS (STRIPE)
// ==========================================
const stripeAPI = Stripe("pk_test_TU_LLAVE_PUBLICA_AQUI_POR_FAVOR"); // <--- ¡NO OLVIDES CAMBIAR ESTO!
let elements;

async function startDonation() {
    const amountInput = document.getElementById("custom-amount").value;
    
    if (!amountInput || amountInput <= 0) {
        alert("Por favor ingresa un monto válido mayor a $0.");
        return;
    }

    const btnLoad = document.querySelector("#amount-container button");
    btnLoad.innerText = "Conectando con el banco...";
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
        console.error("Error Stripe:", error);
        alert("Hubo un error al conectar con el servidor de pagos.");
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
        const originalText = submitBtn.innerText;
        
        submitBtn.disabled = true;
        submitBtn.innerText = "Procesando pago...";

        try {
            const { error } = await stripeAPI.confirmPayment({
                elements,
                confirmParams: {
                    return_url: window.location.origin + window.location.pathname, 
                },
            });

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
}