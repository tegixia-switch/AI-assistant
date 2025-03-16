<template>
  <el-config-provider>
    <el-container class="app-container">
      <el-header>
        <el-menu
          :router="true"
          mode="horizontal"
          :ellipsis="false"
          class="nav-menu"
        >
          <div class="logo">
            <img src="@/assets/logo.svg" alt="Logo" class="logo-img" />
            <span class="logo-text">AI Help System</span>
          </div>
          <el-menu-item index="/">
            <el-icon><ChatRound /></el-icon>
            AI 问答助手
          </el-menu-item>
          <el-menu-item index="/fse">
            <el-icon><Document /></el-icon>
            FSE 工单处理
          </el-menu-item>
        </el-menu>
      </el-header>

      <el-main>
        <router-view />
      </el-main>
    </el-container>
  </el-config-provider>
</template>

<script setup lang="ts">
import { ChatRound, Document } from '@element-plus/icons-vue'
</script>

<style>
html, body {
  margin: 0;
  padding: 0;
  height: 100%;
  background-color: #f7f7f8;
}

#app {
  height: 100%;
}

.app-container {
  min-height: 100%;
}

.el-header {
  padding: 0;
  background-color: #ffffff;
  border-bottom: 1px solid #e5e5e5;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.nav-menu {
  height: 60px;
  padding: 0 20px;
  display: flex;
  align-items: center;
  border-bottom: none;
}

.logo {
  display: flex;
  align-items: center;
  margin-right: 40px;
  font-size: 18px;
  font-weight: 600;
}

.logo-img {
  height: 32px;
  margin-right: 10px;
}

.logo-text {
  background: linear-gradient(90deg, #10a37f 0%, #2563eb 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.el-menu-item {
  font-size: 15px;
  height: 60px;
  line-height: 60px;
}

.el-menu-item .el-icon {
  font-size: 18px;
  margin-right: 6px;
}

.el-main {
  padding: 20px;
  height: calc(100vh - 60px);
}

:root {
  --el-color-primary: #10a37f;
}
</style> 