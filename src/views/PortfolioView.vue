<template>
	<main class="justify-center min-h-[calc(100vh-72px)] bg-gray-900 text-white p-6">
		<div class="flex flex-col justify-center items-center w-full max-w-2xl mx-auto">
			<!-- TODO: totals -->
		</div>
		<div class="flex flex-col justify-center items-center w-full max-w-2xl mx-auto">
			<PortfolioListComponent :values="portfolio" />
		</div>
	</main>
</template>

<script setup lang="ts">
import PortfolioListComponent from "@/components/PortfolioListComponent.vue";
import { usePortfolioStore } from "@/stores/portfolio";
import { storeToRefs } from "pinia";

const { portfolio } = storeToRefs(usePortfolioStore());
</script>
