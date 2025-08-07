<template>
    <div v-if="accounts.length" class="relative inline-block text-center text-white">
        <button
            @click="isDropdownOpen = !isDropdownOpen"
            class="inline-flex items-center justify-between bg-gray-800 px-4 py-2 rounded-md hover:bg-gray-700"
        >
            {{ selected?.name || 'All' }} ({{ accounts.length }} / {{ normalizeLimit(maxAccounts) }})
            <svg class="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
        </button>

        <div
            v-if="isDropdownOpen"
            class="absolute right-0 z-50 mt-2 w-56 bg-gray-800 text-white rounded-lg shadow-lg ring-1 ring-white/10"
        >
            <div @click="select()" class="flex items-center justify-between px-4 py-2 hover:bg-gray-700 cursor-pointer">
                All
            </div>

            <div class="border-t border-gray-600"></div>

            <div
                v-for="account in accounts"
                :key="account.name"
                class="group flex items-center justify-between px-4 py-2 hover:bg-gray-700"
            >
                <span @click="select(account)" class="cursor-pointer truncate">
                    {{ account.name }}
                </span>

                <button
                    @click.stop="deleteAccount(account)"
                    class="p-1 rounded hover:bg-red-600 transition group-hover:opacity-100 opacity-70"
                    title="Delete"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="w-4 h-4 text-white"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                    >
                        <path stroke-linecap="round" stroke-linejoin="round" d="M6 6L18 18M6 18L18 6" />
                    </svg>
                </button>
            </div>

            <div
                v-if="maxAccounts === 'Infinity' || accounts.length < Number(maxAccounts)"
                class="border-t border-gray-600"
            ></div>

            <div
                v-if="maxAccounts === 'Infinity' || accounts.length < Number(maxAccounts)"
                class="px-4 py-2 text-blue-400 hover:bg-gray-700 hover:text-blue-300 cursor-pointer"
                @click="isAccountModalOpen = true"
            >
                Add Account
            </div>
        </div>
    </div>

    <button
        v-else
        @click="isAccountModalOpen = true"
        class="px-3 py-2 rounded-lg transition duration-200 bg-gray-800 text-white hover:bg-gray-700 hover:text-gray-300 border border-gray-700"
    >
        Add account
    </button>

    <AccountModal
        v-if="isAccountModalOpen"
        :accounts="accounts"
        @save="addAccount"
        @close="isAccountModalOpen = false"
    />

    <ConfirmationModal ref="confirmationModal" :show-reconfirmation="true" @confirm="deleteAccount" />
</template>

<script setup lang="ts">
import type { Account } from '@/types/user';
import { ref, type PropType } from 'vue';
import AccountModal from '../modals/AccountModal.vue';
import ConfirmationModal from '../modals/ConfirmationModal.vue';
import { normalizeLimit } from '@/utils/utils';

defineProps({
    accounts: { type: Array as PropType<Account[]>, default: () => [] },
    selected: { type: Object as PropType<Account | undefined>, default: undefined },
    maxAccounts: { type: [Number, String], required: true },
});

const emit = defineEmits(['select', 'add', 'delete']);

const isDropdownOpen = ref(false);
const isAccountModalOpen = ref(false);
const confirmationModal = ref<InstanceType<typeof ConfirmationModal> | null>(null);

function select(item?: Account) {
    emit('select', item);
    isDropdownOpen.value = false;
}

function deleteAccount(account: Account, confirmed = false) {
    if (!confirmed) {
        confirmationModal.value?.show(
            'Delete Account',
            `Are you sure you want to delete the account "${account.name}" and all the data in it?`,
            [account, true]
        );
        return;
    }
    emit('delete', account);
    isDropdownOpen.value = false;
}

function addAccount(account: Omit<Account, 'id' | 'user_id'>) {
    emit('add', account);
    isDropdownOpen.value = false;
    isAccountModalOpen.value = false;
}
</script>
