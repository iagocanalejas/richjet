<template>
    <div class="relative w-full max-w-md">
        <div class="flex items-center bg-gray-800 text-white rounded-lg overflow-hidden shadow-md">
            <span class="p-2">
                <svg
                    class="w-5 h-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 1010 17.5a7.5 7.5 0 006.65-3.85z"
                    ></path>
                </svg>
            </span>
            <input
                v-model="query"
                @input="$emit('on-search', query)"
                type="text"
                placeholder="Search..."
                class="bg-gray-800 text-white w-full py-2 px-3 focus:outline-none"
            />
            <button v-if="query" @click="clearSearch" class="absolute right-2 text-gray-400 hover:text-gray-200">
                <svg
                    class="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
            </button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const emit = defineEmits(['on-search']);
const query = ref('');

function clearSearch() {
    query.value = '';
    emit('on-search', query.value);
}
</script>
