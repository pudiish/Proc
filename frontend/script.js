// Updated index.html script section
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
  
        const data = await response.json();
  
        if (response.ok) {
          // Log registration activity
          await fetch("http://localhost:5001/quiz/log", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              username,
              activity: "User Registered",
              data: { timestamp: new Date().toISOString() }
            }),
          });
          
          alert("Registration successful! You can now log in.");
          document.getElementById("registerForm").classList.add("hidden");
          document.getElementById("loginForm").classList.remove("hidden");
        } else {
          alert(data.error || "Registration failed. Try again.");
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
          // Save user data and token to localStorage
          localStorage.setItem("token", data.token);
          localStorage.setItem("username", username);
          localStorage.setItem("sessionStartTime", new Date().toISOString());
          localStorage.setItem("sessionId", data.sessionId); // Store the session ID
          
          // Log login activity
          await fetch("http://localhost:5001/quiz/log", {
            method: "POST",
            headers: { 
              "Content-Type": "application/json",
              "Authorization": `Bearer ${data.token}`
            },
            body: JSON.stringify({
              username,
              activity: "User Login",
              data: { 
                timestamp: new Date().toISOString(),
                sessionId: data.sessionId,
                userAgent: navigator.userAgent
              }
            }),
          });
          
          alert("Login successful!");
          window.location.href = "quiz.html";
        } else {
          alert(data.error || "Login failed. Try again.");
        }
      } catch (error) {
        alert("Error: " + error.message);
      }
    });
  
    // Check if user is already logged in when page loads
    const checkAuthStatus = () => {
      const token = localStorage.getItem("token");
      const username = localStorage.getItem("username");
      
      if (token && username) {
        // Verify token validity with server
        fetch("http://localhost:5001/verify-token", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          }
        })
        .then(response => response.json())
        .then(data => {
          if (data.valid) {
            // If on index page, redirect to quiz
            if (window.location.pathname.endsWith("index.html") || window.location.pathname === "/") {
              window.location.href = "quiz.html";
            }
          } else {
            // Token invalid, clear localStorage
            localStorage.removeItem("token");
            localStorage.removeItem("username");
            localStorage.removeItem("sessionStartTime");
            localStorage.removeItem("sessionId");
          }
        })
        .catch(error => {
          console.error("Token verification error:", error);
        });
      }
    };
  
    // Redirect Unauthorized Users
    if (window.location.pathname.endsWith("quiz.html") && !localStorage.getItem("token")) {
      alert("You must be logged in to access this page.");
      window.location.href = "index.html";
    } else {
      checkAuthStatus();
    }
  
    // Logout Functionality
    const logoutButton = document.getElementById("logoutButton");
    if (logoutButton) {
      logoutButton.addEventListener("click", async () => {
        const token = localStorage.getItem("token");
        const username = localStorage.getItem("username");
        const sessionId = localStorage.getItem("sessionId");
        
        if (token && username) {
          try {
            // Log logout activity
            await fetch("http://localhost:5001/quiz/log", {
              method: "POST",
              headers: { 
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
              },
              body: JSON.stringify({
                username,
                activity: "User Logout",
                data: { 
                  timestamp: new Date().toISOString(),
                  sessionId,
                  sessionDuration: calculateSessionDuration()
                }
              }),
            });
            
            // Invalidate session on server
            await fetch("http://localhost:5001/logout", {
              method: "POST",
              headers: { 
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
              }
            });
          } catch (error) {
            console.error("Error during logout:", error);
          }
        }
        
        // Clear local storage regardless of server response
        localStorage.removeItem("token");
        localStorage.removeItem("username");
        localStorage.removeItem("sessionStartTime");
        localStorage.removeItem("sessionId");
        
        alert("Logged out successfully!");
        window.location.href = "index.html";
      });
    }
    
    // Helper function to calculate session duration
    function calculateSessionDuration() {
      const startTime = new Date(localStorage.getItem("sessionStartTime") || new Date().toISOString());
      const endTime = new Date();
      const durationMs = endTime - startTime;
      return Math.floor(durationMs / 1000); // Duration in seconds
    }
  });