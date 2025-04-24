import { createRouter, createWebHistory } from "vue-router";
import PortfolioView from "./views/PortfolioView.vue";

const router = createRouter({
	history: createWebHistory(import.meta.env.VITE_VUE_BASE_URL),
	routes: [
		{
			path: "/",
			name: "portfolio",
			component: PortfolioView,
		},
		{
			path: "/shares",
			name: "shares",
			component: () => import("./views/SharesView.vue"),
		},
		{
			path: "/transactions",
			name: "transactions",
			component: () => import("./views/TransactionsView.vue"),
		},
		{
			path: "/privacy-policy",
			name: "privacy-policy",
			component: () => import("./views/legal/PrivacyPolicyView.vue"),
		},
		{
			path: "/conditions",
			name: "conditions",
			component: () => import("./views/legal/ConditionsView.vue"),
		},
	],
});

export default router;
