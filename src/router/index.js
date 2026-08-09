import { createRouter, createWebHistory } from 'vue-router'
import PayPage from '../views/PayPage.vue'

const invalidProps = { orderNo: '', invalidPath: true }

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: PayPage, props: invalidProps },
    { path: '/:orderNo', name: 'pay', component: PayPage, props: true },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: PayPage,
      props: invalidProps,
    },
  ],
})

export default router
