document.addEventListener("DOMContentLoaded", () => {
    const newPassword = document.getElementById("new_password");
    const confirmPassword = document.getElementById("confirm_password");
    const strengthMeter = document.getElementById("strength-meter");
    const strengthText = document.getElementById("strength-text");
    const form = document.querySelector("form");

    // Unified Toggle functionality
    const setupToggle = (btnId, inputId) => {
        const btn = document.getElementById(btnId);
        const input = document.getElementById(inputId);
        if (!btn || !input) return;

        btn.addEventListener("click", function () {
            const isPassword = input.getAttribute("type") === "password";
            input.setAttribute("type", isPassword ? "text" : "password");

            // Update icon
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

    setupToggle("toggleNewPassword", "new_password");
    setupToggle("toggleConfirmPassword", "confirm_password");

    // Password strength check
    if (newPassword && strengthMeter && strengthText) {
        newPassword.addEventListener("input", () => {
            const val = newPassword.value;
            let strength = "";
            let className = "";

            if (val.length === 0) {
                strengthMeter.style.display = "none";
                strength = "Password Strength";
                className = "";
            } else {
                strengthMeter.style.display = "block";
                if (val.length < 6) {
                    strength = "Weak";
                    className = "weak";
                } else if (val.length < 10 || !/[A-Z]/.test(val) || !/\d/.test(val)) {
                    strength = "Medium";
                    className = "medium";
                } else {
                    strength = "Strong";
                    className = "strong";
                }
            }

            strengthText.textContent = `Strength: ${strength}`;
            strengthMeter.className = `strength-meter mt-2 ${className}`;
        });
    }

    // Confirm password validation
    const validateConfirmPassword = () => {
        if (!confirmPassword || !newPassword) return;
        if (confirmPassword.value !== newPassword.value) {
            confirmPassword.setCustomValidity("Passwords do not match.");
        } else {
            confirmPassword.setCustomValidity("");
        }
    };

    if (newPassword && confirmPassword) {
        newPassword.addEventListener("change", validateConfirmPassword);
        confirmPassword.addEventListener("input", validateConfirmPassword);
    }

    // Final validation on submit
    if (form && newPassword) {
        form.addEventListener("submit", (e) => {
            let valid = true;

            if (newPassword.value.length < 6) {
                newPassword.setCustomValidity("Password must be at least 6 characters.");
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
    }
});