<template>
    <header class="flex items-center justify-between p-4 bg-gray-800 text-white shadow-md">
        <div class="flex items-center space-x-4">
            <img src="@/assets/logo.svg" alt="Logo" class="h-10 w-10" />
        </div>
        <nav class="flex space-x-4 ml-auto">
            <RouterLink
                to="/"
                class="px-3 py-2 rounded-lg transition duration-200 hover:bg-gray-700 hover:text-gray-300"
            >
                Portfolio
            </RouterLink>
            <RouterLink
                to="/shares"
                class="px-3 py-2 rounded-lg transition duration-200 hover:bg-gray-700 hover:text-gray-300"
            >
                Market Shares
            </RouterLink>
            <RouterLink
                to="/indexes"
                class="px-3 py-2 rounded-lg transition duration-200 hover:bg-gray-700 hover:text-gray-300"
            >
                Indexes
            </RouterLink>
        </nav>
    </header>
    <RouterView />
</template>

<script setup>
import { RouterLink, RouterView } from "vue-router";
</script>
