import { defineStore } from "pinia";
import { ref } from "vue";
import type { FileData, GoogleUser } from "@/types/google";
import { usePortfolioStore } from "./portfolio";
import { useWatchlistStore } from "./shares";
import { useSettingsStore } from "./settings";

export const useGoogleStore = defineStore("google-store", () => {
    const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    const FILE_NAME = import.meta.env.VITE_GOOGLE_FILE_NAME;

    const client = ref<google.accounts.oauth2.TokenClient>();
    const token = ref<google.accounts.oauth2.TokenResponse>();
    const user = ref<GoogleUser>();

    async function init() {
        const storedSettings = localStorage.getItem("google-settings");
        if (storedSettings) {
            const parsedSettings = JSON.parse(storedSettings);
            token.value = parsedSettings.token;
            user.value = parsedSettings.user;
        }

        client.value = window.google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: "openid profile email https://www.googleapis.com/auth/drive.file",
            callback: _clientCallback,
        });

        if (token.value?.access_token) {
            return await downloadData();
        }
    }

    const _clientCallback = async (tokenResponse: google.accounts.oauth2.TokenResponse) => {
        if (tokenResponse.access_token) {
            let userInfo: GoogleUser | undefined;
            if (!user.value) {
                const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
                    headers: {
                        Authorization: `Bearer ${tokenResponse.access_token}`,
                    },
                });
                userInfo = (await res.json()) as GoogleUser;
            }
            token.value = tokenResponse;
            user.value = userInfo ?? user.value;

            localStorage.setItem("google-settings", JSON.stringify({ token: token.value, user: user.value }));

            // @ts-ignore
            client.value!.callback = _clientCallback; // Reset the callback to the original function
        }
    };

    function revoke() {
        if (token.value?.access_token) {
            window.google.accounts.oauth2.revoke(token.value?.access_token, () => {
                token.value = undefined;
                user.value = undefined;
                localStorage.removeItem("google-settings");
            });
        }
    }

    let fileId: string | undefined;

    async function syncData() {
        if (!token.value?.access_token) throw new Error("No access token available");

        const settingsStore = useSettingsStore();
        const portfolioStore = usePortfolioStore();
        const watchlistStore = useWatchlistStore();

        const data: FileData = {
            version: 0,
            settings: settingsStore.settings,
            transactions: portfolioStore.transactions,
            watchlist: watchlistStore.watchlist,
        };
        const fileBlob = new Blob([JSON.stringify(data)], { type: "text/plain" });
        const metadata = { name: FILE_NAME, mimeType: "text/plain" };

        const form = new FormData();
        form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
        form.append("file", fileBlob);

        try {
            const url = fileId
                ? `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`
                : "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart";
            const response = await fetch(url, {
                method: fileId ? "PATCH" : "POST",
                headers: new Headers({ Authorization: "Bearer " + token.value?.access_token }),
                body: form,
            });
            if (!response.ok) {
                if (response.status === 401) throw new Error("Token expired");
                console.error("Failed to upload file:", await response.text());
                return;
            }

            console.log("data synced");
            return (await response.json()).id;
        } catch (error) {
            console.warn("Attempting token refresh:", error);
            // @ts-ignore
            client.value!.callback = async (tokenResponse: google.accounts.oauth2.TokenResponse) => {
                await _clientCallback(tokenResponse);
                syncData();
            };
            client.value!.requestAccessToken();
        }
    }

    async function downloadData() {
        console.log("downloading data");
        if (!token.value?.access_token) throw new Error("No access token available");

        try {
            const authHeader = { Authorization: `Bearer ${token.value?.access_token}` };
            const query = encodeURIComponent(`name='${FILE_NAME}' and trashed=false`);
            const searchRes = await fetch(
                `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`,
                { headers: authHeader },
            );

            if (!searchRes.ok) {
                if (searchRes.status === 401) throw new Error("Token expired");
                console.error("Failed to upload file:", await searchRes.text());
                return;
            }

            const { files } = await searchRes.json();
            fileId = files?.[0]?.id;
            if (!fileId) {
                console.warn("No file found with the specified name.");
                return;
            }

            const fileRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
                headers: authHeader,
            });

            if (!fileRes.ok) {
                if (fileRes.status === 401) throw new Error("Token expired");
                console.error("Failed to upload file:", await fileRes.text());
                return;
            }

            return (await fileRes.json()) as FileData;
        } catch (error) {
            console.warn("Attempting token refresh:", error);
            // @ts-ignore
            client.value!.callback = async (tokenResponse: google.accounts.oauth2.TokenResponse) => {
                await _clientCallback(tokenResponse);
                downloadData();
            };
            client.value!.requestAccessToken();
        }
    }

    return { client, user, init, revoke, syncData, downloadData };
});
