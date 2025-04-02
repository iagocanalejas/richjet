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
            // route level code-splitting
            // this generates a separate chunk (About.[hash].js) for this route
            // which is lazy-loaded when the route is visited.
            component: () => import("./views/AboutView.vue"),
        },
        {
            path: "/indexes",
            name: "indexes",
            // route level code-splitting
            // this generates a separate chunk (About.[hash].js) for this route
            // which is lazy-loaded when the route is visited.
            component: () => import("./views/AboutView.vue"),
        },
    ],
});

export default router;
