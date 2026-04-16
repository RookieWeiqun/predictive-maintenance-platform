## 部署说明

部署相关的 Docker Compose 文件已经统一放到 `../deploy` 目录，方便直接在部署目录里执行。

### 文件说明

- `../deploy/docker-compose.postgres.yml`：PostgreSQL 编排文件
- `../deploy/docker-compose.backend.yml`：后端服务编排文件
- `initdb/01-init-role.sql`：数据库首次初始化时自动执行的 SQL

### 启动方式

先启动 PostgreSQL：

```bash
cd deploy
docker compose -f docker-compose.postgres.yml up -d
```

再启动后端：

```bash
cd deploy
docker compose -f docker-compose.backend.yml up -d --build
```

### PostgreSQL 连接信息

- 服务器地址：你的 Linux 测试服务器 IP
- 宿主机端口：`54321`
- 容器内端口：`5432`
- 数据库名：`PredictiveMaintenancePlatform`
- 用户名：`PredictiveMaintenance`
- 密码：`PsmDig@2026`

### initdb 脚本是否会自动执行

会自动执行，但有一个前提：

只有在 PostgreSQL 数据目录是第一次初始化时，`./initdb` 目录下的脚本才会被自动执行。

也就是说：

- 第一次 `docker compose up -d` 时会自动执行
- 如果数据卷已经存在，后续再次启动不会重复执行

当前的 `01-init-role.sql` 会做这些事：

- 给 `PredictiveMaintenance` 用户增加 `CREATEDB` 权限
- 把 `PredictiveMaintenancePlatform` 数据库所有者设为这个用户
- 把 `public` schema 的所有权和权限也给这个用户

这样你和同事用这个账号连接后，可以直接建表；如果需要，也可以新建别的数据库。

### 如果你想重新执行初始化脚本

如果只是普通重启，不需要删卷：

```bash
cd deploy
docker compose -f docker-compose.postgres.yml down
docker compose -f docker-compose.postgres.yml up -d
```

如果你明确要重新初始化数据库并重新执行 `initdb` 脚本，需要删除数据卷：

```bash
cd deploy
docker compose -f docker-compose.postgres.yml down -v
docker compose -f docker-compose.postgres.yml up -d
```

注意：`down -v` 会清空数据库已有数据，只适合测试环境。

### 给同事的连接说明

同事如果使用 Navicat、DBeaver、DataGrip、psql 或应用程序连接，请使用下面参数：

- Host：你的 Linux 测试服务器 IP
- Port：`54321`
- Database：`PredictiveMaintenancePlatform`
- Username：`PredictiveMaintenance`
- Password：`PsmDig@2026`

### 停止服务

```bash
cd deploy
docker compose -f docker-compose.postgres.yml down
```
