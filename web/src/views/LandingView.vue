<template>
    <main class="justify-center min-h-[calc(100vh-144px)] bg-gray-800 text-white border-t border-gray-900">
        <section class="text-center py-20 bg-gray-900 shadow-md">
            <h1 class="text-4xl font-bold mb-4">Track Your Investments with RichJet, Effortlessly.</h1>
            <p class="text-lg mb-6 text-gray-300">Stay on top of your stocks, crypto, and assets — all in one place.</p>
            <button
                @click.stop="emit('sign-in')"
                class="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-500 transition"
            >
                Start Tracking with RichJet for Free
            </button>
        </section>

        <section class="py-16 px-6 max-w-5xl mx-auto">
            <div class="grid md:grid-cols-2 gap-10">
                <div>
                    <h2 class="text-2xl font-semibold mb-4">🔍 Unified Portfolio View</h2>
                    <p class="text-gray-300">
                        See all your investments—stocks, crypto, ETFs, and more—in RichJet clean dashboard.
                    </p>
                </div>
                <div>
                    <h2 class="text-2xl font-semibold mb-4">📊 Real-Time Performance</h2>
                    <p class="text-gray-300">
                        Track your gains, losses, and overall performance with market data and automatic updates.
                    </p>
                </div>
                <div>
                    <h2 class="text-2xl font-semibold mb-4">⚖️ Smart Allocation Insights</h2>
                    <p class="text-gray-300">
                        Get a clear breakdown of asset allocation by category, risk, sector, or custom tags.
                    </p>
                </div>
                <div>
                    <h2 class="text-2xl font-semibold mb-4">🔐 Secure & Private</h2>
                    <p class="text-gray-300">
                        Your data stays yours. Data is saved in your google account and never shared with us.
                    </p>
                </div>
            </div>
        </section>

        <section class="bg-gray-900 py-16 px-6">
            <div class="max-w-3xl mx-auto text-center">
                <h2 class="text-3xl font-bold mb-10">How RichJet Works</h2>
                <ol class="space-y-6 text-left text-gray-300">
                    <li>
                        <strong class="text-white"> 1.Connect or Add Assets:</strong>
                        Manually input your holdings.
                    </li>
                    <li>
                        <strong class="text-white">2. Track in Real-Time:</strong>
                        Monitor performance with intuitive charts and up-to-date data.
                    </li>
                    <li>
                        <strong class="text-white">3. Make Smarter Moves:</strong>
                        Use insights to rebalance, diversify, or identify growth opportunities.
                    </li>
                </ol>
            </div>
        </section>

        <section class="bg-blue-700 text-white text-center py-16 px-6">
            <h2 class="text-3xl font-bold mb-4">Take Control of Your Financial Future.</h2>
            <p class="mb-6">
                Join thousands of investors using RichJet's portfolio tracker to stay organized and ahead.
            </p>
            <button
                @click.stop="emit('sign-in')"
                class="bg-white text-blue-700 font-semibold px-6 py-3 rounded-md hover:bg-gray-200 transition"
            >
                Start Now with RichJet — It’s Free
            </button>
        </section>
    </main>
</template>

<script setup lang="ts">
const emit = defineEmits(['sign-in']);
</script>
