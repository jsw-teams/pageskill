# 更新日志

## 1.0.0-beta.0 — 2026-09-16

- 将公开版本线回退为首个 1.0.0 beta，并删除历史版本说明包。
- Core 统一为纯静态：生成、预览与无障碍报告都不依赖 Runtime Adapter。
- 用 `ComponentDefinition.client` 驱动的单一 Client Runtime 替代分散脚本与手工 client mode；DOM/静态资源无需 API 声明，外部工作只增加命名 `client.api`。
- 增加命名 `config.apis`：允许第三方 HTTP(S) URL、Bearer 或 `x-api-key` 客户端鉴权，并按 id 绑定 Component 与 API。
- 数据库、第三方模型、私密凭据和写逻辑只存在于独立部署的 API；配置中的浏览器 Token 明确属于公开客户端数据。
- 本地 Search 只读取生成索引；可信第三方 Provider Adapter 必须配合同意政策，并在每个本地化隐私页中精确确认。
- 新增源码管理的 Agent Skill 开发者规范，并按当前真实能力重新生成发现信息，不再发布示例端点。
- 重建自动无障碍 PDF，提供可读 A4 排版、真实 Client/API 边界、响应式证据和对应功能细节图。
- 删除旧 deployment/runtime 配置、backend 构建耦合、Demo 内容、历史扩展术语和兼容层。
