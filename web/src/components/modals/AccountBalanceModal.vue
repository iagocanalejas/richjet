<template>
    <div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4">
        <div class="w-full max-w-md bg-gray-900 text-white rounded-2xl shadow-2xl p-6 space-y-6 animate-fadeIn">
            <div class="text-center space-y-1">
                <h2 class="text-xl font-bold tracking-wide">New Account Balance</h2>
            </div>

            <div class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-300 mb-1">
                        <span class="text-sm">*</span> Balance ({{ account.currency }})
                    </label>
                    <input
                        v-model="priceInput"
                        type="text"
                        inputmode="decimal"
                        pattern="[0-9]*[.,]?[0-9]*"
                        class="w-full bg-gray-800 text-white px-3 py-2 rounded-lg border border-gray-700 focus:outline-none focus:ring-2"
                        @input="accountCopy.balance = normalizePriceInput(priceInput)"
                        :class="{
                            'border-red-500 focus:ring-red-500': $errors.balance,
                            'border-gray-700 focus:ring-blue-500': !$errors.balance,
                        }"
                        required
                    />
                    <p v-if="$errors.balance" class="mt-1 text-sm text-red-400">{{ $errors.balance }}</p>
                </div>
            </div>

            <div class="flex flex-col gap-2 pt-2">
                <button
                    @click="save()"
                    class="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-md text-sm font-semibold transition cursor-pointer"
                >
                    Update Balance
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
import { normalizePriceInput } from '@/utils/utils';
import { isValidBalance } from '@/utils/validators';
import { reactive, ref, watch } from 'vue';

const props = defineProps({
    account: {
        type: Object as () => Account,
        required: true,
    },
});

const emit = defineEmits(['save', 'close']);

const priceInput = ref('');
const $errors = ref<Partial<Record<keyof Account, string>>>({});

const accountCopy = reactive({ ...props.account });
watch(
    () => props.account,
    (newVal) => Object.assign(accountCopy, newVal)
);

function save() {
    $errors.value = {};
    if (!accountCopy.balance || !isValidBalance(accountCopy.balance)) {
        $errors.value.balance = 'Balance must be a positive number.';
        return;
    }
    emit('save', accountCopy);
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
