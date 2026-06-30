import { useState } from "react";
import axios from "axios";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/auth/login`,
        { email, password }
      );

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));

      window.location.href = "/";

    } catch (error) {
      alert(error.response?.data?.message || "Login Failed");
    }
  };

  return (
    <div style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      height: "100vh",
      background: "#ECE5DD",
    }}>
      <div style={{
        background: "white",
        padding: "40px",
        borderRadius: "10px",
        width: "350px",
        boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
      }}>

        <h2 style={{
          textAlign: "center",
          color: "#075E54",
          marginBottom: "25px",
        }}>
          💬 Chat App
        </h2>

        <h3 style={{ textAlign: "center", marginBottom: "20px" }}>
          Login
        </h3>

        <input
          type="email"
          placeholder="Enter Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{
            width: "100%",
            padding: "10px",
            marginBottom: "15px",
            borderRadius: "5px",
            border: "1px solid #ccc",
            fontSize: "15px",
            boxSizing: "border-box",
          }}
        />

        <input
          type="password"
          placeholder="Enter Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{
            width: "100%",
            padding: "10px",
            marginBottom: "20px",
            borderRadius: "5px",
            border: "1px solid #ccc",
            fontSize: "15px",
            boxSizing: "border-box",
          }}
        />

        <button
          onClick={handleLogin}
          style={{
            width: "100%",
            padding: "12px",
            background: "#075E54",
            color: "white",
            border: "none",
            borderRadius: "5px",
            fontSize: "16px",
            cursor: "pointer",
          }}
        >
          Login
        </button>

        <p style={{
          textAlign: "center",
          marginTop: "15px",
          fontSize: "14px",
        }}>
          Don't have an account?{" "}
          <a href="/register" style={{ color: "#075E54", fontWeight: "bold" }}>
            Register here
          </a>
        </p>

      </div>
    </div>
  );
}

export default Login;