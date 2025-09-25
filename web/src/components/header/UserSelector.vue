<template>
    <div class="hidden md:block relative" v-if="user?.picture">
        <img
            :src="user.picture"
            alt="User"
            class="w-10 h-10 rounded-full object-cover border-2 border-blue-400 cursor-pointer"
            @click="showMenu = !showMenu"
        />
        <div
            v-if="showMenu"
            class="absolute right-0 mt-2 w-50 bg-gray-800 text-white rounded-lg shadow-lg z-50 border border-gray-700"
        >
            <button
                @click="goToSettings"
                class="block w-full text-left px-4 py-2 hover:bg-gray-700 rounded-b-lg transition"
            >
                Manage Subscription
            </button>
            <button @click="signOut" class="block w-full text-left px-4 py-2 hover:bg-gray-700 rounded-b-lg transition">
                Sign out
            </button>
        </div>
    </div>
    <div v-else>
        <button
            @click="signIn"
            class="flex items-center gap-2 bg-white text-gray-700 px-3 py-3 rounded-full shadow hover:shadow-md transition hover:bg-gray-100"
        >
            <img src="https://developers.google.com/identity/images/g-logo.png" alt="Google logo" class="w-5 h-5" />
        </button>
    </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { ref } from 'vue';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const authStore = useAuthStore();
const { user } = storeToRefs(authStore);

const showMenu = ref(false);

function signIn() {
    authStore.login();
}

function signOut(): void {
    authStore.logout();
    showMenu.value = false;
}

function goToSettings() {
    router.push('/settings');
    showMenu.value = false;
}
</script>
