<template>
    <div v-if="isLogged && accounts.length" class="relative inline-block text-center text-white">
        <button
            @click="isDropdownOpen = !isDropdownOpen"
            class="inline-flex items-center justify-between bg-gray-800 px-4 py-2 rounded-md hover:bg-gray-700"
        >
            {{ selected?.name || 'All' }}
            <svg class="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
        </button>

        <div
            v-if="isDropdownOpen"
            class="absolute right-0 z-50 mt-2 w-48 bg-gray-800 text-white rounded-md shadow-lg ring-1 ring-white/10"
        >
            <div @click="select()" class="px-4 py-2 hover:bg-gray-700 cursor-pointer">All</div>

            <div class="border-t border-gray-600"></div>

            <div
                v-for="account in accounts"
                :key="account.name"
                class="px-4 py-2 hover:bg-gray-700 cursor-pointer"
                @click="select(account)"
            >
                {{ account.name }}
            </div>

            <div class="border-t border-gray-600"></div>

            <div class="px-4 py-2 text-blue-400 hover:bg-gray-700 cursor-pointer" @click="isAccountModalOpen = true">
                Add Account
            </div>
        </div>
    </div>

    <button
        v-else-if="isLogged"
        @click="isAccountModalOpen = true"
        class="px-3 py-2 rounded-lg transition duration-200 bg-gray-800 text-white hover:bg-gray-700 hover:text-gray-300 border border-gray-700 cursor-pointer"
    >
        Add account
    </button>

    <AccountModal
        v-if="isAccountModalOpen"
        :accounts="accounts"
        @save="addAccount"
        @close="isAccountModalOpen = false"
    />
</template>

<script setup lang="ts">
import type { Account } from '@/types/user';
import { ref } from 'vue';
import AccountModal from '../modals/AccountModal.vue';

defineProps({
    isLogged: { type: Boolean, default: false },
    accounts: { type: Array as () => Account[], default: () => [] },
    selected: { type: Object as () => Account | undefined, default: undefined },
});

const emit = defineEmits(['select', 'add']);

const isDropdownOpen = ref(false);
const isAccountModalOpen = ref(false);

function select(item?: Account) {
    emit('select', item);
    isDropdownOpen.value = false;
}

function addAccount(account: Omit<Account, 'id' | 'user_id'>) {
    emit('add', account);
    isDropdownOpen.value = false;
    isAccountModalOpen.value = false;
}
</script>
