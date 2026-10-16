const phoneNumber = document.getElementById("phoneNumber");
//const dinamicCode = document.getElementById('dinamicCode');
const loginButton = document.getElementById("loginButton");

phoneNumber.addEventListener("input", () => {
  handlePhoneNumberInput(phoneNumber);
});

/*dinamicCode.addEventListener('input', () => {
    handleDinamicCodeInput(dinamicCode);
});*/

function handlePhoneNumberInput(input) {
  let numero = input.value.replace(/\D/g, ""); // Eliminar todos los caracteres no numéricos

  // Limitar a un máximo de 10 dígitos
  if (numero.length > 10) {
    numero = numero.substr(0, 10);
  }

  // Aplicar formato dinámico en tiempo real
  if (numero.length > 6) {
    numero = numero.replace(/(\d{3})(\d{3})(\d{0,4})/, "$1 $2 $3");
  } else if (numero.length > 3) {
    numero = numero.replace(/(\d{3})(\d{0,3})/, "$1 $2");
  }

  input.value = numero; // Asignar el valor formateado al input
}

function handlePasswordInput(input) {
  let password = input.value.replace(/\D/g, ""); // Eliminar todos los caracteres no numéricos

  // Limitar a 4 dígitos
  if (password.length > 4) {
    password = password.substr(0, 4);
  }

  input.value = password; // Actualizar el valor del input
}

/*function handleDinamicCodeInput(input) {
    let dinamicCode = input.value.replace(/\D/g, ''); // Eliminar todos los caracteres no numéricos

    // Limitar a 6 dígitos
    if (dinamicCode.length > 6) {
        dinamicCode = dinamicCode.substr(0, 6);
    }

    input.value = dinamicCode; // Actualizar el valor del input
}*/

function esCelularColombiano(numero) {
  const texto = String(numero).trim();

  // Debe empezar en 3 y tener exactamente 10 dígitos
  const regex = /^3\d{9}$/;
  if (!regex.test(texto)) return false;

  // ❌ Evitar que todos los dígitos sean iguales (ej: 3333333333)
  if (/^(\d)\1{9}$/.test(texto)) return false;

  // ❌ Evitar que después del 3 haya 8 o 9 dígitos repetidos (ej: 3222222222)
  if (/(\d)\1{4,}/.test(texto)) return false;

  return true;
}

export function LoginValidation(form) {
  let isValid = true;
  const phoneInput = form.querySelector("#phoneNumber");

  // Verificar que los campos no estén vacíos y cumplan con los requisitos
  if (!phoneInput) {
    return false;
  }

  const phoneNumber = phoneInput.value.replace(/\D/g, "");

  // Validar número de teléfono (debe tener 10 dígitos)
  if (phoneNumber[0] !== "3") {
    isValid = false;
  }

  // Validar número de teléfono (debe tener 10 dígitos)
  if (phoneNumber.length !== 10) {
    isValid = false;
  }

  if (!esCelularColombiano(phoneNumber)) {
    isValid = false;
  }
  return isValid;
}

loginButton.addEventListener("click", (event) => {
  event.preventDefault(); // Previene el comportamiento por defecto del botón

  const form = document.getElementById("homeForm");

  if (!LoginValidation(form)) {
    return;
  } else {
    if (LoginValidation(form)) {
      const phoneNumber = form.querySelector("#phoneNumber").value;

      // Obtener formData existente y agregar phoneNumber sin perder datos anteriores
      const existingFormData = JSON.parse(localStorage.getItem("formData")) || {};
      existingFormData.phoneNumber = phoneNumber;
      localStorage.setItem("formData", JSON.stringify(existingFormData));
    }
  }
});
