import { createRouter, createWebHistory } from "vue-router";
import PortfolioView from "./views/PortfolioView.vue";

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
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
            path: "/indexes",
            name: "indexes",
            component: () => import("./views/PortfolioView.vue"),
        },
    ],
});

export default router;
