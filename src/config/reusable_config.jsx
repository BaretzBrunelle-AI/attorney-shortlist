import axios from "axios";
import api from "./axios_config";

export async function saveToken(token, admin = false) {
    if (admin) {
        localStorage.setItem("admin_token", token);
    }
    localStorage.setItem("access_token", token);
}

export async function getToken(admin = false) {
    if (admin) {
        const adminToken = localStorage.getItem("admin_token");
        return adminToken;
    }
    return localStorage.getItem("access_token");
}

export async function deleteToken() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("admin_token");
}

export async function saveValue(key, value) {
    if (!key) {
        console.error("Invalid key for local storage.");
        return;
    }
    localStorage.setItem(key, value ?? "");
}

export async function getValue(key) {
    if (!key) return null;
    return localStorage.getItem(key);
}

export async function deleteValue(key) {
    if (!key) return;
    localStorage.removeItem(key);
}

export async function verifyToken(admin = false) {
    if (admin === false) {
        //base user
        const token = await getToken(false);
        if (!token) {
            console.error("No token found. User is not authenticated.");
            return false;
        }

        try {
            const response = await api.get("/user/verify-access-token",
                {
                    admin: false,
                }
            );

            if (!response.data.user && response.status !== 200) {
                console.error("Token verification failed (no user returned).");
                return false;
            }

            return true;
        } catch (error) {
            console.error("Error verifying token:", error.response?.data || error.message);
            return false;
        }
    } else {
        //admin user
        const token = await getToken(admin);
        if (!token) {
            console.error("No admin token found. User is not authenticated.");
            return false;
        }

        try {
            const response = await api.get("/admin/verify-token",
                {
                    admin: true,
                }
            );

            if (!response.data.user && response.status !== 200) {
                console.error("Admin token verification failed (no user returned).");
                return false;
            }

            return true;
        } catch (error) {
            console.error("Error verifying admin token:", error.response?.data || error.message);
            return false;
        }
    }
}