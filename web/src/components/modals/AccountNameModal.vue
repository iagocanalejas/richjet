<template>
    <div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4">
        <div class="w-full max-w-md bg-gray-900 text-white rounded-2xl shadow-2xl p-6 space-y-6 animate-fadeIn">
            <div class="text-center space-y-1">
                <h2 class="text-xl font-bold tracking-wide">New Account Name</h2>
            </div>

            <div class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-300 mb-1">
                        <span class="text-sm">*</span> Name
                    </label>
                    <input
                        v-model.trim="name"
                        type="text"
                        class="w-full bg-gray-800 text-white px-3 py-2 rounded-lg border border-gray-700 focus:outline-none focus:ring-2"
                        :class="{
                            'border-red-500 focus:ring-red-500': $errors.name,
                            'border-gray-700 focus:ring-blue-500': !$errors.name,
                        }"
                        required
                    />
                    <p v-if="$errors.name" class="mt-1 text-sm text-red-400">{{ $errors.name }}</p>
                </div>
            </div>

            <div class="flex flex-col gap-2 pt-2">
                <button
                    @click="save()"
                    class="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-md text-sm font-semibold transition cursor-pointer"
                >
                    Create Account
                </button>
                <button
                    @click="close()"
                    class="w-full bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-md text-sm font-semibold transition cursor-pointer"
                >
                    Cancel
                </button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { Account } from '@/types/user';
import { ref } from 'vue';

const props = defineProps({
    accounts: {
        type: Array as () => Account[],
        required: true,
    },
});

const emit = defineEmits(['set-name', 'close']);

const name = ref('');
const $errors = ref<{ name?: string }>({});

function save() {
    $errors.value = {};
    if (!name.value) {
        $errors.value.name = 'Name cannot be empty.';
        return;
    }
    if (props.accounts.some((a) => a.name.toUpperCase() === name.value.toUpperCase())) {
        $errors.value.name = 'Name already exists.';
        return;
    }
    emit('set-name', name.value.trim());
}

function close() {
    $errors.value = {};
    emit('close');
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
</style>
