<!-- 维护方案调整页 -->
<template>
  <div>
    <IxContentHeader header-title="维护方案调整">
      <IxButton variant="primary">保存方案</IxButton>
    </IxContentHeader>
    <section class="page-section">
      <div class="page-content">
        <IxCard>
          <h2>方案调整</h2>
          <p>此页面将显示标准维护方案的树形结构，支持增删检测项目</p>
        </IxCard>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { IxContentHeader, IxButton, IxCard } from "@siemens/ix-vue";
</script>

<style scoped>
.page-section {
  padding: 1rem;
}

.page-content {
  max-width: 1200px;
  margin: 0 auto;
}
</style>
