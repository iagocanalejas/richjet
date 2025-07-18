<template>
    <main class="justify-center min-h-[calc(100vh-144px)] bg-gray-900 text-white p-6">
        <div v-if="!settings.subscription" class="max-w-6xl mx-auto mt-10 p-6">
            <h1 class="text-4xl font-bold mb-10 text-center">Manage Your Subscription</h1>

            <div class="flex justify-center mb-8">
                <button
                    class="px-4 py-2 rounded-l-lg"
                    :class="[billingPeriod === 'month' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300']"
                    @click="billingPeriod = 'month'"
                >
                    Monthly
                </button>
                <button
                    class="px-4 py-2 rounded-r-lg"
                    :class="[billingPeriod === 'year' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300']"
                    @click="billingPeriod = 'year'"
                >
                    Annual
                </button>
            </div>

            <div class="grid gap-8 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                <div
                    v-for="plan in prices"
                    :key="plan.id"
                    class="flex flex-col rounded-2xl border border-gray-700 bg-gradient-to-b from-gray-800 via-gray-850 to-gray-900 p-6 shadow-2xl hover:shadow-blue-500/20 transition-all duration-300 h-full"
                >
                    <h2 class="text-2xl font-semibold mb-4 text-center tracking-wide text-blue-400">
                        {{ plan.product.name }}
                    </h2>
                    <div class="flex-1 flex items-center justify-center mb-6">
                        <template v-if="isLite(plan.product.name)">
                            <span>For simple tracking of small portfolios.</span>
                            <ul class="space-y-2 text-sm text-gray-300 list-disc list-inside mt-3">
                                <li>Single account.</li>
                                <li>Track up to 50 stocks.</li>
                            </ul>
                        </template>
                        <template v-else-if="isPro(plan.product.name)">
                            <span>For advanced users that really want to track their portfolios and savings.</span>
                            <ul class="space-y-2 text-sm text-gray-300 list-disc list-inside mt-3">
                                <li>Organice in up to 5 accounts.</li>
                                <li>Track up to 100 stocks.</li>
                            </ul>
                        </template>
                        <template v-else-if="isMax(plan.product.name)">
                            <span>For power users that want to track everything.</span>
                            <ul class="space-y-2 text-sm text-gray-300 list-disc list-inside mt-3">
                                <li>Organice in unlimited accounts.</li>
                                <li>Track unlimited stocks.</li>
                            </ul>
                        </template>
                    </div>
                    <div class="mt-auto text-center">
                        <p class="text-3xl font-bold text-white mb-4">
                            {{ formatCurrency(plan.unit_amount / 100, plan.currency) }}
                            {{ billingPeriod === 'month' ? '/mo' : '/yr' }}
                        </p>
                        <button
                            class="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-xl shadow-md transition duration-200"
                            @click="selectPlan(plan)"
                        >
                            Choose Plan
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <div v-else-if="plan" class="max-w-3xl mx-auto mt-10 text-center space-y-6">
            <h1 class="text-4xl font-bold mb-6">Your Current Subscription</h1>

            <p class="text-lg text-gray-300">
                You are currently subscribed to the <strong class="text-blue-400">{{ plan.product.name }}</strong> plan.
            </p>

            <p v-if="!settings.subscription.cancel_at_period_end" class="text-lg text-gray-300">
                Next billing date:
                <strong class="text-white">
                    {{ formatDate(settings.subscription.items.data[0].current_period_end) }}
                </strong>
            </p>
            <p v-else class="text-lg text-gray-300">
                Your subscription will end on
                <strong class="text-white">
                    {{ formatDate(settings.subscription.items.data[0].current_period_end) }}.
                </strong>
                <br />
                You can still use your plan until then.
            </p>

            <div class="text-left w-1/2 mx-auto">
                <div class="flex flex-col h-full rounded-2xl border border-gray-700 from-gray-800 p-6 shadow-2xl">
                    <h2 class="text-xl font-semibold text-blue-400 mb-4 text-center">Your Plan</h2>

                    <template v-if="isLite(plan.product.name)">
                        <span>Ideal for tracking small portfolios with minimal overhead.</span>
                        <ul class="mt-3 space-y-2 text-sm text-gray-300 list-disc list-inside">
                            <li>Single account.</li>
                            <li>Track up to 50 stocks.</li>
                        </ul>
                    </template>

                    <template v-else-if="isPro(plan.product.name)">
                        <span>Great for advanced users managing multiple portfolios and savings.</span>
                        <ul class="mt-3 space-y-2 text-sm text-gray-300 list-disc list-inside">
                            <li>Organize into up to 5 accounts.</li>
                            <li>Track up to 100 stocks.</li>
                        </ul>
                    </template>

                    <template v-else-if="isMax(plan.product.name)">
                        <span>Perfect for power users with extensive tracking needs.</span>
                        <ul class="mt-3 space-y-2 text-sm text-gray-300 list-disc list-inside">
                            <li>Organize into unlimited accounts.</li>
                            <li>Track unlimited stocks.</li>
                        </ul>
                    </template>
                </div>
            </div>

            <div class="pt-2">
                <button
                    v-if="!settings.subscription.cancel_at_period_end"
                    class="bg-red-500 hover:bg-red-600 text-white font-semibold py-2.5 px-6 rounded-xl shadow-md transition duration-200"
                    @click="updateSubscriptionStatus(true)"
                >
                    Cancel Subscription
                </button>
                <button
                    v-else
                    class="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2.5 px-6 rounded-xl shadow-md transition duration-200"
                    @click="updateSubscriptionStatus(false)"
                >
                    Keep Subscription
                </button>
            </div>
        </div>
    </main>
</template>

<script setup lang="ts">
import { useSettingsStore } from '@/stores/settings';
import { storeToRefs } from 'pinia';
import type { SubscriptionPlan } from '@/types/user';
import { formatCurrency, formatDate } from '@/utils/utils';
import { onMounted, computed } from 'vue';
import { ref } from 'vue';
import { isLite, isPro, isMax } from '@/utils/rules';

const settingsStore = useSettingsStore();
const { subscription_plans, settings } = storeToRefs(settingsStore);

const billingPeriod = ref<'month' | 'year'>('month');
const prices = computed(() => {
    return subscription_plans.value
        .filter((plan) => plan.recurring.interval === billingPeriod.value)
        .sort((a, b) => a.unit_amount - b.unit_amount);
});
const plan = computed(() => settings.value?.subscription?.plan);

async function selectPlan(plan: SubscriptionPlan) {
    await settingsStore.subscribe(plan);
}

async function updateSubscriptionStatus(cancelAtPeriodEnd: boolean) {
    await settingsStore.updateSubscriptionStatus(cancelAtPeriodEnd);
}

onMounted(async () => await settingsStore.loadPlans());
</script>
