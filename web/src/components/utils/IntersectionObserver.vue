<template>
    <div ref="root" />
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, type Ref } from 'vue';

const props = defineProps({
    options: {
        type: Object,
        default: () => {},
    },
});
const emit = defineEmits(['intersect']);

const root: Ref<Element | null> = ref(null);
const observer: Ref<IntersectionObserver | null> = ref(null);

onMounted(() => {
    observer.value = new IntersectionObserver(([entry]) => {
        if (entry && entry.isIntersecting) {
            emit('intersect');
        }
    }, props.options);
    observer.value.observe(root.value!);
});

onUnmounted(() => {
    observer.value?.disconnect();
});
</script>
