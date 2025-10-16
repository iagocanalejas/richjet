<template>
    <div v-if="isVisible" class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center">
        <div class="w-full max-w-md bg-gray-900 text-white rounded-2xl shadow-2xl p-6 space-y-3 animate-fadeIn">
            <div class="text-center space-y-1">
                <h2 class="text-xl font-bold tracking-wide" :class="[titleColorClass]">{{ internalTitle }}</h2>
                <p v-if="internalMessage" class="text-sm text-gray-300">{{ internalMessage }}</p>
            </div>

            <div class="flex justify-end gap-3 pt-3">
                <button
                    @click="cancel"
                    class="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-md transition"
                >
                    Cancel
                </button>
                <button
                    @click="confirm"
                    class="px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm rounded-md transition font-semibold"
                >
                    Confirm
                </button>
            </div>
        </div>
    </div>

    <div
        v-if="isShowingReconfirmationModal"
        class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center px-3"
    >
        <div class="w-full max-w-md bg-gray-900 text-white rounded-2xl shadow-2xl p-6 space-y-6 animate-fadeIn">
            <div class="text-center space-y-1">
                <h2 class="text-xl font-bold tracking-wide text-red-400">Are you sure you want to do it?</h2>
                <p class="text-sm text-gray-300">This action cannot be undone.</p>
            </div>

            <div class="flex justify-end gap-3 pt-4">
                <button
                    @click="cancel"
                    class="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-md transition"
                >
                    Cancel
                </button>
                <button
                    @click="reconfirm"
                    class="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm rounded-md transition font-semibold"
                >
                    Yes, Confirm
                </button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps({ showReconfirmation: { type: Boolean, default: false } });

const emit = defineEmits(['confirm', 'cancel']);
defineExpose({ show });

const isVisible = ref(false);
const internalTitle = ref('');
const internalMessage = ref();
const titleColorClass = ref('text-green-400');
const isShowingReconfirmationModal = ref(false);
const _confirmationArgs = ref<unknown[]>([]);

type SUPPORTED_STYLES = 'success' | 'warning' | 'error';

function show(title: string, message?: string, confirmationArgs?: unknown[], style: SUPPORTED_STYLES = 'success') {
    internalTitle.value = title;
    internalMessage.value = message;
    switch (style) {
        case 'success':
            titleColorClass.value = 'text-green-400';
            break;
        case 'warning':
            titleColorClass.value = 'text-yellow-400';
            break;
        case 'error':
            titleColorClass.value = 'text-red-400';
            break;
        default:
            titleColorClass.value = 'text-green-400';
    }
    isShowingReconfirmationModal.value = false;
    _confirmationArgs.value = confirmationArgs || [];
    isVisible.value = true;
}

function confirm() {
    if (props.showReconfirmation) {
        isShowingReconfirmationModal.value = true;
        return;
    }
    isVisible.value = false;
    emit('confirm', ..._confirmationArgs.value);
}

function reconfirm() {
    isShowingReconfirmationModal.value = false;
    isVisible.value = false;
    emit('confirm', ..._confirmationArgs.value);
}

function cancel() {
    isShowingReconfirmationModal.value = false;
    isVisible.value = false;
    emit('cancel');
}
</script>
