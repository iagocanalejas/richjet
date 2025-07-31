<template>
    <div
        v-if="visible"
        ref="menuRef"
        :style="{ top: y + 'px', left: x + 'px' }"
        class="absolute z-50 bg-gray-900 text-white shadow-lg rounded-lg p-2 w-50 border border-gray-700"
        @click.stop
    >
        <slot />
    </div>
</template>

<script lang="ts" setup>
import { onBeforeUnmount, onMounted, ref } from 'vue';

const props = defineProps<{
    visible: boolean;
    x: number;
    y: number;
}>();

const emit = defineEmits(['close']);

const menuRef = ref<HTMLElement | null>(null);

function handleClickOutside(event: MouseEvent) {
    if (props.visible && menuRef.value && !menuRef.value.contains(event.target as HTMLElement)) {
        emit('close');
    }
}

onMounted(() => {
    document.addEventListener('click', handleClickOutside);
});

onBeforeUnmount(() => {
    document.removeEventListener('click', handleClickOutside);
});
</script>
