<template>
    <div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4">
        <div class="w-full max-w-md bg-gray-900 text-white rounded-2xl shadow-2xl p-6 space-y-6 animate-fadeIn">
            <div class="text-center space-y-1">
                <h2 class="text-xl font-bold tracking-wide">New share</h2>
            </div>

            <div class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-300 mb-1">
                        <span class="text-sm">*</span> Ticker
                    </label>
                    <input
                        v-model.trim="shareCopy.ticker"
                        type="text"
                        class="w-full bg-gray-800 text-white px-3 py-2 rounded-lg border border-gray-700 focus:outline-none focus:ring-2"
                        :class="{
                            'border-red-500 focus:ring-red-500': $errors.ticker,
                            'border-gray-700 focus:ring-blue-500': !$errors.ticker,
                        }"
                        required
                    />
                    <p v-if="$errors.ticker" class="mt-1 text-sm text-red-400">{{ $errors.ticker }}</p>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-300 mb-1">
                        <span class="text-sm">*</span> Name
                    </label>
                    <input
                        v-model.trim="shareCopy.name"
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
                <div>
                    <label class="block text-sm font-medium text-gray-300 mb-1">
                        <span class="text-sm">*</span> Security Type
                    </label>
                    <select
                        v-model="shareCopy.security_type"
                        class="w-full bg-gray-800 text-white px-3 py-2 rounded-lg border border-gray-700 focus:outline-none focus:ring-2"
                        :class="{
                            'border-red-500 focus:ring-red-500': $errors.security_type,
                            'border-gray-700 focus:ring-blue-500': !$errors.security_type,
                        }"
                        required
                    >
                        <option v-for="(label, type) in securityTypeLabels" :key="type" :value="type">
                            {{ label }}
                        </option>
                    </select>
                    <p v-if="$errors.security_type" class="mt-1 text-sm text-red-400">{{ $errors.security_type }}</p>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-300 mb-1">Market Sector</label>
                    <select
                        v-model="shareCopy.market_sector"
                        class="w-full bg-gray-800 text-white px-3 py-2 rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option v-for="(label, type) in marketSectorLabels" :key="type" :value="type">
                            {{ label }}
                        </option>
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-300 mb-1">ISIN</label>
                    <input
                        v-model="shareCopy.isin"
                        type="text"
                        class="w-full bg-gray-800 text-white px-3 py-2 rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
            </div>

            <div class="flex flex-col gap-2 pt-2">
                <div class="flex gap-2">
                    <button
                        @click="reset"
                        class="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-md text-sm font-semibold transition cursor-pointer"
                    >
                        Reset
                    </button>
                    <button
                        @click="save"
                        class="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-md text-sm font-semibold transition cursor-pointer"
                    >
                        Save
                    </button>
                </div>
                <button
                    @click="close()"
                    class="w-full bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-md text-sm font-medium transition cursor-pointer"
                >
                    Cancel
                </button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { type MarketSector, type SecurityType, type StockSymbol } from '@/types/stock';
import { isValidISIN } from '@/utils/rules';
import { ref, watch } from 'vue';

const props = defineProps({
    share: {
        type: Object as () => Omit<StockSymbol, 'id'>,
        required: true,
    },
});

const emit = defineEmits(['save', 'close']);

const shareCopy = ref({ ...props.share });
const $errors = ref<Partial<Record<keyof StockSymbol, string>>>({});

const securityTypeLabels: Record<SecurityType, string> = {
    STOCK: 'Stock',
    ETP: 'Exchange-Traded Product',
    INDEX: 'Index',
    GDR: 'Global Depository Receipt',
    CRYPTO: 'Cryptocurrency',
    BOND: 'Bond',
};

const marketSectorLabels: Record<MarketSector, string> = {
    COMMODITY: 'Commodity',
    CORPORATE: 'Corporate',
    CURRENCY: 'Currency',
    EQUITY: 'Equity',
    GOVERNMENT: 'Government',
    INDEX: 'Index',
    MONEY_MARKET: 'Money Market',
    MORTGAGE: 'Mortgage',
    MUNICIPAL: 'Municipal',
    PREFERRED: 'Preferred',
};

watch(
    () => props.share,
    (newVal) => (shareCopy.value = { ...newVal })
);

function save() {
    $errors.value = {};
    if (!shareCopy.value.ticker) $errors.value.ticker = 'Ticker is required.';
    if (!shareCopy.value.name) $errors.value.name = 'Name is required.';
    if (!shareCopy.value.security_type) $errors.value.security_type = 'Security type is required.';
    if (shareCopy.value.isin && !isValidISIN(shareCopy.value.isin)) $errors.value.isin = 'Invalid ISIN format.';

    if (Object.keys($errors.value).length > 0) return;
    shareCopy.value.ticker = shareCopy.value.ticker.toUpperCase().trim();
    emit('save', shareCopy.value);
}

function reset() {
    shareCopy.value = { ...props.share };
    $errors.value = {};
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
