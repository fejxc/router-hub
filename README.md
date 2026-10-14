# Router Hub

一个**不需要后端**的多地点路由器导航管理页面。适用于 OpenWrt、Padavan（老毛子）、TP-Link 等所有能通过浏览器打开管理后台的设备。

## 功能

- 按地区自动分组；地区侧栏、收藏和固件筛选；名称 / 地区 / 固件 / 地址 / 备注搜索
- 添加、编辑、删除路由器；支持暂未确定管理地址的设备
- 点击「打开后台」在新标签页访问原路由器页面；**不会**代替原设备的登录
- 浅色 / 深色模式、手机和电脑自适应
- 纯浏览器 `localStorage` 保存；JSON 导入 / 导出（导入时合并设备）
- GitHub Actions 自动部署 GitHub Pages

## 本机打开（零部署）

双击 `index.html` 即可。页面不依赖 CDN / 外部 JS，也没有访问路由器的后台 API。浏览器需要能访问你填写的路由器地址，点击链接才会成功。

首次打开设备为空，请点击「添加设备」；如果你收到了单独提供的私有设备清单，点击「导入配置」并选择那个 JSON 文件。

> 本地文件 `file://` 打开时，大多数现代浏览器可以使用 `localStorage`，但具体持久性和隔离规则因浏览器而异。如果遇到保存失败，请部署到 GitHub Pages 使用固定域名，或用浏览器本地 HTTP 服务打开。定期导出备份。

## GitHub Pages 部署（无需自己的服务器）

1. 新建一个 **public** GitHub 仓库，推荐命名 `router-hub`。
2. 将**这个文件夹里的项目文件**（含 `.github/workflows/deploy.yml` 和 `assets/`）上传至仓库根目录的 `master` 分支。上传的是项目目录的**内容**，不能再多包一层 `router-hub/`。
3. 打开仓库 **Settings → Pages → Build and deployment → Source → GitHub Actions**。
4. `master` 分支每次推送时，Actions 将自动发布静态网站。第一次可以在 **Actions** 页查看 `Deploy Router Hub to GitHub Pages` 工作流。
5. 默认网址为 `https://fejxc.github.io/router-hub/`。
6. 使用这个网址打开网页，选择「添加设备」或「导入配置」。**请勿将私有设备 JSON 提交到公开仓库！**

官方说明：https://docs.github.com/en/get-started/start-your-journey/deploying-your-website-automatically

### 使用 `router.fejxc.top`（可选）

1. 在 GitHub **Settings → Pages → Custom domain** 中添加 `router.fejxc.top` 并保存。
2. 然后在域名的 DNS 服务商添加 CNAME：`router` → `fejxc.github.io`（**不带** `/router-hub`）。
3. 等待 DNS 生效，在 Pages 设置中启用 `Enforce HTTPS`。

> 使用 GitHub Actions 发布时不需要在项目里创建 `CNAME` 文件；官方说明：https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site

## 数据文件格式

```json
{
  "version": 1,
  "routers": [
    {
      "id": "demo-1",
      "name": "示例设备",
      "location": "示例地区",
      "type": "OpenWrt",
      "url": "http://router.example.invalid:8080",
      "note": "这是演示地址，请替换",
      "favorite": false
    }
  ]
}
```

`url` 支持 http/https，也可以留空；禁止包含用户名密码。导入时按 `id` 或相同的「名称 + 地区 + 地址」合并；导出文件包含真实地址，请勿公开分享。

## 隐私与安全

- 页面代码不含你的真实路由器网址、账号或密码；首次打开为空。**真正的管理地址保存在当前浏览器**，不提交 GitHub，也没有云同步。
- `localStorage` 不是加密保险箱。同一浏览器配置文件下的页面数据可能被使用此浏览器的人看到；请勿把密码写到备注或 URL。
- GitHub Pages 公开网站不是私人登录系统。不要直接把你的路由器地址写入公开仓库，也不要在 Pages 上存放备份文件。
- 如果仍通过公网直接暴露各路由器管理端口，建议限制来源 IP，使用高强度独立密码、固件安全更新；更安全的做法是使用 WireGuard / Tailscale 等私有网络。这个导航页面**不会**增加目标路由器的安全防护。
- 在 HTTPS GitHub Pages 页面点击 HTTP 路由器链接会离开加密连接，部分浏览器可能出现 HTTP 不安全提示；这是目标管理后台的 HTTPS 配置问题，并非本网页故障。
- 显示的统计仅是**设备数量、地区数量、收藏数量**，不是在线检测。无后台，无定时轮询，也没有设备流量监控。
- 不同浏览器 / 手机之间的 `localStorage` **不会自动同步**；需使用导出 / 导入迁移设备清单。

## 项目结构

```text
router-hub/
├── index.html
├── styles.css
├── app.js
├── assets/favicon.svg
├── .nojekyll
├── .gitignore
├── .github/workflows/deploy.yml
└── README.md
```

项目可直接静态托管，也可交给 Codex 继续开发。
