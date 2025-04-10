import { defineStore } from "pinia";
import { ref } from "vue";
import { useSettingsStore } from "./settings";
import type { GoogleUser } from "@/types/google";

export const useGoogleStore = defineStore("google-store", () => {
    const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    const settingsStore = useSettingsStore();

    const client = ref<google.accounts.oauth2.TokenClient>();

    function init() {
        client.value = window.google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: "openid profile email https://www.googleapis.com/auth/drive.file",
            callback: async (tokenResponse) => {
                if (tokenResponse.access_token) {
                    const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
                        headers: {
                            Authorization: `Bearer ${tokenResponse.access_token}`,
                        },
                    });
                    const userInfo = (await res.json()) as GoogleUser;
                    settingsStore.updateGoogleData(tokenResponse, userInfo);
                }
            },
        });
    }

    function revoke() {
        if (settingsStore.auth_token?.access_token) {
            window.google.accounts.oauth2.revoke(settingsStore.auth_token?.access_token, () =>
                settingsStore.updateGoogleData(),
            );
        }
    }

    return { init, revoke, googleClient: client };
});
