import { defineStore } from "pinia";
import { computed, ref } from "vue";
import type { FileData, GoogleUser } from "@/types/google";
import { usePortfolioStore } from "./portfolio";
import { useWatchlistStore } from "./watchlist";
import { useSettingsStore } from "./settings";

export const useGoogleStore = defineStore("google-store", () => {
	const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
	const FILE_NAME = import.meta.env.VITE_GOOGLE_FILE_NAME;
	const GOOGLE_FILE_ID_KEY = "google-file-id";
	const GOOGLE_SETTINGS_KEY = "google-settings";

	const client = ref<google.accounts.oauth2.TokenClient>();
	const token = ref<google.accounts.oauth2.TokenResponse>();
	const user = ref<GoogleUser>();

	let _fileId: string | undefined = localStorage.getItem(GOOGLE_FILE_ID_KEY) ?? undefined;
	const fileId = computed<string | undefined>({
		get: () => _fileId,
		set: (value) => {
			_fileId = value;
			if (!value) {
				localStorage.removeItem(GOOGLE_FILE_ID_KEY);
			} else {
				localStorage.setItem(GOOGLE_FILE_ID_KEY, value);
			}
		}
	})

	const isLogged = computed(() => !!token.value?.access_token);

	const _clientCallback = async (tokenResponse: google.accounts.oauth2.TokenResponse) => {
		if (!tokenResponse.access_token) return;
		token.value = tokenResponse;

		if (!user.value) {
			const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
				headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
			});
			user.value = (await res.json()) as GoogleUser;
		}

		localStorage.setItem(GOOGLE_SETTINGS_KEY, JSON.stringify({ token: token.value, user: user.value }));

		// @ts-ignore : reset the callback to the original function
		client.value!.callback = _clientCallback;
	};

	async function init() {
		const storedSettings = localStorage.getItem(GOOGLE_SETTINGS_KEY);
		if (storedSettings) {
			const parsedSettings = JSON.parse(storedSettings);
			token.value = parsedSettings.token;
			user.value = parsedSettings.user;
		}

		// init google client
		client.value = window.google.accounts.oauth2.initTokenClient({
			client_id: CLIENT_ID,
			scope: "openid profile email https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/drive.file",
			callback: _clientCallback,
		});

		if (token.value?.access_token) {
			return await downloadData();
		}
	}

	function revoke() {
		if (!token.value?.access_token) return;
		window.google.accounts.oauth2.revoke(token.value?.access_token, () => {
			token.value = undefined;
			user.value = undefined;
			_fileId = undefined;
			localStorage.removeItem(GOOGLE_SETTINGS_KEY);
			localStorage.removeItem(GOOGLE_FILE_ID_KEY);
		});

	}

	async function downloadData() {
		if (!token.value?.access_token) throw new Error("No access token available");
		console.log("downloading google data");

		try {
			if (!fileId.value) await _searchSavedFileID();
			if (!fileId.value) return;

			const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId.value}?alt=media`, {
				headers: { Authorization: `Bearer ${token.value?.access_token}` },
			});

			if (!res.ok) {
				if (res.status === 401) throw new Error("Token expired");
				console.error("Failed to upload file:", await res.text());
				return;
			}

			return (await res.json()) as FileData;
		} catch (error) {
			console.warn("Attempting token refresh:", error);
			return new Promise<FileData | undefined>((resolve, reject) => {
				// @ts-ignore
				client.value!.callback = async (tokenResponse: google.accounts.oauth2.TokenResponse) => {
					try {
						await _clientCallback(tokenResponse);
						resolve(await downloadData());
					} catch (err) {
						reject(err);
					}
				};

				client.value!.requestAccessToken();
			});
		}
	}

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
		if (!fileId.value) {
			// @ts-ignore
			metadata.parents = ["appDataFolder"];
		}

		const form = new FormData();
		form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
		form.append("file", fileBlob);

		try {
			console.log(fileId.value ? `syncing google data: ${fileId.value}` : "creating google data");
			const url = fileId.value
				? `https://www.googleapis.com/upload/drive/v3/files/${fileId.value}?uploadType=multipart`
				: "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart";
			const res = await fetch(url, {
				method: fileId.value ? "PATCH" : "POST",
				headers: new Headers({ Authorization: "Bearer " + token.value?.access_token }),
				body: form,
			});

			if (!res.ok) {
				if (res.status === 401) throw new Error("Token expired");
				console.error("Failed to upload file:", await res.text());
				return;
			}
			console.log("google data synced");

			fileId.value = (await res.json()).id;
		} catch (error) {
			console.warn("Attempting token refresh:", error);
			return new Promise<void>((resolve, reject) => {
				// @ts-ignore
				client.value!.callback = async (tokenResponse: google.accounts.oauth2.TokenResponse) => {
					try {
						await _clientCallback(tokenResponse);
						resolve(await syncData());
					} catch (err) {
						reject(err);
					}
				};

				client.value!.requestAccessToken();
			});
		}
	}

	async function _searchSavedFileID() {
		if (fileId.value) return;
		if (!token.value?.access_token) throw new Error("No access token available");
		console.log("searching for file ID");

		try {
			const query = encodeURIComponent(`name='${FILE_NAME}' and 'appDataFolder' in parents and trashed=false`);
			const res = await fetch(
				`https://www.googleapis.com/drive/v3/files?q=${query}&spaces=appDataFolder&fields=files(id,name)`,
				{ headers: { Authorization: `Bearer ${token.value?.access_token}` } },
			);

			if (!res.ok) {
				if (res.status === 401) throw new Error("Token expired");
				console.error("Failed to upload file:", await res.text());
				return;
			}

			const { files } = await res.json();
			fileId.value = files?.[0]?.id;
		} catch (error) {
			console.warn("Attempting token refresh:", error);
			return new Promise<void>((resolve, reject) => {
				// @ts-ignore
				client.value!.callback = async (tokenResponse: google.accounts.oauth2.TokenResponse) => {
					try {
						await _clientCallback(tokenResponse);
						resolve(await _searchSavedFileID());
					} catch (err) {
						reject(err);
					}
				};

				client.value!.requestAccessToken();
			});
		}
	}


	return { client, user, isLogged, init, revoke, syncData, downloadData };
});
