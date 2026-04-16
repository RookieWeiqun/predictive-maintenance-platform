<!--
 * SPDX-FileCopyrightText: 2024 Siemens AG
 *
 * SPDX-License-Identifier: MIT
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 -->
<template>
  <div slot="logo">
    <img :src="logoUrl" alt="Siemens Logo" width="77" height="32" />
  </div>
</template>

<script setup lang="ts">
import logoUrl from '../../image/siemens logo.svg';
</script>
