let supabaseClient = null;

// Función para inicializar Supabase obteniendo credenciales del servidor
async function initSupabase() {
  try {
    const configResponse = await fetch('/api/config');
    const config = await configResponse.json();
    
    if (!config.supabaseUrl || !config.supabaseKey) {
      throw new Error('Faltan credenciales');
    }

    // Inicializamos el cliente oficial
    // 'supabase' es una variable global inyectada por el script del CDN
    supabaseClient = supabase.createClient(config.supabaseUrl, config.supabaseKey);

    // Escuchar cambios de autenticación (opcional, para depuración)
    supabaseClient.auth.onAuthStateChange((event, session) => {
      console.log("Evento de Auth:", event);
      if (event === 'PASSWORD_RECOVERY') {
        // El usuario entró con un link de recuperación válido
        console.log("Modo recuperación activo");
      }
    });

  } catch (error) {
    console.error("Error iniciando Supabase:", error);
    const errorDiv = document.getElementById('error');
    errorDiv.textContent = 'Error de configuración. No se puede conectar al sistema.';
    errorDiv.style.display = 'block';
    document.getElementById('submitBtn').disabled = true;
  }
}

// Inicializamos apenas carga el script
initSupabase();

document.getElementById('resetForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirmPassword').value;
  const errorDiv = document.getElementById('error');
  const successDiv = document.getElementById('success');
  const submitBtn = document.getElementById('submitBtn');
  const btnText = document.getElementById('btnText');
  const btnLoader = document.getElementById('btnLoader');

  errorDiv.style.display = 'none';
  successDiv.style.display = 'none';

  // 1. Validaciones básicas
  if (password !== confirmPassword) {
    errorDiv.textContent = 'Las contraseñas no coinciden';
    errorDiv.style.display = 'block';
    return;
  }

  if (!supabaseClient) {
    errorDiv.textContent = 'El sistema no está listo. Recarga la página.';
    errorDiv.style.display = 'block';
    return;
  }

  // UI Loading
  submitBtn.disabled = true;
  btnText.style.display = 'none';
  btnLoader.style.display = 'inline-block';

  try {
    // 2. ACTUALIZACIÓN DE CONTRASEÑA USANDO LA LIBRERÍA
    // La librería ya detectó el token de la URL y autenticó al usuario internamente
    const { data, error } = await supabaseClient.auth.updateUser({
      password: password
    });

    if (error) throw error;

    successDiv.textContent = '¡Contraseña actualizada exitosamente!';
    successDiv.style.display = 'block';
    document.getElementById('resetForm').reset();

    // Cierre o redirección opcional
    setTimeout(() => {
        // Puedes redirigir a tu app o cerrar
        // window.location.href = 'https://tu-app-principal.com'; 
        window.close();
    }, 3000);

  } catch (error) {
    console.error(error);
    // Mensajes de error amigables
    let msg = error.message;
    if (msg.includes("weak")) msg = "La contraseña es muy débil.";
    if (msg.includes("same")) msg = "Usa una contraseña diferente a la anterior.";
    
    errorDiv.textContent = msg || 'Error al actualizar. ¿Quizás el enlace expiró?';
    errorDiv.style.display = 'block';
  } finally {
    submitBtn.disabled = false;
    btnText.style.display = 'inline';
    btnLoader.style.display = 'none';
  }
});