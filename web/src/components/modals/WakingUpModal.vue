<template>
    <div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4">
        <div class="w-full max-w-xl bg-gray-900 text-white rounded-2xl shadow-2xl p-6 space-y-6 animate-fadeIn">
            <div class="flex justify-center">
                <svg
                    class="animate-spin h-8 w-8 text-blue-400"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                >
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
            </div>

            <div class="text-center space-y-1">
                <h2 class="text-xl font-bold tracking-wide text-blue-400">Waking up the servers...</h2>
                <p class="text-sm text-gray-300">{{ currentMessage }}</p>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

const messages = [
    'Brewing coffee for the CPUs...',
    'Convincing electrons to move faster...',
    'Tickling the database awake...',
    'Negotiating with the cloud gremlins...',
    'Sacrificing a rubber duck for good luck...',
    'Rewiring some spaghetti code...',
];

const currentMessage = ref(messages[0]);
let intervalId: number;

// TODO: while this is open, if a fetch times out, we should retry the fetch
onMounted(() => {
    let index = 0;
    intervalId = setInterval(() => {
        index = (index + 1) % messages.length;
        currentMessage.value = messages[index];
    }, 5000);
});

onUnmounted(() => {
    clearInterval(intervalId);
});
</script>

<style scoped>
@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.animate-fadeIn {
    animation: fadeIn 0.3s ease-out;
}
</style>
