<template>
    <div ref="dropdown" class="relative inline-block text-center text-white">
        <button
            @click="isDropdownOpen = !isDropdownOpen"
            class="inline-flex items-center justify-between bg-gray-800 px-4 py-2 rounded-md hover:bg-gray-700"
        >
            {{ selected }}
            <svg class="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
        </button>

        <div
            v-if="isDropdownOpen"
            class="absolute right-0 z-50 mt-2 w-30 bg-gray-800 text-white rounded-lg shadow-lg ring-1 ring-white/10"
        >
            <div
                v-for="currency in CURRENCIES"
                :key="currency"
                class="group flex items-center justify-between px-4 py-2 hover:bg-gray-700"
            >
                <span @click="select(currency)" class="cursor-pointer truncate w-full">
                    {{ currency }}
                </span>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';

const CURRENCIES = ['USD', 'EUR'];

defineProps({ selected: { type: String, required: true } });

const emit = defineEmits(['select']);

const isDropdownOpen = ref(false);
const dropdown = ref<HTMLElement | null>(null);

function select(item?: string) {
    emit('select', item);
    isDropdownOpen.value = false;
}

function handleClickOutside(event: MouseEvent) {
    if (dropdown.value && !dropdown.value.contains(event.target as Node)) {
        isDropdownOpen.value = false;
    }
}

onMounted(() => {
    document.addEventListener('click', handleClickOutside);
});

onBeforeUnmount(() => {
    document.removeEventListener('click', handleClickOutside);
});
</script>
