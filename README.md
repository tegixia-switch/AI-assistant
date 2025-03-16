# AI Help System

一个基于 Vue 3 + TypeScript 的 AI 用户帮助系统，包含普通用户问答和 FSE 工单处理功能。

## 功能特点

### 普通用户问答
- AI 智能问答
- 答案点赞/踩
- 复制/编辑答案
- 历史记录查看
- 模型选择

### FSE 工单处理
- 工单信息获取
- 问题类型修改
- 修复引导生成
- 工单报告生成
- 工单平台同步

## 技术栈

- Vue 3
- TypeScript
- Element Plus
- Pinia
- Vue Router
- Vite

## 开始使用

1. 安装依赖：
```bash
npm install
```

2. 配置环境变量：
复制 `.env.example` 到 `.env` 并填写必要的配置信息：
- VITE_API_BASE_URL：API 基础地址
- VITE_AI_API_KEY：AI API 密钥

3. 启动开发服务器：
```bash
npm run dev
```

4. 构建生产版本：
```bash
npm run build
```

## 项目结构

```
src/
├── api/        # API 接口
├── components/ # 通用组件
├── stores/     # 状态管理
├── types/      # TypeScript 类型定义
├── views/      # 页面视图
└── router/     # 路由配置
```

## 注意事项

- 使用前请确保已配置正确的 API 密钥
- FSE 工单处理功能需要相应的后端服务支持
- 建议使用 Node.js 16+ 版本 