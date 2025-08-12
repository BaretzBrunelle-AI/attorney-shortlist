import axios from "axios";
import api from "./axios_config";

export async function saveToken(token) {
    localStorage.setItem("access_token", token);
}

export async function getToken() {
    return localStorage.getItem("access_token");
}

export async function deleteToken() {
    localStorage.removeItem("access_token");
}

export async function saveValue(key, value) {
    if (!key || !value){
        console.error("Invalid key-value pair for local storage.");
        return;
    }

    localStorage.setItem(key, value);
}

export async function getValue(key) {
    if (!key) {
        console.error("Could not find value from invalid key");
        return;
    }
    return localStorage.getItem(key);
}

export async function deleteValue(key) {
    if (!key) {
        console.error("Invlaud key passed for deletion from local storage.");
        return;
    }
    localStorage.removeItem(key);
}

export async function verifyToken() {
    const token = await getToken();
    if (!token) {
        console.error("No token found. User is not authenticated.");
        return false;
    }

    try {
        const response = await api.get("/admin/verify-token");

        if (!response.data.user && response.status !== 200) {
            console.error("Token verification failed (no user returned).");
            return false;
        }

        return true;
    } catch (error) {
        console.error("Error verifying token:", error.response?.data || error.message);
        return false;
    }
}