// public/app.js

let supabaseClient = null;

// Referencias al DOM
const submitBtn = document.getElementById('submitBtn');
const passwordInput = document.getElementById('password');
const confirmInput = document.getElementById('confirmPassword');
const errorDiv = document.getElementById('error');
const successDiv = document.getElementById('success');
const btnText = document.getElementById('btnText');
const btnLoader = document.getElementById('btnLoader');

// 1. Deshabilitar todo al inicio hasta verificar la sesión
function setFormState(enabled) {
  submitBtn.disabled = !enabled;
  passwordInput.disabled = !enabled;
  confirmInput.disabled = !enabled;
  if (!enabled) {
    submitBtn.style.opacity = "0.5";
    btnText.textContent = "Verificando enlace...";
  } else {
    submitBtn.style.opacity = "1";
    btnText.textContent = "Cambiar Contraseña";
  }
}

// Inicialmente bloqueado
setFormState(false);

async function initSupabase() {
  try {
    // A. Pedir configuración al servidor
    const configResponse = await fetch('/api/config');
    const config = await configResponse.json();

    if (!config.supabaseUrl || !config.supabaseKey) {
      throw new Error('Faltan credenciales en el servidor');
    }

    // B. Inicializar Cliente
    supabaseClient = supabase.createClient(config.supabaseUrl, config.supabaseKey);

    // C. ESCUCHADOR DE ESTADO (La parte clave para solucionar tu error)
    // Supabase nos avisará cuando procese el token de la URL
    supabaseClient.auth.onAuthStateChange(async (event, session) => {
      console.log("Evento Auth:", event);

      if (event === 'SIGNED_IN' || event === 'PASSWORD_RECOVERY' || session) {
        // ¡Éxito! Tenemos sesión. Habilitamos el formulario.
        setFormState(true);
        errorDiv.style.display = 'none';
      } else if (event === 'SIGNED_OUT') {
        // No hay sesión (link inválido o expirado)
        setFormState(false);
        errorDiv.textContent = 'Enlace inválido o expirado. Solicita uno nuevo.';
        errorDiv.style.display = 'block';
        btnText.textContent = "Enlace inválido";
      }
    });

    // Verificación manual por si el evento ya pasó
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
        setFormState(true);
    }

  } catch (error) {
    console.error("Error init:", error);
    errorDiv.textContent = 'Error de conexión. Recarga la página.';
    errorDiv.style.display = 'block';
  }
}

// Arrancar
initSupabase();

// --- Manejo del Formulario ---
document.getElementById('resetForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const password = passwordInput.value;
  const confirmPassword = confirmInput.value;

  errorDiv.style.display = 'none';
  successDiv.style.display = 'none';

  if (password !== confirmPassword) {
    errorDiv.textContent = 'Las contraseñas no coinciden';
    errorDiv.style.display = 'block';
    return;
  }

  // UI Loading
  submitBtn.disabled = true;
  btnText.style.display = 'none';
  btnLoader.style.display = 'inline-block';

  try {
    // D. Verificar sesión una última vez antes de enviar
    const { data: { session } } = await supabaseClient.auth.getSession();
    
    if (!session) {
        throw new Error("Auth session missing. El enlace ha expirado.");
    }

    // E. Actualizar contraseña
    const { data, error } = await supabaseClient.auth.updateUser({
      password: password
    });

    if (error) throw error;

    successDiv.textContent = '¡Contraseña actualizada exitosamente!';
    successDiv.style.display = 'block';
    document.getElementById('resetForm').reset();

    setTimeout(() => {
        // Cierra la ventana o redirige
        window.close();
    }, 3000);

  } catch (error) {
    console.error(error);
    errorDiv.textContent = error.message;
    errorDiv.style.display = 'block';
  } finally {
    submitBtn.disabled = false;
    btnText.style.display = 'inline';
    btnLoader.style.display = 'none';
    btnText.textContent = "Cambiar Contraseña";
  }
});