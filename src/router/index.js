import { createRouter, createWebHistory } from 'vue-router'
import PayPage from '../views/PayPage.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: PayPage },
    {
      path: '/:pathMatch(.*)*',
      name: 'fallback',
      redirect: '/',
    },
  ],
})

export default router
