import React, {useState} from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

// styles
import "./login.css";
import api from "../../../config/axios_config.jsx";

// modules
import { saveToken, saveValue } from "../../../config/reusable_config.jsx";

const AdminLogin = () => {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [creation_key, setCreation_Key] = useState("");
    const [code, setCode] = useState("");
    const [logRegInv, setLogRegInv] = useState("login");
    const [pageMsg, setPageMsg] = useState("")

    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setPageMsg("Logging you in...")
        try {
            const response = await api.post("/admin/login", 
                { 
                    email: email, 
                    password: password 
                },
                {requiresAuth: false}
            );
            
            if (response.data.token) {
                await saveToken(response.data.token, true);
                await saveValue("user_type", "admin");
                navigate("/#/admin/client-view", { replace: true });
            } else {
                setPageMsg("Login failed. Please check your credentials.");
            }
        } catch (error) {
            console.error("Login error:", error);
            alert("An error occurred during login.");
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        try {
            const response = await api.post("/admin/register",
                { 
                    name: name, 
                    email: email, 
                    password: password, 
                    code: code 
                },
                {requiresAuth: false}
            );

            alert("You have successfully registered!\nPlease continue to Login")
            setLogRegInv("login")
        } catch (error) {
            console.error("Registration error:", error);
            alert("An error occured during registration");
        }
    };

    const startInvite = async (e) => {
        setPageMsg("Please Contact your Administrator for the Creation Key");
        setLogRegInv("send registration code");
    }

    const getRegistrationCode = async (e) => {
        e.preventDefault();
        setPageMsg(`Code sent to: ${email}`)
        try {
            const response = await api.post("/admin/invite-admin",
                { 
                    email: email,
                    creation_key: creation_key 
                },
                {requiresAuth: false},
            );
            if (response.status === 200){
                setTimeout(() => setLogRegInv("register"), 2000);
                setTimeout(() => setPageMsg(`Use the Registration Code sent to ${email}`), 2000);
            } else {
                throw new error("Something went wrong while sending your Registration code")
            }
        } catch (error) {
            const status = error.response.status;
            if (status === 401) {
                console.log("Unauthorized (401): ", status);
            } else if (status === 403) {
                console.log("Forbidden (403): ", error.response.data.detail);
            } else if (status === 409) {
                console.log("Conflict (409): ", error.response.data.detail);
            } else {
                console.log("Other error:", status);
            }
            setPageMsg(error.response.data.detail || "There was an error sending you an Registration Code")
            // console.error("Registration error:", error);
            // alert("An error occured during registration");
        }
    };

    const returnToLogin = async (e) => {
        setPageMsg("");
        setLogRegInv("login");
    }

    return (
        <div className="login-container">
            {logRegInv === "login" && (
                <div className="login-module">
                    <div className="login-page-title">{logRegInv.toUpperCase()}</div>
                    {pageMsg ? <div className="page-message">{pageMsg}</div> : ""}
                    <form className="login-form" onSubmit={handleLogin}>
                        <input
                            id="email-input"
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                        <input
                            id="password-input"
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                        <button 
                            className="login-button" 
                            type="submit">
                                Login
                        </button>
                    </form>
                </div>
                )
            }
        
            {logRegInv === "send registration code" && (
                <div className="invite-module">
                    <div className="page-message">{pageMsg}</div>
                    <form className="invite-form" onSubmit={getRegistrationCode}>
                        <input
                            id="email-input"
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                        <input
                            id="creationkey-input"
                            type="text"
                            placeholder="Account Creation Key"
                            value={creation_key}
                            onChange={(e) => setCreation_Key(e.target.value)}
                            required
                        />
                        <button 
                            className="invite-button"
                            type="submit">
                                Send Code
                        </button>
                    </form>
                </div>
                ) 
            }
            
            {logRegInv === "register" && (
                <div className="register-module">
                    <div className="page-message">{pageMsg}</div>
                    <form className="register-form" onSubmit={handleRegister}>
                        <input
                            id="name-input"
                            type="name"
                            placeholder="Name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                        <input
                            id="email-input"
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                        <input
                            id="password-input"
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                        <input
                            id="code-input"
                            type="code"
                            placeholder="Registration Code"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            required
                        />
                        <button 
                            className="register-button" 
                            type="submit">
                                Register
                        </button>
                    </form>
                </div>
                ) 
            }

            {logRegInv !== 'login' ? (
                    <div className="back-to-login-label" onClick={() => returnToLogin()}>Go Back to Login</div>
                ) : (
                    <div className="register-label" onClick={() => startInvite()}>Register a New Account</div>
                )
            }
        </div>
    );
}

export default AdminLogin;