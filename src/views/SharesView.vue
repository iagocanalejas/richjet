<template>
	<main class="justify-center min-h-[calc(100vh-72px)] bg-gray-900 text-white p-6">
		<div class="flex flex-col justify-center items-center w-full max-w-2xl mx-auto">
			<SearchComponent @on-search="debouncedFilterResults" />
		</div>
		<div class="flex flex-col justify-center items-center w-full max-w-2xl mx-auto">
			<ListComponent :values="filteredResults" />
		</div>
	</main>
</template>

<script setup lang="ts">
import SearchComponent from "@/components/SearchComponent.vue";
import ListComponent from "@/components/ListComponent.vue";
import { ref, type Ref } from "vue";
import { useFinnhubStore } from "@/stores/finnhub";
import type { FinnhubStockSymbolForDisplay } from "@/types/finnhub";
import { debounce } from "@/types/utils";

const finnhubStore = useFinnhubStore();

const filteredResults: Ref<FinnhubStockSymbolForDisplay[]> = ref([]);

const debouncedFilterResults = debounce(_filterResults);
async function _filterResults(query: string) {
	if (!query) {
		filteredResults.value = [];
		return;
	}
	const results = (await finnhubStore.symbolSearch(query.toUpperCase())) as FinnhubStockSymbolForDisplay[];
	if (results) {
		filteredResults.value = results.filter((s) => !s.symbol.includes("."));
	}
}

// TODO: check a better way to load initial data
// onBeforeMount(async () => {
// 	const results = (await finnhubStore.symbolSearch("")) as FinnhubStockSymbolForDisplay[];
// 	if (results) {
// 		filteredResults.value = results.filter((s) => !s.symbol.includes("."));
// 	}
// });
</script>
