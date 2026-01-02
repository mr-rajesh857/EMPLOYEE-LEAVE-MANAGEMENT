document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("login-form")
  const registerForm = document.getElementById("register-form")
  const loginContainer = document.getElementById("login-form-container")
  const registerContainer = document.getElementById("register-form-container")
  const showRegisterLink = document.getElementById("show-register")
  const showLoginLink = document.getElementById("show-login")
  const errorMessage = document.getElementById("error-message")
  const registerErrorMessage = document.getElementById("register-error-message")

  // Toggle between login and register
  showRegisterLink.addEventListener("click", (e) => {
    e.preventDefault()
    loginContainer.style.display = "none"
    registerContainer.style.display = "block"
    errorMessage.classList.remove("show")
  })

  showLoginLink.addEventListener("click", (e) => {
    e.preventDefault()
    registerContainer.style.display = "none"
    loginContainer.style.display = "block"
    registerErrorMessage.classList.remove("show")
  })

  // Login form submission
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault()

    const email = document.getElementById("email").value
    const password = document.getElementById("password").value
    const loginBtn = document.getElementById("login-btn")

    loginBtn.disabled = true
    loginBtn.innerHTML = "<span>Signing in...</span>"

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (data.success) {
        // Redirect based on role
        if (data.role === "manager") {
          window.location.href = "/manager"
        } else {
          window.location.href = "/employee"
        }
      } else {
        errorMessage.textContent = data.message || "Invalid credentials"
        errorMessage.classList.add("show")
        loginBtn.disabled = false
        loginBtn.innerHTML = "<span>Sign In</span>"
      }
    } catch (error) {
      errorMessage.textContent = "An error occurred. Please try again."
      errorMessage.classList.add("show")
      loginBtn.disabled = false
      loginBtn.innerHTML = "<span>Sign In</span>"
    }
  })

  // Register form submission
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault()

    const name = document.getElementById("reg-name").value
    const email = document.getElementById("reg-email").value
    const password = document.getElementById("reg-password").value
    const department = document.getElementById("department").value
    const role = document.getElementById("role").value
    const registerBtn = document.getElementById("register-btn")

    registerBtn.disabled = true
    registerBtn.innerHTML = "<span>Creating account...</span>"

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email, password, department, role }),
      })

      const data = await response.json()

      if (data.success) {
        // Show success message and redirect to login
        alert("Registration successful! Please log in.")
        registerContainer.style.display = "none"
        loginContainer.style.display = "block"
        registerForm.reset()
      } else {
        registerErrorMessage.textContent = data.message || "Registration failed"
        registerErrorMessage.classList.add("show")
      }
    } catch (error) {
      registerErrorMessage.textContent = "An error occurred. Please try again."
      registerErrorMessage.classList.add("show")
    } finally {
      registerBtn.disabled = false
      registerBtn.innerHTML = "<span>Create Account</span>"
    }
  })
})
