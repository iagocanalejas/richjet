<template>
    <div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4">
        <div class="w-full max-w-xl bg-gray-900 text-white rounded-2xl shadow-2xl p-6 space-y-6 animate-fadeIn">
            <div class="text-center space-y-1">
                <h2 class="text-xl font-bold tracking-wide text-red-400">Something went wrong</h2>
                <p class="text-sm text-gray-300">Please review the error(s) below:</p>
            </div>

            <ul class="space-y-2 max-h-60 overflow-y-auto pr-1">
                <li
                    v-for="(error, index) in errors"
                    :key="index"
                    class="bg-red-800/30 text-red-300 p-3 rounded-lg text-sm border border-red-700"
                >
                    {{ error.readable_message }}

                    <div v-if="error.trace" class="mt-2 text-right">
                        <button @click="toggleTrace(index)" class="text-xs text-blue-400 hover:underline transition">
                            {{ showTrace[index] ? 'Hide details' : 'Show more' }}
                        </button>
                    </div>

                    <!-- HACK: never format the <pre></pre>, it will break all the formating -->
                    <pre
                        v-if="showTrace[index] && error.trace"
                        class="bg-gray-800 text-gray-300 text-xs mt-2 p-3 rounded-lg border border-gray-700 overflow-x-auto whitespace-pre"
                    ><code v-text="formatTrace(error.trace)"/></pre>
                </li>
            </ul>

            <div class="pt-2">
                <button
                    @click="clearErrors"
                    class="w-full bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-md text-sm font-semibold transition cursor-pointer"
                >
                    Close
                </button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { useErrorsStore } from '@/stores/errors';
import { storeToRefs } from 'pinia';
import { ref, watchEffect } from 'vue';

const errorsStore = useErrorsStore();
const { errors } = storeToRefs(errorsStore);
const { clearErrors } = errorsStore;
const showTrace = ref<boolean[]>([]);

watchEffect(() => {
    showTrace.value = errors.value.map(() => false);
});

function toggleTrace(index: number) {
    showTrace.value[index] = !showTrace.value[index];
}

function formatTrace(trace: unknown): string {
    if (typeof trace === 'string') {
        try {
            const parsed = JSON.parse(trace);
            return JSON.stringify(parsed, null, 2);
        } catch {
            return trace;
        }
    } else if (Array.isArray(trace)) {
        return trace.map((line) => line.toString()).join('\n');
    } else if (typeof trace === 'object' && trace !== null) {
        return JSON.stringify(trace, null, 2);
    }
    return '';
}
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

/* Style the scrollbar for webkit browsers */
ul::-webkit-scrollbar,
pre::-webkit-scrollbar {
    width: 8px;
}

ul::-webkit-scrollbar-track,
pre::-webkit-scrollbar-track {
    background: transparent;
}

ul::-webkit-scrollbar-thumb,
pre::-webkit-scrollbar-thumb {
    background-color: #4b5563; /* Tailwind's gray-600 */
    border-radius: 6px;
    border: 2px solid transparent;
    background-clip: content-box;
}

ul::-webkit-scrollbar-thumb:hover,
pre::-webkit-scrollbar-thumb:hover {
    background-color: #6b7280; /* Tailwind's gray-500 */
}

ul,
pre {
    scroll-behavior: smooth;
    padding-right: 4px;
}

code {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
}
</style>
