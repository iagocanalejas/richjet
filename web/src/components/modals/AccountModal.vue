<template>
    <div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4">
        <div class="w-full max-w-md bg-gray-900 text-white rounded-2xl shadow-2xl p-6 space-y-6 animate-fadeIn">
            <div class="text-center space-y-1">
                <h2 class="text-xl font-bold tracking-wide">New Account</h2>
            </div>

            <div class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-300 mb-1">
                        <span class="text-sm">*</span> Name
                    </label>
                    <input
                        v-model.trim="account.name"
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

            <div>
                <label class="block text-sm font-medium text-gray-300 mb-1">
                    <span class="text-sm">*</span> Account Type
                </label>
                <select
                    v-model="account.account_type"
                    class="w-full bg-gray-800 text-white px-3 py-2 rounded-lg border border-gray-700 focus:outline-none focus:ring-2"
                    :class="{
                        'border-red-500 focus:ring-red-500': $errors.account_type,
                        'border-gray-700 focus:ring-blue-500': !$errors.account_type,
                    }"
                    required
                >
                    <option v-for="(label, type) in accountTypeLabels" :key="type" :value="type">
                        {{ label }}
                    </option>
                </select>
                <p v-if="$errors.account_type" class="mt-1 text-sm text-red-400">{{ $errors.account_type }}</p>
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
import type { Account, AccountType } from '@/types/user';
import { ref } from 'vue';

const props = defineProps({
    accounts: {
        type: Array as () => Account[],
        required: true,
    },
});

const emit = defineEmits(['save', 'close']);

const account = ref<Omit<Account, 'id' | 'user_id'>>({ name: '', account_type: 'BROKER' });
const $errors = ref<Partial<Record<keyof Account, string>>>({});

const accountTypeLabels: Record<AccountType, string> = {
    BROKER: 'Brokerage Account',
    BANK: 'Bank Account',
};

function save() {
    $errors.value = {};
    if (!account.value.name) $errors.value.name = 'Name cannot be empty.';
    if (props.accounts.some((a) => a.name.toUpperCase() === account.value.name.toUpperCase())) {
        $errors.value.name = 'Name already exists.';
    }
    if (!account.value.account_type) $errors.value.account_type = 'Account type is required.';

    if (Object.keys($errors.value).length > 0) return;
    emit('save', { ...account.value });
    account.value = { name: '', account_type: 'BROKER' };
}

function close() {
    $errors.value = {};
    account.value = { name: '', account_type: 'BROKER' };
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
