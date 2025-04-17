<template>
	<div v-if="isLoading" class="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
		<div class="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
	</div>
</template>

<script setup lang="ts">
import { useLoadingStore } from '@/stores/loading';
import { storeToRefs } from 'pinia';

const { isLoading } = storeToRefs(useLoadingStore());
</script>
