<template>
    <div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4">
        <div class="w-full max-w-md bg-gray-900 text-white rounded-2xl shadow-2xl p-6 space-y-6 animate-fadeIn">
            <div class="text-center space-y-1">
                <h2 class="text-xl font-bold tracking-wide">Add Dividend for {{ transactionCopy.symbol.ticker }}</h2>
            </div>

            <div class="flex justify-center space-x-4">
                <button
                    class="px-4 py-2 rounded-md font-medium transition"
                    :class="[tabClass(dividendType === 'cash')]"
                    @click="dividendType = 'cash'"
                >
                    Cash Dividend
                </button>
                <button
                    class="px-4 py-2 rounded-md font-medium transition"
                    :class="[tabClass(dividendType === 'stock')]"
                    @click="dividendType = 'stock'"
                >
                    Stock Dividend
                </button>
            </div>

            <div v-if="dividendType === 'cash'" class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-300 mb-1">
                        <span class="text-sm">*</span> Amount (Cash)
                    </label>
                    <input
                        v-model="priceInput"
                        type="text"
                        inputmode="decimal"
                        pattern="[0-9]*[.,]?[0-9]*"
                        class="w-full bg-gray-800 text-white px-3 py-2 rounded-lg border border-gray-700 focus:outline-none focus:ring-2"
                        @input="transactionCopy.price = normalizeDecimalInput(priceInput)"
                        :class="{
                            'border-red-500 focus:ring-red-500': $errors.price,
                            'border-gray-700 focus:ring-blue-500': !$errors.price,
                        }"
                        required
                    />
                    <p v-if="$errors.price" class="mt-1 text-sm text-red-400">{{ $errors.price }}</p>
                </div>

                <div>
                    <label class="block text-sm font-medium text-gray-300">
                        Account
                        <select
                            v-model="transactionCopy.account"
                            class="mt-1 block w-full bg-gray-800 border border-gray-700 rounded-md py-2 px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 text-white"
                        >
                            <option :value="undefined">No account</option>
                            <option v-for="account in accounts" :key="account.name" :value="account">
                                {{ account.name }}
                            </option>
                        </select>
                    </label>
                </div>

                <div>
                    <label class="block text-sm font-medium text-gray-300 mb-1">Date</label>
                    <VueDatePicker
                        v-model="transactionCopy.date"
                        :format="dateFormat"
                        :locale="datePickerLocale"
                        :enable-time-picker="false"
                        auto-apply
                        dark
                    />
                </div>
            </div>

            <div v-else class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-300 mb-1">
                        <span class="text-sm">*</span> Quantity (Shares)
                    </label>
                    <input
                        v-model.number="transactionCopy.quantity"
                        type="number"
                        min="1"
                        step="1"
                        class="w-full bg-gray-800 text-white px-3 py-2 rounded-lg border border-gray-700 focus:outline-none focus:ring-2"
                        :class="{
                            'border-red-500 focus:ring-red-500': $errors.quantity,
                            'border-gray-700 focus:ring-blue-500': !$errors.quantity,
                        }"
                        required
                    />
                    <p v-if="$errors.quantity" class="mt-1 text-sm text-red-400">{{ $errors.quantity }}</p>
                </div>

                <div>
                    <label class="block text-sm font-medium text-gray-300">
                        Account
                        <select
                            v-model="transactionCopy.account"
                            class="mt-1 block w-full bg-gray-800 border border-gray-700 rounded-md py-2 px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 text-white"
                        >
                            <option :value="undefined">No account</option>
                            <option v-for="account in usableAccounts" :key="account.name" :value="account">
                                {{ account.name }}
                            </option>
                        </select>
                    </label>
                </div>

                <div>
                    <label class="block text-sm font-medium text-gray-300 mb-1">Date</label>
                    <VueDatePicker
                        v-model="transactionCopy.date"
                        :format="dateFormat"
                        :locale="datePickerLocale"
                        :enable-time-picker="false"
                        auto-apply
                        dark
                    />
                </div>
            </div>

            <div class="flex flex-col gap-2 pt-2">
                <button
                    @click="submit"
                    class="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-md text-sm font-semibold transition"
                >
                    Add {{ dividendType === 'cash' ? 'Cash' : 'Stock' }} Dividend
                </button>
                <button
                    @click="close()"
                    class="w-full bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-md text-sm font-medium transition"
                >
                    Cancel
                </button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { TransactionItem } from '@/types/portfolio';
import { normalizeDecimalInput, locale, dateFnsLocale } from '@/utils/utils';
import { computed, onMounted, reactive, ref, watch, type PropType } from 'vue';
import { storeToRefs } from 'pinia';
import { useSettingsStore } from '@/stores/settings';
import { VueDatePicker } from '@vuepic/vue-datepicker';
import type { Locale } from 'date-fns';
import { useTransactionsStore } from '@/stores/transactions';
import { isSavingsAccount } from '@/utils/rules';

const props = defineProps({
    transaction: { type: Object as PropType<Omit<TransactionItem, 'id' | 'user_id'>>, required: true },
});

const emit = defineEmits(['add-dividend', 'close']);

const { accounts } = storeToRefs(useSettingsStore());
const { transactions } = storeToRefs(useTransactionsStore());
const datePickerLocale = ref<Locale | undefined>();

const dividendType = ref<'cash' | 'stock'>('cash');
const priceInput = ref('');
const $errors = ref<{ price?: string; quantity?: string }>({});

const usableAccounts = computed(() =>
    accounts.value
        .filter((account) => !isSavingsAccount(account))
        .filter((account) =>
            transactions.value.some((t) => t.symbol.id === props.transaction.symbol.id && t.account?.id === account.id)
        )
);

const transactionCopy = reactive({ ...props.transaction });
onMounted(async () => {
    if (usableAccounts.value.length === 1 && !transactionCopy.account) {
        transactionCopy.account = usableAccounts.value[0];
    }
    datePickerLocale.value = await dateFnsLocale();
});
watch(
    () => props.transaction,
    (newVal) => {
        Object.assign(transactionCopy, newVal);
        if (usableAccounts.value.length === 1 && !transactionCopy.account) {
            transactionCopy.account = usableAccounts.value[0];
        }
    }
);

function dateFormat(date: Date) {
    return new Intl.DateTimeFormat(locale()).format(date);
}

function submit() {
    $errors.value = {};
    transactionCopy.transaction_type = dividendType.value === 'cash' ? 'DIVIDEND-CASH' : 'DIVIDEND';
    if (transactionCopy.transaction_type === 'DIVIDEND-CASH' && transactionCopy.price <= 0) {
        $errors.value.price = 'Price must be greater than 0.';
        return;
    }
    if (transactionCopy.transaction_type === 'DIVIDEND' && transactionCopy.quantity <= 0) {
        $errors.value.quantity = 'Quantity must be greater than 0.';
        return;
    }

    emit('add-dividend', transactionCopy);
}

function close() {
    $errors.value = {};
    emit('close');
}

function tabClass(selected: boolean) {
    return selected ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600';
}
</script>
