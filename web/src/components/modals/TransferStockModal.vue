<template>
    <div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4">
        <div class="w-full max-w-md bg-gray-900 text-white rounded-2xl shadow-2xl p-6 space-y-6 animate-fadeIn">
            <div class="text-center space-y-1">
                <h2 class="text-xl font-bold tracking-wide">New account for {{ item.symbol.ticker }}</h2>
                <p class="text-sm text-gray-400">{{ item.symbol.security_type }}</p>
            </div>

            <div class="space-y-4">
                <label class="block text-sm font-medium text-gray-300">
                    Select Account
                    <select
                        v-model="newAccount"
                        class="mt-1 block w-full bg-gray-800 border border-gray-700 rounded-md py-2 px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 text-white"
                    >
                        <option :value="undefined">No account</option>
                        <option v-for="account in accounts" :key="account.name" :value="account">
                            {{ account.name }}
                        </option>
                    </select>
                </label>
            </div>

            <div class="flex flex-col gap-2 pt-2">
                <button
                    @click="transfer()"
                    class="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-md text-sm font-semibold transition cursor-pointer"
                >
                    Transfer
                </button>
                <button
                    @click="$emit('close')"
                    class="w-full bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-md text-sm font-semibold transition cursor-pointer"
                >
                    Cancel
                </button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { useSettingsStore } from '@/stores/settings';
import type { Account } from '@/types/user';
import type { PortfolioItem } from '@/types/portfolio';
import { storeToRefs } from 'pinia';
import { ref } from 'vue';

const props = defineProps({
    item: {
        type: Object as () => PortfolioItem,
        required: true,
    },
    selectedAccount: {
        type: Object as () => Account | undefined,
        default: undefined,
    },
});

const emit = defineEmits(['transfer', 'close']);

const { accounts } = storeToRefs(useSettingsStore());

const newAccount = ref<Account | undefined>();

function transfer() {
    if (props.selectedAccount?.name === newAccount?.value?.name) {
        emit('close');
        return;
    }
    emit('transfer', newAccount?.value);
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
