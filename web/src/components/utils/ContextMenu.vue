<template>
    <div
        v-if="visible"
        ref="menuRef"
        :style="{ top: position.top + 'px', left: position.left + 'px' }"
        class="fixed z-50 bg-gray-900 text-white shadow-lg rounded-lg p-2 w-50 border border-gray-700"
        @click.stop
    >
        <slot />
    </div>
</template>

<script lang="ts" setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';

const props = defineProps<{ visible: boolean; x: number; y: number }>();

const emit = defineEmits(['close']);

const menuRef = ref<HTMLElement | null>(null);
const position = ref({ top: 0, left: 0 });

function handleClickOutside(event: MouseEvent) {
    if (props.visible && menuRef.value && !menuRef.value.contains(event.target as HTMLElement)) {
        emit('close');
    }
}

function adjustPosition() {
    if (!menuRef.value) return;

    const menuRect = menuRef.value.getBoundingClientRect();
    const maxX = window.innerWidth - menuRect.width - 8; // padding from edge
    const maxY = window.innerHeight - menuRect.height - 8;

    position.value.left = Math.min(props.x, maxX);
    position.value.top = Math.min(props.y, maxY);
}

watch(
    () => props.visible,
    async (val) => {
        if (val) {
            await nextTick();
            adjustPosition();
        }
    }
);

onMounted(() => {
    document.addEventListener('pointerdown', handleClickOutside);
});

onBeforeUnmount(() => {
    document.removeEventListener('pointerdown', handleClickOutside);
});
</script>
