<template>
	<div v-if="isLoading" class="fixed top-0 left-0 w-full h-1 bg-blue-500 animate-pulse z-50"></div>
</template>

<script setup lang="ts">
import { useLoadingStore } from '@/stores/loading';
import { storeToRefs } from 'pinia';

const { isLoading } = storeToRefs(useLoadingStore());
</script>
