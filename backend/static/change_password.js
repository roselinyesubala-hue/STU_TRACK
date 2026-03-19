document.addEventListener("DOMContentLoaded", () => {
  const newPassword = document.getElementById("new_password");
  const confirmPassword = document.getElementById("confirm_password");
  const toggleNewPasswordBtn = document.getElementById("toggleNewPassword");
  const toggleConfirmPasswordBtn = document.getElementById("toggleConfirmPassword");
  const strengthMeter = document.getElementById("strength-meter");
  const strengthText = document.getElementById("strength-text");
  const form = document.querySelector("form");

  // Unified Toggle functionality
  const setupToggle = (btn, input) => {
    if (!btn || !input) return;

    btn.addEventListener("click", function () {
      const isPassword = input.getAttribute("type") === "password";
      input.setAttribute("type", isPassword ? "text" : "password");

      const icon = this.querySelector("span");
      if (icon) {
        if (isPassword) {
          icon.classList.remove("fa-eye-slash");
          icon.classList.add("fa-eye");
        } else {
          icon.classList.remove("fa-eye");
          icon.classList.add("fa-eye-slash");
        }
      }
    });
  };

  setupToggle(toggleNewPasswordBtn, newPassword);
  setupToggle(toggleConfirmPasswordBtn, confirmPassword);

  // Password strength check
  newPassword.addEventListener("input", () => {
    const val = newPassword.value;
    let strength = "";
    let className = "";

    if (val.length === 0) {
      strength = "Password Strength";
      className = "";
    } else if (val.length < 6) {
      strength = "Weak";
      className = "weak";
    } else if (val.length < 10 || !/[A-Z]/.test(val) || !/\d/.test(val)) {
      strength = "Medium";
      className = "medium";
    } else {
      strength = "Strong";
      className = "strong";
    }

    strengthText.textContent = `Strength: ${strength}`;
    strengthMeter.className = `strength-meter ${className}`;
  });

  // Confirm password validation
  const validateConfirmPassword = () => {
    if (confirmPassword.value !== newPassword.value) {
      confirmPassword.setCustomValidity("Passwords do not match.");
    } else {
      confirmPassword.setCustomValidity("");
    }
  };

  newPassword.addEventListener("change", validateConfirmPassword);
  confirmPassword.addEventListener("input", validateConfirmPassword);

  // Final validation on submit
  form.addEventListener("submit", (e) => {
    let valid = true;

    if (newPassword.value.length < 8) {
      newPassword.setCustomValidity("Password must be at least 8 characters.");
      valid = false;
    } else {
      newPassword.setCustomValidity("");
    }

    if (confirmPassword.value !== newPassword.value) {
      confirmPassword.setCustomValidity("Passwords do not match.");
      valid = false;
    }

    if (!valid) {
      e.preventDefault();
      form.reportValidity();
    }
  });

  /**
   * Helper to escape HTML to prevent XSS (if needed elsewhere)
   */
  function escapeHtml(str) {
    if (!str) return "";
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }
});