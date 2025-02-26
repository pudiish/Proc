document.addEventListener("DOMContentLoaded", () => {
  // Toggle between login and register forms
  document.getElementById("showRegister").addEventListener("click", () => {
      document.getElementById("loginForm").classList.add("hidden");
      document.getElementById("registerForm").classList.remove("hidden");
  });

  document.getElementById("showLogin").addEventListener("click", () => {
      document.getElementById("registerForm").classList.add("hidden");
      document.getElementById("loginForm").classList.remove("hidden");
  });

  // Handle Registration
  document.getElementById("registerForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const username = document.getElementById("username").value.trim();
      const password = document.getElementById("password").value.trim();

      if (!username || !password) {
          alert("Please fill in all fields.");
          return;
      }

      try {
          const response = await fetch("http://localhost:5001/register", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ username, password }),
          });

          if (response.ok) {
              alert("Registration successful! You can now log in.");
              document.getElementById("registerForm").classList.add("hidden");
              document.getElementById("loginForm").classList.remove("hidden");
          } else {
              const errorData = await response.json();
              alert(errorData.message || "Registration failed. Try again.");
          }
      } catch (error) {
          alert("Error: " + error.message);
      }
  });

  // Handle Login
  document.getElementById("loginForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const username = document.getElementById("loginUsername").value.trim();
      const password = document.getElementById("loginPassword").value.trim();

      if (!username || !password) {
          alert("Please enter a valid username and password.");
          return;
      }

      try {
          const response = await fetch("http://localhost:5001/login", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ username, password }),
          });

          const data = await response.json();

          if (response.ok && data.token) {
              localStorage.setItem("token", data.token);
              alert("Login successful!");
              window.location.href = "quiz.html";
          } else {
              alert(data.message || "Login failed. Try again.");
          }
      } catch (error) {
          alert("Error: " + error.message);
      }
  });

  // Redirect Unauthorized Users
  if (window.location.pathname.endsWith("quiz.html") && !localStorage.getItem("token")) {
      alert("You must be logged in to access this page.");
      window.location.href = "index.html";
  }

  // Logout Functionality
  const logoutButton = document.getElementById("logoutButton");
  if (logoutButton) {
      logoutButton.addEventListener("click", () => {
          localStorage.removeItem("token");
          alert("Logged out successfully!");
          window.location.href = "index.html";
      });
  }
});
