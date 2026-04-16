<!--
 * SPDX-FileCopyrightText: 2024 Siemens AG
 *
 * SPDX-License-Identifier: MIT
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 -->
<template>
  <div>
    <IxContentHeader header-title="Welcome" >
      <IxButton variant="tertiary">Test Button</IxButton>
    </IxContentHeader>
    <section class="home-section">
      <div class="home-content">
        <h2>Welcome</h2>
        <p>Welcome to the Siemens Industrial Experience starter template!</p>
        <p>you can add your own content here</p>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { IxContentHeader } from "@siemens/ix-vue";
</script>

<style scoped>
.home-section {
  padding: 1rem;
}

.home-content {
  max-width: 1200px;
  margin: 0 auto;
}
</style>
