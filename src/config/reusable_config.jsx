import api from "./axios_config";

const ACCESS_CODE_KEY = "access_token";
const USER_SESSION_KEY = "user_session_token";
const ADMIN_TOKEN_KEY = "admin_token";

export async function saveToken(token, admin = false) {
    if (admin) {
        localStorage.setItem(ADMIN_TOKEN_KEY, token);
    } else {
        localStorage.setItem(ACCESS_CODE_KEY, token);
    }
}

export async function getToken(admin = false) {
    if (admin) {
        return localStorage.getItem(ADMIN_TOKEN_KEY);
    } else {
        return localStorage.getItem(ACCESS_CODE_KEY);
    }
}

export async function deleteToken() {
    localStorage.removeItem(ACCESS_CODE_KEY);
    localStorage.removeItem(USER_SESSION_KEY);
    localStorage.removeItem(ADMIN_TOKEN_KEY);
}

export async function saveValue(key, value) {
    if (!key) {
        console.error("invalid key for local storage.");
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

function getOrCreateDeviceId() {
    let id = null;
    try {
        id = localStorage.getItem("device_id");
    } catch {
        id = null;
    }

    if (!id) {
        try {
            if (typeof crypto !== "undefined" && crypto.randomUUID) {
                id = crypto.randomUUID();
            } else {
                id =
                    Math.random().toString(36).slice(2) +
                    Date.now().toString(36);
            }
        } catch {
            id =
                Math.random().toString(36).slice(2) +
                Date.now().toString(36);
        }

        try {
            localStorage.setItem("device_id", id);
        } catch {
            // ignore storage failures
        }
    }

    return id;
}

// helper just for the jwt session
async function saveSessionToken(token) {
    localStorage.setItem(USER_SESSION_KEY, token);
}

export async function getSessionToken() {
    return localStorage.getItem(USER_SESSION_KEY);
}

/**
 * exchange a one-time access_code for a 24h jwt session token
 * sends { access_code, device_id } to backend
 */
export async function exchangeAccessCodeForSession(accessCode) {
    const trimmed = String(accessCode || "").trim();
    if (!trimmed) {
        throw new Error("missing access code");
    }

    const device_id = getOrCreateDeviceId();

    const body = {
        access_code: trimmed,
        device_id,
    };

    const res = await api.post("/access/exchange", body, {
        admin: false,
    });

    const { token, email, projects, expires_at } = res.data || {};
    if (!token) {
        throw new Error("no token returned from /access/exchange");
    }

    // store jwt as the user session token
    await saveSessionToken(token);

    // we store the raw access code separately in runLogin via saveToken(trimmed, false)

    await saveValue("user_email", email || "");
    await saveValue(
        "user_projects",
        projects ? JSON.stringify(projects) : "[]"
    );
    await saveValue(
        "user_token_expires_at",
        expires_at ? String(expires_at) : ""
    );

    return res.data;
}

export async function verifyAccess() {
    return verifyToken(false);
}

/**
 * verify token
 * - admin=false  -> verify user session (jwt)
 * - admin=true   -> verify admin session
 */
export async function verifyToken(admin = false) {
    if (!admin || admin === false) {
        // user session (uses jwt stored in USER_SESSION_KEY)
        const sessionToken = await getSessionToken();
        if (!sessionToken) {
            console.error("no user session token found. user is not authenticated.");
            return false;
        }

        try {
            const response = await api.get("/user/verify-access-token", {
                admin: false,
            });

            if (!response.data.user && response.status !== 200) {
                console.error("token verification failed (no user returned).");
                return false;
            }

            return true;
        } catch (error) {
            console.error(
                "error verifying user token:",
                error.response?.data || error.message
            );
            return false;
        }
    } else if (admin === true) {
        // admin session
        const token = await getToken(true);
        if (!token) {
            console.error("no admin token found. user is not authenticated.");
            return false;
        }

        try {
            const response = await api.get("/admin/verify-token", {
                admin: true,
            });

            if (!response.data.user && response.status !== 200) {
                console.error(
                    "admin token verification failed (no user returned)."
                );
                return false;
            }

            return true;
        } catch (error) {
            console.error(
                "error verifying admin token:",
                error.response?.data || error.message
            );
            return false;
        }
    }
}