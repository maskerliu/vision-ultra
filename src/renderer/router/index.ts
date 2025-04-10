import { createRouter, createWebHashHistory } from 'vue-router'

export default createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      redirect: '/visionHome'
    },
    {
      path: '/visionHome',
      name: 'VisionHome',
      component: require('../pages/vision/VisionHome.vue').default
    },
    {
      path: '/audioHome',
      name: 'AudioHome',
      component: require('../pages/audio/AudioHome.vue').default
    },
    {
      path: '/settings',
      name: 'Settings',
      component: require('../pages/settings/Settings.vue').default
    }
  ],
})
